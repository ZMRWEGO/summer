# 悬于天际：Vercel + Cloudflare 部署

此项目是 Vite + Three.js 静态网站，无后端服务，无需环境变量。
GitHub 保存代码和提交历史，Vercel 从 GitHub 自动构建并托管网站，Cloudflare 管理域名 DNS。

- 网站域名：`https://summer.spring-smart.com`
- GitHub 仓库：`https://github.com/ZMRWEGO/summer`
- Vercel 项目：`xuanyutianji`
- 生产分支：`main`

## 1. 本地构建

使用 Node.js 22（至少 22.12）：

```sh
npm ci
npm run build
```

构建结果在 `dist/`，包含页面、脚本和 `audio/` 配乐资源。

## 2. 部署到 Vercel

项目使用 GitHub 仓库作为部署来源。在 Vercel 项目 Settings → Git 中连接该仓库，生产分支使用 `main`。
根目录的 `vercel.json` 已设置：

| 设置 | 值 |
| --- | --- |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 22.x，由 `package.json` 指定 |

每次推送 `main` 后，Vercel 自动生成生产部署。其他分支可生成预览部署。

日常更新：

```sh
npm run build
git add index.html src public package.json package-lock.json vite.config.js vercel.json README.md DEPLOYMENT.md .gitignore .vercelignore
git commit -m "描述本次修改"
git push origin main
```

新建文件时也需加入 Git。`node_modules/`、`dist/`、`.vercel/` 和本地环境变量文件已忽略。

## 3. 将域名交给 Cloudflare 管理

如果域名已在 Cloudflare 且状态为 Active，跳过这一步。

1. 在 Cloudflare 中添加自己的域名，并检查现有 DNS 记录是否完整导入。
2. 在域名注册商处，将 nameservers 改为 Cloudflare 为该域名分配的两条服务器地址。
3. 等待 Cloudflare 显示域名为 Active。

保留邮箱使用的 MX、TXT 等现有记录。

## 4. 绑定域名并设置 DNS

1. 打开 Vercel 项目 → Settings → Domains，添加 `summer.spring-smart.com`。
2. 在 Cloudflare → DNS → Records 中，添加下面这一条网站记录：

| 域名用途 | Cloudflare 名称 | 类型与目标 |
| --- | --- | --- |
| summer.spring-smart.com | `summer` | CNAME → `c5b9b7b9fcdb78c7.vercel-dns-017.com` |
| 所有权验证（如提示） | Vercel 显示的名称 | TXT，内容按 Vercel 提示填写 |

网站记录使用 **DNS only（仅 DNS，灰云）**，TTL 使用 Auto。
上述 CNAME 是此项目在 2026-10-24 返回的推荐值，后续如有变化，以 Vercel Domains 页面为准。
只处理 `summer` 的网站记录，保留根域、邮箱及其他子域名记录。

3. 返回 Vercel，等待域名显示 Valid Configuration，并确认 HTTPS 证书已生效。
4. 访问 `https://summer.spring-smart.com`，检查首页、交互和配乐。

灰云模式下，网站 HTTPS 和内容分发由 Vercel 提供。Cloudflare 的代理缓存与 SSL 模式不会参与网站请求。
如果确实需要 Cloudflare 橙云代理，先按 Vercel 的代理接入说明检查证书验证、缓存与 Verified Proxy 要求，再调整。

## 官方参考

- [Vite 静态部署](https://vite.dev/guide/static-deploy.html)
- [Vercel 自定义域名](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel 与 Cloudflare 的接入建议](https://vercel.com/guides/using-cloudflare-with-vercel)
- [Cloudflare DNS 记录管理](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
