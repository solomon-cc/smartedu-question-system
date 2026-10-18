# 学生端手绘风与技能清理（2026-10-10）

## 来源与设计检查

修改前主要图标来自 `@mdi/font`（Material Design Icons），没有使用 naive-icons。

本次使用 ui-ux-pro-max 和 animal-island-vue-style 的规范检查。保留用户指定的绿色主色、白色/浅绿底和多色活动辅助色，不采用 skill 默认米色。检索中的教育应用柔和触感建议适用，销售转化/官网模板建议与学生工作空间不符，未采用。

- 图标来源：<https://github.com/guokaigdg/naive-icons>，本地源码 `.local/vendors/naive-icons`。
- 引入 67 个官方 MIT SVG，并基于 smile 绘制四个有区别的心情变体；来源 commit 记录在 `naiveIcons.ts`。
- 原图 cream 填色改为白色，描边随上下文继承；小动物和心情贴纸固定深绿描边，确保暗色背景上的面部细节清晰。
- 保留原项目品牌麦芽标记；选择框/单选框等有精确状态语义的控件继续使用原图标。
- SVG 以静态受校验的图形字符串在 Vue 内渲染，无 React 包和运行时依赖；许可随前端发布到 `/licenses/naive-icons.txt`。

## 修改范围

- `NaiveIcon.ts` 与 `naiveIcons.ts`：学生角色的图标适配层；未映射图标回退；老师/管理员继续使用 MDI。
- `StudentHome.vue`：学习入口从数字装饰改为猫与书本，任务空状态用小兔，心情入口采用心形与表情贴纸。
- `IslandTitle.vue`：标题由大面积深色飘带换为柔和便签形，保持语义标题和清晰对比度。
- `EmptyState.vue`：学生记录空状态使用小蜗牛，工作人员保持原图标。
- `student-island.css`：活动封面柔和色块、童趣图形、清晰卡片边框；有意点击时提供短暂按压反馈；支持 prefers-reduced-motion；底部导航保留五项，增加 8px 间距。
- 共用图标和标题适用于学习、作业、心情、成长、历史、错题、评估等学生页面。
- 未修改 API、权限、数据、评分、练习保存或老师预览逻辑。

## 技能清理

旧 React skill 已移出活动路径 `/Users/chencheng/.agents/skills/animal-island-ui-style`，保留可恢复副本在 `/Users/chencheng/.codex/removed-skills/animal-island-ui-style-20261010-142617`。两处活动 skill 根目录扫描仅剩 Vue 版本。旧前端引用的 MIT 许可保留，技能移除不等同于删除授权声明。

## 验证

- 全套 27 个测试文件、97 项测试通过；新图标测试覆盖 STUDENT/TEACHER/ADMIN 切换、保留控件和未知图标、五种表情区分。
- 最后修正暗色贴纸描边后，图标 3 项测试再次通过；生产构建 13.18 秒通过。原 spreadsheet chunk 提示继续存在。
- 内置 Codex 浏览器真实账号验收：1440×900 首页；375×812 首页/练习/记录/错题/评估；768×1024 心情亮/暗主题、作业与成长页面。
- 手机页面无横向溢出，底部五个导航目标各约 65×87px、间距 8px；保留所有原导航和选项文案。老师页面读取到 0 个 Naive SVG / 19 个原 MDI 图标。
- 个人资料、评估与心情记录仅查看，没有提交新的学生数据；恢复浅色主题和临时视口。
- 截图、路由检查、测试、构建与发布记录位于 `.local/student-island-cozy`。

## 发布

使用完整前端发布脚本 `.local/deploy/deploy-student-island-cozy.py`，已成功发布到 https://go.ylmz.com.cn/。全部 233 个资源通过线上 HTTPS 哈希核对，业务数据、存储权限与后端保持一致。备份：`/data/backups/testogo-20261010-143916`；暂存：`/data/staging/student-island-cozy-20261010-143914`。
