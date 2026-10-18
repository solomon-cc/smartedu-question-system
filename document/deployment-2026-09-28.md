# 生产部署记录 · 2026-09-28

- SSH 主机：`ylmz`（Linux amd64）
- 站点：https://go.ylmz.com.cn/
- 前端目录：`/data/web/go`
- 后端程序：`/data/app/testogo/smartedu-question-bank`
- 后端管理：Supervisor `testogo`
- 备份：`/data/backups/testogo-20260928-055032`（服务器路径，包含旧前端、后端、环境配置、Nginx/Supervisor 配置及数据库 SQL 备份）

## 已执行

构建 Vue 前端及 Linux amd64 静态 Go 程序；上传后校验 SHA-256。保留原 MySQL/OSS 配置，在服务器生成新版要求的 JWT_SECRET，旧登录会话需要重新登录。没有导入本地测试数据。

新增前端域名的 `/api/` 同域代理，指向原后端 `127.0.0.1:8080`。替换后端程序，执行 `supervisorctl restart testogo`；发布静态资源及入口，保留旧 hash 资源供已打开页面使用；通过 `nginx -t` 后执行用户要求的 `systemctl restart nginx`。

## 验证

- Supervisor：RUNNING；Nginx：active。
- 线上首页 HTTPS 200，内容与本地构建的 index.html 一致。
- 入口 JavaScript、framework JavaScript、CSS 通过 HTTPS 获取，内容哈希与构建文件一致。
- `/api/me` 未登录请求返回预期的 HTTP 401 JSON。
- 部署前后数量一致：用户 9、题目 20、试卷 1、作业 0、历史记录 22。
- 上传的后端 SHA-256：`58ed1fd245ab0fead04bb40d8552281ad6e8334526637c1cdfbf85b6cd75ebda`。

浏览器工具能发现线上登录页标签，但连续读取标签超时，未完成生产页面视觉复核或账号登录回归。没有绕过 TLS 校验，也没有使用本地测试账号尝试登录生产环境。
