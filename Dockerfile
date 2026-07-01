# ── Build stage ──
FROM docker.m.daocloud.io/library/node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
# 国内 npm 镜像
RUN npm config set registry https://registry.npmmirror.com
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY agent/ agent/
COPY mcp-servers/ mcp-servers/
COPY web/ web/

RUN pnpm install --frozen-lockfile
RUN pnpm build:mcp
RUN pnpm build:web

# ── Runtime stage ──
FROM docker.m.daocloud.io/library/node:24-alpine

# Alpine 国内镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

RUN apk add --no-cache nginx supervisor

# nginx
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf
RUN mkdir -p /run/nginx

# web static files
COPY --from=builder /app/web/dist /var/www/html

# MCP server
COPY --from=builder /app/mcp-servers/tencent-docs/dist /app/mcp-server
COPY --from=builder /app/node_modules /app/node_modules

# supervisor
COPY deploy/supervisord.conf /etc/supervisord.conf

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
