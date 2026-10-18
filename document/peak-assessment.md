# PK（PEAK）预评估

本次替换针对 Vue 入口 `/assessment`，菜单显示“PK 评估”。依据用户提供的三个 PDF 建立项目目录，不混入 PEAK 的其他模块或完整量表项目。

## 材料与目录

- `web/public/peak/D.pdf`：PEAK D PA 汉化双面翻页册，138 页；FLS / PLS / VCS / VMS 各 16 项。
- `web/public/peak/G.pdf`：PEAK G PA 汉化双面翻页册，133 页；LLS / CMS / CPM / RPR 各 16 项。
- `web/public/peak/response.pdf`：G 学习者作答册，封面加 11 个作答页。
- `assessment_data/peak.json`：128 项目录，含原文、PDF 实际页码、材料页、作答册页、差异提示。中文任务标题为便于列表阅读的摘要，施测以保留的原文为准。
- `D-*.png` / `G-*.png` 只提取学习者材料面。a/b 连续呈现合为一个计分项目；G 作答册任务在材料视图使用 `response-*.png`。书写/绘画任务仍使用纸笔，系统保存人工观察结果。

## 评分范围与原文差异

G 作答册印有 Score 0 / 1。系统使用 1=正确、0=未通过；未记录不是 0。D 翻页册未提供评分指南，因此采用相同的二元反应记录方式，页面明确说明这一实现假设。结果仅为原始反应统计，不提供常模、标准分、发展年龄、诊断或自动教学结论。

已标注 D 的 VMS-10 原页误标 VCS-10、VCS-14 中英正确反应差异；G 的 CMS-9 节奏差异、CMS-14 作答册误标 CMS-12、RPR-9 脚本误标 PRP-9。原始材料不改写，评估人员可记录实际采用的指令。

## 存储与兼容

- 新表 `peak_assessments` / `peak_scores` 通过已有 `InitDB` 自动迁移创建，不删除或转换 VB-MAPP 表。
- 旧 `/api/assessments` 接口保留兼容；新页面的历史入口仅供阅读旧记录。
- 新接口位于 `/api/assessments/peak`，复用 `assessment_history` 权限。GET `/catalog` 返回目录，GET/POST 根路径列出/建立记录，GET/POST `/:id/scores` 读取/保存项目，PUT `/:id` 接受 `{status: "completed"}`。
- 学生仅能查看自己的记录。创建限定真实学生及 D/G 模块，保存限定所属项目和整数 0/1，重复保存更新同一项。64 项全部记录后才能完成；完成后不可修改。完成接口不接受身份、模块等字段修改。
- 生产发布需同时更新后端和 `web/dist`，新后端包含嵌入式目录，Vite 构建会复制 PDF 与 PNG。PDF 与材料图片为静态资源，访问方式与现有前端静态资源一致；评估结果受 API 权限控制。

## 验证

`go test ./...`；`cd web && npm test && npm run build`。

浏览器使用隔离 SQLite 测试库，验证 D/G 新建、评分保存及刷新后恢复、a/b 材料切换、G 作答册关联和 390px 布局。没有向现有业务数据库写入测试评估。

## 联合施测界面

评估中记录默认打开全屏 `PeakSession`：左侧呈现孩子的原始图片/作答页，右侧提供当前材料步骤的指令、教师确认评分、备注及保存后下一题。共用屏幕时可切换“只看题目”，隐藏教师指令和评分；动作/口语任务呈现中性的互动提示。参考答案默认折叠。

`web/src/lib/peakPresentation.json` 从用户 PDF 的脚本区域提取各步骤指令并标识是否有视觉材料；a/b 材料切换时指令同步。纸笔任务显示作答页并提醒准备纸本和铅笔。暂跳保持未评，未保存修改在切题或退出时提醒，保存失败保留当前题和输入。可选倒计时只辅助老师遵循原指令，不自动评分或翻页。

参考公开施测研究（https://pmc.ncbi.nlm.nih.gov/articles/PMC7070134/）的老师脚本/孩子刺激材料安排，以及官方数字产品介绍（https://www.emergent-digital.com/peak-aim）关于材料与记录共同提供的方向；未根据公开宣传页臆测其私有施测 UI。
