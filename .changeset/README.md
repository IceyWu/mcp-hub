# Changesets

本目录由 [changesets](https://github.com/changesets/changesets) 管理，用于追踪版本变更与生成 changelog。

## 日常流程

1. 改完代码后，运行 `pnpm changeset`，按提示选择要发布的包（这里是 `tencent-docs-mcp`）和版本类型（patch/minor/major），写一句变更说明。会在本目录生成一个 `.md` 文件，提交进 git。
2. 准备发布时，运行 `pnpm changeset:version`：消费所有 changeset 文件，自动升版本号、更新 `CHANGELOG.md`。
3. 运行 `pnpm release`：编译并 `npm publish` 发布到 npm。

CI（GitHub Actions）会在 `master` 有新的 changeset 时自动开「Version Packages」PR，合并后自动发布。详见 `.github/workflows/release.yml`。
