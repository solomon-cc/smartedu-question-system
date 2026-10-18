# 游戏界面局部适配

本次以 `ui-ux-pro-max` 的触控、拖拽替代操作、响应式和视觉一致性要求为基础，参考已安装的 `animal-island-ui-style`。现有 Vue / Vuetify 项目采用局部样式适配，不引入 React 运行时或替换业务组件。

## 使用范围

- 超市、点餐、书包三个场景共用 `LifeGamePlayer.vue` 的游戏样式。
- 暖色面板、圆角标签、胶囊按钮和主操作按钮的轻量按压效果。
- 主色沿用一粒麦子的品牌绿，正文采用暖棕色；保留现有图标和系统字体回退。
- 保留 Vuetify 弹窗的焦点管理，游戏弹窗使用固定浅色主题。
- 商品和目标物体的点击区域透明，去除浏览器默认灰色背景与边框。
- 清单、已备齐数量、当前提示集中在一个面板中；手机清单完整换行。
- 手机横屏为清单预留独立区域；收银台不再叠加重复的简笔人物。
- 背景继续使用 `cover` 等比例填充；不同屏幕比例会裁切边缘，不会拉伸。

## 来源

- React 原项目：https://github.com/guokaigdg/animal-island-ui
- 样式 token：https://github.com/guokaigdg/animal-island-ui/blob/main/docs/design-system/css-variables.md
- MIT 声明随前端保存于 `web/public/licenses/animal-island-ui.txt`。
- Vue 移植版 README 的非商业限制与 LICENSE 不一致，因此本次不直接引入该包。

## 业务边界

保留现有 Pointer Events 拖拽、点击与键盘替代操作、请求重试、金额校验、暂停恢复和学习记录接口。教师预览继续走预览接口；预览的等待文案是“正在核对”，暂停退出为“退出预览”，学生正式练习仍使用保存文案。

## 验证

- Codex 内置浏览器使用真实本地 API 的教师预览。
- 超市：商品拖入和拖回、键盘替代、清单核对、错误总价修改、沟通卡、付款、核对找零、完成反馈。
- 点餐和书包：渲染、物品选择、任务进度；提示、暂停和恢复可用。
- 视口：320×568、375×812、812×375、768×1024、1024×768、默认桌面 1280×720。
- 背景计算样式为 `cover`，检查的视口未出现横向溢出；手机图标及商品目标至少 44px。
- 原有游戏操作和教师预览边界测试共 9 项通过；生产构建通过。已有 ExcelJS 分块大小提示保留。
- 本地正式场景记录数量仍为 1，教师预览未新增正式记录。
- 这是本地验收版本，尚未发布到线上。

验收截图保存于 `.local/game-ui/`：`market-desktop.png`、`market-mobile.png`、`market-landscape.png`、`cafe-mobile.png` 和 `schoolbag-ipad.png`。
