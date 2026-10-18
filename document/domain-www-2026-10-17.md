# 网站切换到 www · 2026-10-17

- 正式入口： https://www.ylmz.com.cn/ 。www 旧静态站点映射已替换为当前门户项目。
- 静态目录仍为 `/data/web/go`；API 反代仍为 `127.0.0.1:8080`。未搬移或删除业务数据库、课程文件或后端服务。
- `www.ylmz.com.cn` 和 `go.ylmz.com.cn` 的 DNS 均指向现有服务器；www 证书主机名校验通过，不需要更改解析。
- 按用户要求，`/etc/nginx/conf.d/go.ylmz.com.cn.conf` 已移出 Nginx 加载目录，存于备份目录；没有为 go 设置跳转。原有默认服务拒绝未配置主机的 TLS 握手。
- 备份：`/data/backups/testogo-20261017-150349`，包含原 www、go 配置、前后端文件及数据库备份。原 www 的静态文件未删除，但 www 已不再映射到旧目录。
- `nginx -t` 通过并完成热重载；后端 PID 保持不变。
- 验证结果：`WWW_SWITCH_DEPLOYMENT_OK`；181 个新域名 HTTPS 文件与生产构建 SHA-256 一致；首页、公开题库与课程接口 200，匿名 `/api/me` 401。原有业务记录、权限配置和后端程序校验不变。
- 师资区的来源说明、日期说明与对应样式已移除。类型检查、构建与格式检查通过。
- 浏览器已读取新域名首页，核对两位老师资料及来源说明消失，截图见 `www-switch-2026-10-17/live-page.jpg`。
- 发布脚本：`.local/deploy/deploy-www-switch-20261017.py`；资源清单：`.local/deploy/www-switch-20261017-result.json`。
