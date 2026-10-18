# 生活场景练习：设计参考与实现

本次按既有绿色 Vue / Vuetify 设计系统和 ui-ux-pro-max 规范实施。参考成熟 iOS 教育游戏的对象操作、视觉任务板与成人指导界面，使用原创画面，不复制第三方游戏资产。

## 实际参考

- [Dr. Panda Supermarket，App Store](https://apps.apple.com/us/app/dr-panda-supermarket/id609405853)：查看真实商店场景、货架物品、购物篮和收银台截图。将“场景内操作对象”用于本项目；增加实际价格计算和过程保存。
- [Otsimo，App Store](https://apps.apple.com/us/app/otsimo-special-education-1/id1084723774) 与 [官方用户指南](https://otsimo.com/en/user-guide-otsimo-special-education/)：儿童活动界面与成人设置、报告分开。本项目将孩子的任务操作与老师的任务准备、学生选择和过程回看分开。
- [Choiceworks，App Store](https://apps.apple.com/us/app/choiceworks/id486210964) 与 [官方指南](https://www.beevisual.com/choiceworks-app-user-guides)：图片任务顺序、当前步骤与完成状态。用于本项目“看清单 → 做当前任务 → 核对 → 下一步”。
- [AFIRM Visual Supports](https://afirm.fpg.unc.edu/sites/afirm.fpg.unc.edu/files/imce/resources/VS%20Step-by-Step.pdf)：按个体需要提供视觉支持。本项目使用图片清单、可请求提示、可暂停、可点选沟通卡，无强制口语、自动播放声效或倒计时。

这些参考用于产品设计，不构成本项目临床疗效或评估效度的证明。系统记录的是实际屏幕操作与提示使用，专业能力判断需要老师结合真实场景观察。

## 完成的内容

| 场景 | 任务 | 练习过程 |
| --- | --- | --- |
| 小小超市 | 两件物品 / 数量与价格 / 元与角 | 看图清单、选物品、计算总价、结账沟通、选钱付款、核对找零 |
| 今天我来点餐 | 一份餐点 / 组合餐 | 看餐单、选餐、表达需要、计算餐费、付款、核对餐品 |
| 出门前的书包 | 上学准备 / 外出准备 | 看安排、按清单装包、检查、准备出门 |

- 对象和价签均来自真实后端素材库。课程一次性存入场景库；前端不生成模拟用户、模拟记录或硬编码任务答案。
- 会话保存版本、任务、商品价格快照、操作与提示；关闭后继续，完成后只读。以整数分核算金额。网络重试保持同一操作 ID，避免重复拿物品或钱币。
- 老师预览通过无持久化的回放接口运行，不写学生学习记录。课堂练习需选择真实学生；学生只能操作自己发起的练习。
- 老师查看学生心情历史，可按学生、日期和来源筛选。学生自述与老师观察由后端身份判定；旧记录标为来源未标注。跟进备注独立保存，学生无法写入或读取老师跟进接口。
- 原有自定义场景、素材管理保留在老师的“场景与素材库”。没有步骤定义的旧场景作为备课素材保留。
- 登录保留品牌插画、一句说明和必要表单；手机采用紧凑顶部插画，桌面双栏。

## 原创资产

生成模式：内置 imagegen，直接生成不透明 PNG；逐张检查后转为 JPEG，生产代码引用仓库内的文件。

- `web/public/life/supermarket-v1.jpg`
- `web/public/life/cafe-v1.jpg`
- `web/public/life/schoolbag-v1.jpg`

物品、价签、钱币、沟通卡和操作控件由 Vue / SVG 实现，始终可点击和键盘操作。背景图不包含按钮、价格、文字或正式评估材料。

### 超市完整提示词

Use case: illustration-story. Asset type: production background for an interactive life-skills supermarket game for children in a Chinese education app. Create an ORIGINAL polished 2D illustrated supermarket interior, landscape 1536x1024 composition, friendly clean mobile educational game quality. Interior with a softly colored sage green back wall, a pale cream floor, two large uncluttered wooden grocery shelving units occupying the central 60 percent of the composition; shelves mostly empty with only a few small background grocery silhouettes at edges because real interactive product objects will be placed by code over the shelves. A simple checkout counter on the far right with a friendly human shop assistant smiling gently, an empty spacious foreground for an interactive basket overlay, and a window on the far left with soft daylight. Clear crisp silhouettes, warm muted colors, appealing dimensional shading, beautifully drawn original children’s illustration, calm uncluttered layout without overwhelming details. Inspired by the production polish and object-based interactions of professional iOS educational games, but do not copy any existing characters, logos, assets or layout. No panda, no anthropomorphic animals, no writing, no letters, no numbers, no UI buttons, no watermark. Show the entire store, straight-on slightly elevated camera, suitable for scaled responsive cropping. Leave the centre shelving surfaces and lower foreground clean for interactive overlays.

### 餐厅完整提示词

Use case: illustration-story. Production background for an original interactive Chinese children's life skills cafe ordering game. Landscape 1536x1024, polished professional educational mobile game illustration. Straight-on slightly elevated camera. Cozy calm cafe interior with muted sage green back wall, cream floor, warm wood broad service counter centered across middle of composition, cashier counter and gentle smiling human cafe worker at far right. Window and one small cafe table at far left. Central 65 percent of counter completely empty and clean for large interactive food objects to be placed by code. Menu board above counter is a blank framed dark sage green rectangle, no writing. Bottom foreground clean and spacious for tray and controls overlay. Beautiful crisp clean silhouettes and dimensional soft shading, warm muted natural colors, same original cozy 2D children’s supermarket art style. Uncluttered, very few props, shelves not packed. No text, letters, numbers, brands, buttons, logos or watermarks. No existing app characters, no pandas. Original art.

### 书包场景完整提示词

Use case: illustration-story. Production background for an original interactive Chinese children's life skills schoolbag packing game. Landscape 1536x1024, polished professional educational mobile game illustration. Straight-on slightly elevated camera. Calm welcoming child's room: soft sage and cream wall, pale wood floor, window with warm daylight at far left, broad wood desk centered across the middle of the composition, open simple teal backpack on a small seat at far right, a quiet wall shelf with just two small items at outer left. Central 65 percent of desk surface and shelf entirely empty and clearly visible for interactive book, pencil pouch, water bottle objects to be placed by code. Lower foreground spacious and clean for task controls overlay. Beautiful crisp clean silhouettes and dimensional soft shading, warm muted natural colors, cozy original 2D children's supermarket game art style. Uncluttered, few props. No people needed. No writing, letters, numbers, screens, buttons, logos or watermarks. Original professional mobile educational game art, do not copy existing apps.

## 验证与发布

- Go 测试与 `go vet ./...` 通过，覆盖三个场景七个难度流程、只读完成、快照价格、越权访问、预览不持久化、同操作 ID 重试、心情来源防伪和老师跟进隔离。
- 前端 20 个测试文件 / 76 项测试通过，含场景对象点击、金额重试、付款找零、网络重试、学生/老师控制差异、心情历史与跟进。类型检查与生产构建通过；原有 ExcelJS 大包警告仍存在。
- 本地真实 JWT / API 流程跑完三个场景七个任务：从创建到只读完成、老师查看、学生心情提交到老师历史查询、独立跟进均通过。
- Vite 已在 `http://127.0.0.1:3000` 启动；本地 API 为 SQLite 隔离预览库，测试数据未写入生产。
- 浏览器验证边界：CUA 的内置浏览器不可用；Chrome 扩展注册信息可见，但打开 / 控制标签页请求仍超时。因此没有完成真实浏览器或手机的截图、视觉与尺寸验收；不将组件与 API 测试等同于实机验收。
- 已发布到 `https://go.ylmz.com.cn/#/application`，管理员、老师、学生权限接口及 76 个 HTML / JS / CSS / 新场景 JPEG 的 HTTPS SHA256 核验通过。
- 发布备份：`/data/backups/testogo-20261009-174902`。服务 `testogo` 正常，PID 25620。
- 既有用户 9、题目 20、试卷 1、作业 0、学习历史 22 保持不变；评估及心情历史计数保留。本次仅新增三个真实课程和十六个物品素材，未生成线上测试学习记录。
