# 学生端 Animal Island 配色修正 · 2026-10-10

此前学生端多数卡片和标题使用米色、棕色和品牌绿，弱化了 Animal Island 的 app-tile 配色。此次参考官方设计系统，沿用上次的任务优先首页、学科选择和底部导航结构，补齐活动之间的色彩层级。

## 来源与适配

- 官方来源：https://github.com/guokaigdg/animal-island-ui/blob/main/docs/design-system/design-tokens.md
- 官方布局规范：https://github.com/guokaigdg/animal-island-ui/blob/main/docs/design-system/components/layout.md
- 先读取 animal-island-ui-style 和 ui-ux-pro-max skill，查询文字对比度规范。
- 保持 Vue/Vuetify 适配方式；未声称使用原版 React 组件。
- 官方示例网站在 Codex 内置浏览器读取时超时；成功核对的是官方仓库的当前设计系统文档。

## 配色与行为

公共 palette.ts 将模块和学科映射到固定颜色；student-island.css 声明官方 blue #889df0、yellow #f7cd67、pink #f8a6b2、purple #b77dee、teal #82d5bb、orange #e59266。

| 用途 | 配色 |
| --- | --- |
| 首页问候、老师任务 | 黄色 |
| 学习入口、数学、答题历史 | 蓝色 |
| 语言词汇 | 黄色 |
| 阅读、生活练习、超市 | 薄荷色 |
| 识字、成长、评估历史 | 紫色 |
| 我的心情 | 粉色 |
| 点餐、错题本 | 橙色 |
| 整理书包 | 蓝色 |

活动图形和标题使用完整色，正文卡片用同色浅底。主操作采用官方 #19c8b9，配深棕字；文字型操作仍用较深的青绿色。选中状态保留边框、勾选图标或 aria-pressed，避免单靠颜色。心情不同表情采用柔和颜色，不将低落标为错误。

修复 Vuetify 子图标自带 theme class 导致活动色被重置的问题。深色模式使用暗色卡片底和明亮的活动图标，避免在深色背景使用深色文字。此次没有修改 API、数据结构、评估规则或角色权限。

## 验证

- Vitest：26 个文件、94 项测试通过。
- vue-tsc 和 Vite 生产构建通过；已有 ExcelJS chunk 提醒仍存在。
- 修改文件通过 Prettier，git diff --check 通过。
- Codex 内置浏览器：320px 窄屏首页、375px 首页和学科/心情、768px iPad 生活练习及深色心情、1440px 首页；检查范围无横向溢出。
- 实际点击学科切换、更多菜单、心情预选、取消和放弃修改；未提交新的心情记录。
- 彩色卡片正文、标题、操作按钮、导航和成长摘要抽查对比度；加深蓝/紫浅底上的辅助文字后抽查通过。截图及测量数据在 .local/student-island-palette/，不作为正式完整无障碍认证。
- 老师心情历史页仍保留筛选与查看/跟进操作，品牌绿主操作，未应用学生彩色卡片。
- 临时 CDP 尺寸模拟已清除，主题恢复浅色。

发布结果见 .local/student-island-palette/deploy.log 和 .local/deploy/student-island-palette-result.json。发布包含完整 dist，先备份、资源 hash 验证，并检查生产数据、权限和后端二进制未变化。

## 发布确认

部署成功：全部 232 个资源通过线上 HTTPS hash 验证。Backup: /data/backups/testogo-20261010-083930。生产业务数据数量、存储权限和后端二进制 hash 未变化；本机 curl 校验线上 index 与当前构建一致。线上浏览器交互验收未在本轮完成；截图与角色交互验收来自本地同版本 Codex 内置浏览器。
