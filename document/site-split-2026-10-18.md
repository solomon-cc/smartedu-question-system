# 公司官网与学习平台分离

用户决定将 www 仅用于公司与业务介绍，题库、培训、评估、登录及管理迁回 go。

## 最终站点职责

| 域名 | 页面与职责 |
| --- | --- |
| https://www.ylmz.com.cn/ | 公司介绍、服务内容、师资团队、公众号入口；提供“进入学习平台”链接 |
| https://go.ylmz.com.cn/ | 默认进入题库；培训、评估中心、练习、学习记录、成员、强化物等功能均在此域名使用 |

官网为独立入口 `web/src/company.ts` / `CompanyApp.vue`，不注册应用路由、不恢复登录、不调用业务 API。仅构建公司展示页面所需的图片与资源，不复制 PEAK 材料和应用页面。学习平台继续使用原有 Vue 路由和认证、角色权限、后端数据。

公司展示内容复用 `CompanyOverview.vue` 与既有师资组件，沿用现有设计系统。学习平台导航和页脚的公司介绍链接返回 www，官网的学习入口转到 go。旧 www `#/library`、`#/assessment/...`、`#/login?...` 等书签自动携带原路径及查询参数转入 go。旧 `#/#company-team` 等公司锚点会规范为官网原生锚点。

官网不提供 `/api` 接口，不提供正式评估材料；学习平台的 `/api/` 继续转发到原 `127.0.0.1:8080` 服务。

## 构建与验证

- 学习平台：`cd web && npm run build`，输出 `web/dist`。
- 公司官网：`cd web && npm run build:company`，输出 `web/dist-company`；仅复制 `team` 与 favicon 静态资源。
- 本地开发：`npm run dev`（3000 学习平台）、`npm run dev:company`（3001 公司官网）。
- 5 个测试文件、17 项测试通过；包括旧功能书签迁移、官网锚点、登录后角色限制。
- 类型检查、两个生产构建和格式检查通过。
- 实际浏览器检查：公司导航与师资照片正常，没有功能菜单、搜索或登录表单；官网 820px iPad 和 390px 窄屏无页面横向溢出；学习平台根地址进入题库，评估中心与登录入口保留。

## 部署方式

采用两个独立静态目录，并一次热重载 Nginx 切换 www/go 映射；旧 `/data/web/go` 不修改，便于回退。部署前完整备份旧页面、域名配置、后端和数据库。发布校验包括两个域名的所有资源哈希、官网 API/评估材料不可用、go 匿名认证拒绝和实际账号角色读取。

后端程序不发布、不重启。以确定性数据库数据导出哈希核对记录及权限不变；不向生产写入测试业务数据。

## 线上验证结果

- 2026-10-18 15:47:18 发布成功：`SITE_SPLIT_DEPLOYMENT_OK`。
- www 公司官网目录：`/data/web/releases/site-split-20261018/company`，9 项资源 HTTPS SHA-256 一致。
- go 学习平台目录：`/data/web/releases/site-split-20261018/platform`，189 项资源 HTTPS SHA-256 一致。
- Nginx 配置测试通过并热重载；后端仍为 PID 22996，二进制哈希未变，没有重启。
- 原 33 张表的确定性数据导出哈希一致，账号、权限和业务记录未改动。
- go 公开题库、评估方法正常，匿名访问私有接口 401；ADMIN / TEACHER / STUDENT 的实际身份与评估读取验证通过。www 的 `/api`、`/api/me`、`/api/portal/catalog`、`/peak/D.pdf` 均返回 404。
- 浏览器实际确认：go 首页进入题库，评估中心可以进入登录；www 只显示机构、业务、师资导航与平台入口。旧 `https://www.ylmz.com.cn/#/assessment` 实际自动转入 `https://go.ylmz.com.cn/#/assessment`。
- 线上官网截图：`site-split-2026-10-18/company-online.jpg`。
- 完整备份：`/data/backups/site-split-20261018-154633`。原 `/data/web/go` 保持原样，不再作为两个域名的当前发布目录。

后续发布应分别使用两个构建产物，并读取各自 Nginx 的当前 root；不要将单份学习平台构建覆盖到官网，也不要继续向旧 `/data/web/go` 目录发布。
