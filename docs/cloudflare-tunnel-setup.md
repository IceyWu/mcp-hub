# Cloudflare Tunnel 部署指南

## 问题背景

服务器位于国内（腾讯云），Cloudflare 海外边缘节点无法与源站建立 TLS 连接（GFW 阻断），导致 525 错误：

```
客户端 → CF 边缘(AMS/SJC) ──✗ TLS 失败 ──→ 源站 101.35.224.48:443
```

**解决方案**：用 Cloudflare Tunnel 将入站连接变为出站连接。

```
客户端 → CF 边缘 → CF Tunnel（服务器主动连 CF，quic 协议）→ nginx → MCP
```

---

## 架构

```
客户端
  ↓ https://mcp.iceywu.cn
Cloudflare 边缘（TLS 终止）
  ↓ Cloudflare Tunnel（出站 quic）
cloudflared（systemd 服务）
  ↓ http://localhost:80
nginx（路径路由）
  ├── /                   → 静态文件（Web 主页）
  └── /tencent-docs/      → http://127.0.0.1:3001/（MCP Server）
```

---

## 部署步骤

### 1. 安装 cloudflared

```bash
# 下载（国内用镜像）
wget https://gh-proxy.com/https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /tmp/cloudflared
sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

### 2. 授权 Cloudflare 账号

```bash
cloudflared tunnel login
# 打开输出的 URL，选择目标 zone（如 iceywu.cn），点击 Authorize
# 证书自动保存到 ~/.cloudflared/cert.pem
```

### 3. 创建命名 Tunnel

```bash
cloudflared tunnel create mcp-tunnel
# 凭证文件：~/.cloudflared/<tunnel-id>.json
```

### 4. 配置 nginx

Nginx 配置详见 [`deploy/nginx.conf`](../deploy/nginx.conf)。核心路由规则：

```nginx
# /etc/nginx/sites-available/mcp-iceywu
server {
    listen 80;
    server_name mcp.iceywu.cn;

    # MCP 服务
    location /tencent-docs/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Web 静态站点
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

> **注意**：Tunnel 连 nginx 走 HTTP(80)，不需要 SSL。CF 边缘已处理 TLS 终止。

> **Host 白名单**：nginx 用 `proxy_set_header Host $host` 把 `mcp.iceywu.cn` 透传给 MCP server。
> `mcp.iceywu.cn` 已内置在默认白名单中，无需额外配置即可放行。若要新增其它自定义域名，
> 启动 HTTP 服务时设置 `MCP_ALLOWED_HOSTS=域名1,域名2`（逗号分隔）即可追加。

### 5. 配置 Tunnel 路由

```yaml
# /etc/cloudflared/config.yml
tunnel: <tunnel-id>
credentials-file: /home/ubuntu/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: mcp.iceywu.cn
    service: http://localhost:80
  - service: http_status:404
```

设置 DNS 路由：

```bash
cloudflared tunnel route dns --overwrite-dns mcp-tunnel mcp.iceywu.cn
```

### 6. 安装为系统服务

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Coolify 部署

项目提供了 Dockerfile，可直接在 Coolify 中部署：

1. 在 Coolify 中新建资源，类型选 **Dockerfile**
2. 指向仓库 `mcp-hub`，分支 `master`
3. Coolify 自动构建镜像并启动容器（nginx + MCP server）
4. 容器对外暴露 80 端口，nginx 负责路由：
   - `/` → Web 主页（Astro 静态站点）
   - `/tencent-docs/` → MCP 服务（Node.js `:3001`）

Dockerfile 和 nginx 配置见 [`Dockerfile`](../Dockerfile) 与 [`deploy/nginx.conf`](../deploy/nginx.conf)。

---

## 多 MCP 服务扩展

`mcp.iceywu.cn` 使用路径前缀区分不同 MCP 服务，只需在 nginx 中添加 location：

```nginx
# 现有：腾讯文档 MCP
location /tencent-docs/ {
    proxy_pass http://127.0.0.1:3001/;
}

# 新增：另一个 MCP 服务
location /other-mcp/ {
    proxy_pass http://127.0.0.1:3002/;
}
```

Tunnel 配置不变（入口始终是 `localhost:80`）。

---

## MCP 客户端配置

```json
{
  "mcpServers": {
    "tencent-docs": {
      "url": "https://mcp.iceywu.cn/tencent-docs/"
    }
  }
}
```

凭证通过 HTTP 请求头传入（nginx 可注入 `x-tencent-*` 头），或配置 `.env.local`。

---

## 常用运维命令

```bash
# 查看 tunnel 状态
cloudflared tunnel list
cloudflared tunnel info mcp-tunnel

# 查看日志
sudo journalctl -u cloudflared -f
sudo journalctl -u bug-agent-mcp -f

# 重启服务
sudo systemctl restart cloudflared
sudo systemctl restart bug-agent-mcp

# 更新代码后部署
cd ~/dev/mcp/tencent-docs-agent
git pull
pnpm build:mcp
sudo systemctl restart bug-agent-mcp
```
