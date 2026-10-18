# 去米色配色与 Vue skill 安装（2026-10-10）

按用户要求移除界面米色，以品牌绿、白色和浅绿作为基础配色。活动辅助色（蓝、粉、紫、青、橙、黄）继续区分学习场景；黄色只作为少量强调，不再混成奶油色面板。

## 设计参考与安装

- 已安装官方 Vue skill：`/Users/chencheng/.codex/skills/animal-island-vue-style/SKILL.md`。
- 来源：<https://github.com/guokaigdg/animal-island-vue/tree/main/skill>，使用官方 skill-installer 的 git 下载方式。
- 上游 YAML 的 description 折叠字符串缺少缩进，本地只修正元数据，保留指南正文；用 YAML 解析确认 name/description 有效。
- 按用户优先级覆盖指南默认的奶油米白配色；参考 ui-ux-pro-max 的语义配色、阅读对比度、触屏与响应式约束。
- 这次安装的是 skill，现有学生控件仍使用项目的 Vue/Vuetify 适配层，未将 npm 依赖替换为 animal-island-vue。

## 修改范围

- `student-island.css` 与 `main.ts`：亮色白/浅绿底、绿灰文字、绿灰边框与按钮阴影；暗色对应深绿底与浅绿白文字。浮层沿用同一套主题。
- `Login.vue`：页面与登录卡片、图片说明区域、移动端房屋插画移除米白。
- `LifeGamePlayer.vue`：任务提示、商品标签、计算器、钱包、选择/拖放状态、完成面板换为白/浅绿，错误提示使用红色语义。
- `Dashboard.vue`、`style.css`：清理小插画块与品牌图标的奶油色。
- 保留游戏原始背景画作和真实物品的自然颜色。
- 未修改 API、角色权限、数据结构、评分或游戏进度逻辑。

## 验证

- vue-tsc 与 Vite 生产构建通过（12.63 秒）；已有 spreadsheet 大 chunk 提示，无构建错误。
- git diff --check 通过；源码扫描确认原奶油/米色主题 tokens 无剩余。
- Codex 自身内置浏览器实测：1440×900 桌面首页和登录页、375×812 手机首页和登录页、768×1024 iPad 深色首页与个人资料弹窗、1024×768 iPad 超市预览至计算总价与钱包付款界面。
- 手机首页/登录页 document.scrollWidth=375，无横向溢出。
- 亮色正文/浅绿 8.85:1，辅助文字/浅绿 5.23:1，主按钮 7.40:1；暗色正文/面板 8.80:1，辅助文字/面板 6.21:1，主按钮 8.01:1。
- 老师场景预览退出，个人资料弹窗取消，恢复浅色主题与浏览器默认尺寸。
- 截图与构建/发布日志：`.local/student-island-no-beige/`。

## 发布

使用完整前端资源发布脚本 `.local/deploy/deploy-student-island-no-beige.py`，保留之前入口回滚路径并逐项校验线上资源哈希。发布成功，232 个 HTTPS 资源逐项哈希一致；数据库条数、后端文件与角色权限快照未改变。暂存路径 `/data/staging/student-island-no-beige-20261010-142121`，备份 `/data/backups/testogo-20261010-142124`。
