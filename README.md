# 一粒麦子 · 学习与培训门户

面向 PC 与 iPad 的教育门户。当前产品只聚焦**题库、培训**，统一顶部导航：企业介绍首页 / 题库 / 培训，登录后增加个人学习及按角色显示的管理入口。

前端：Vue 3 + TypeScript + Arco Design Vue，旧版 Vuetify / Animal Island 前端已归档到 `web/legacy/vue-2026-10-16/`，不参与当前构建。后端：Go / Gin / GORM，支持 SQLite 与 MySQL。旧评估、作业、场景等代码暂存，不进入新门户流程。

## 当前功能

- 题库：年级目录 → 学科 → 主题 → 知识点；搜索、题目编辑、单选/多选/判断/填空/计算题、服务端判分、解题说明、个人练习记录。老师/管理员课堂预览不写入学生记录。
- 培训：家长/老师两类，文字、视频、文档章节，草稿/发布、公开/指定学员、章节顺序管理。
- 进度：视频每约 5 秒、暂停、切换章节与离开时保存；浏览器本地暂存待同步进度，联网后重试。刷新或下次登录恢复位置；章节完成状态持久化。
- 文件：4MiB 分片、SHA-256 分片校验、暂停/恢复、幂等重传。网络/断电中断后重新选择同一文件，继续已确认的上传任务。最大 2GB。
- 角色：学生、家长、老师、培训师、管理员。管理员可设置多位管理员、培训师，停用账号；培训师管理自己创建的课程，管理员管理全部课程。

公开课程对所有登录用户开放；课程分类是内容分类，指定学员是实际访问控制。课程文件经授权签名后提供，支持视频 Range 请求；取消发布后旧签名也失效。文档通过浏览器新窗口查看或下载，PDF/TXT 通常可直接查看，DOCX/PPTX 由本机相应应用打开。视频推荐 MP4/H.264/AAC；未加入服务端转码。

## 本地启动

需要 Go（见 `go.mod`）、Node.js 22.22.2+ 与 npm；SQLite 需 CGO 和可用 C 编译器。

1. 参考 `.env.example` 创建 `.env`，不要覆盖已有配置。配置 `JWT_SECRET`；新空库还需设置 `BOOTSTRAP_ADMIN_PASSWORD`，初始账号为 `admin`。
2. 根目录运行 `go run .`，API 监听 8080。
3. 前端运行：

```sh
cd web
npm ci
npm run dev
```

访问 http://127.0.0.1:3000/ 。开发服务只绑定本机，`/api` 默认代理到 8080；可用 `web/.env.local` 中的 `API_PROXY_TARGET` 修改。空库不插入虚构课程或题目；管理员登录后可先开通成员，创建题库主题和课程。

上传目录由 `TRAINING_UPLOAD_DIR` 指定，默认 `.local/training-uploads`。上传分片与正式文件都在该目录；需要持久化并与数据库一起备份。学习暂存使用浏览器 localStorage：不能替代服务器备份，断电最多可能丢失上一个保存间隔内的几秒视频进度。

## 验证与构建

```sh
go test ./...
cd web
npm test
npm run typecheck
npm run format:check
npm run build
```

新门户后端回归在 `portal_test.go`；前端测试覆盖角色路由、离线进度重放、账号隔离、并发更新与续传偏移。生产产物为 `web/dist`，采用 hash 路由；Web 服务器需要代理 `/api`，反向代理单次请求体限制至少 4MiB（建议 8MiB）。

本轮浏览器联调使用独立 `.local/portal-preview.db` 与 `.local/portal-preview-uploads`，未发布到生产。测试账号与示例内容只在该联调环境中；不要把联调密码或示例课程作为正式环境配置。

## 结构与设计

- `web/src/views/`：门户、题库、答题、培训目录、课程学习、课程编辑、成员管理。
- `web/src/lib/`：鉴权、API、类型、断点上传、离线进度。
- `web/src/components/`：统一状态、文件上传、未保存修改保护。
- `portal.go`、`portal_models.go`：门户 API、内容权限、课程、文件及学习记录。
- `database.go`：建表与管理员初始化；`middleware.go`：登录令牌和账号即时状态检查。

当前设计与验收记录见 `document/portal-refactor-2026-10-16.md`。本轮不承诺把旧版学习/评估数据迁入新门户；旧代码归档保留供后续独立规划。

2026-10-17 已发布到 [正式站点](https://www.ylmz.com.cn/)，详见 [发布与验证记录](document/deployment-portal-2026-10-17.md)。
