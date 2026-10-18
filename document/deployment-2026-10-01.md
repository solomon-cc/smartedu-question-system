# 生产部署记录 · 2026-10-01

- 站点：https://go.ylmz.com.cn/#/assessment
- SSH 主机：ylmz，Linux amd64。
- 前端目录：/data/web/go；后端：/data/app/testogo/smartedu-question-bank；Supervisor：testogo。
- 本次发布：PK/PEAK D、G 共 128 项评估，儿童图片展示与教师操作面板、评分保存、学生作答材料。
- 备份：/data/backups/testogo-20261001-222235，含旧前端、后端、配置和数据库 SQL（74968 字节）。
- 保留原线上环境配置、JWT 密钥和旧前端 hash 资源；未导入本地测试数据。
- 构建：前端 vue-tsc + Vite 成功；后端 CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build。
- 后端 SHA256：6785217ed9d6f78912af7b2c455738a23653d756230745254d758a1826fda454。
- 前端包 SHA256：56cc014e34f8aac1c8e1b06243150e3189ab8f0180d4c28f12f5d688f9b74821。
- 新数据库表 peak_assessments、peak_scores 自动迁移成功；认证后 catalog 返回 128 项、评估列表接口正常。
- 发布前后既有记录数量一致：users 9、questions 20、papers 1、homeworks 0、histories 22。
- Supervisor 服务运行正常；HTTPS 首页 200，未认证 API 返回 401。
- 本次线上浏览器工具打开页面超时，未完成线上登录后的视觉复核；本地交互与响应式检查已在发布前完成。
- HTTPS 逐一核对首页与 151 个资源的 SHA256，包含全部 PK 图片、PDF 和首页入口资源，均与本地构建一致。

## 三角色界面优化发布 · 23:17 后

- 仅更新前端：统一角色工作空间、导航、标题、样式及交互状态，独立分析页面，区分课堂预览与学生正式作答。
- 备份：/data/backups/testogo-20261001-231718，数据库备份 76791 字节。
- 前端包 SHA256：c0a8a4d550e333df0e8ab3d99587c18040b88833004a73e66ffafe15fcbd8292。
- 原子切换首页入口，保留旧 hash 资源；未修改后端程序、线上环境配置、角色权限和数据库记录。
- HTTPS 核对 65 个文件的 SHA256：首页、全部 JS/CSS 页面分块及评估图片样例，全部与本地构建一致。
- 发布前后基础记录数量相同；三个角色的权限和统计接口正常；后台服务 PID 12225 持续运行，未因前端更新重启。
- 本地三个角色逐页实测；38 项前端测试及生产构建通过，详细记录见 ui-audit-2026-10-01.md。
