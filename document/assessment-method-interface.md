# 评估方法接口

评估中心、学生档案、教学目标和复测共用一个评估服务。PEAK 是当前唯一正式注册的方法；测试中的观察法仅验证扩展能力，不会出现在正式系统。

## 方法的职责

`assessment_methods.go` 定义 `AssessmentMethod`：

| 接口 | 方法负责的内容 |
| --- | --- |
| `Info()` | 稳定的 methodId、名称、当前版本、支持版本、展示组件、目标关联与对比能力 |
| `Definition(version)` | 指定版本的模块、项目、材料、教师提示与分值展示 |
| `Repository()` | 方法范围内的记录与反应存储，可复用 SQLAssessmentRepository |
| `ValidateResponse(record, response)` | 当前记录版本的分值或结构化观察规则 |
| `ValidateCompletion(record, responses)` | 本方法的完成条件，不强制统一项目数 |
| `Compare(record, before, after)` | 按基线版本解释原始反应变化，不由公共页面猜测 |

公共服务负责权限、学生身份、项目所属模块、版本一致性、事务、完成锁定与数据格式校验。`score` 是可空数值：0、小数与未记录分别保存；非数值方法可使用 `values` 存结构化观察。未评项目是没有反应记录，不自动补 0。

`scoring.options` 提供分值名称，也可声明 min/max/step。`reviewValues` 可选，用于档案的默认待跟进项目筛选；公共页面不把 0 自动解释为未通过。

## 统一 API

全部接口沿用现有认证和 assessment_history 模块权限，以及 `{code,message,data}` 返回格式。

| 操作 | 路径 |
| --- | --- |
| 已注册的方法 | GET `/api/assessments/methods` |
| 学生的跨方法历史 | GET `/api/assessments/records?studentId=...` |
| 版本材料定义 | GET `/api/assessments/methods/:method/catalog?version=...` |
| 列表 / 创建 | GET / POST `/api/assessments/methods/:method/records` |
| 一条记录 | GET `/api/assessments/methods/:method/records/:id` |
| 反应列表 / 保存 | GET / POST `/api/assessments/methods/:method/records/:id/responses` |
| 完成复核 | POST `/api/assessments/methods/:method/records/:id/complete` |

创建参数为 `{studentId,module,version}`，version 省略时用当前版本。记录一旦创建就固定版本，保存与复测不会换用新版规则。未知方法或版本会明确报错。学生列表强制限定本人；教师提示和专用材料定义不会通过学生材料接口返回；学生不能创建、评分或完成评估。

记录身份是 `(methodId,id)`，反应身份是 `(methodId,assessmentId,code)`。前端选项和跳转都携带 methodId，切换方法清除旧方法的 assessmentId。目标确认同样提交 methodId，复测固定同学生、方法、模块、版本。

## 接入新方法

1. 获得实际使用的正式材料、评分说明及版本，定义模块和项目，不从其他方法推导评分规则。
2. 新建方法适配文件，实现 AssessmentMethod；在该文件的 init 中调用 `assessmentMethods.Register(...)`。公共服务、权限和路由无需重写。
3. 普通数值记录可使用 `renderer: "numeric"`，已有通用材料展示、教师记录、学生展示与完成复核界面。定性观察、计时、特殊操作或不同题型需实现专用 Vue 展示组件，并加入 `web/src/lib/assessmentWorkspaces.ts` 的本地组件映射。
4. 未绑定的专用 renderer 会只读展示已有记录，不能创建、评分或完成。服务端不能指定任意远程组件。
5. 通过方法特有的分值、完成条件、版本兼容、学生权限和复测测试，再正式注册上线。

评估项目与训练题库保持独立。评估发现经老师确认后关联教学目标，老师再从该目标的训练题库选题布置；不会把正式评估材料直接复制成作业。

## PEAK 兼容与数据迁移

`assessment_peak_adapter.go` 对接原 `peak_assessments` / `peak_scores`，没有复制历史记录或修改既有 ID、分值和版本。原 `/api/assessments/peak` 写接口委托统一服务，旧读接口仍可使用。PEAK 的 0/1、D/G 各 64 项与完成只读规则放在 PEAK 适配器中。

新方法可使用新增 `assessment_records` / `assessment_responses` 表。教学计划增补 method_id，旧计划仅补为 peak，原关联与其他业务数据保留。VB-MAPP 历史档案保持独立，没有将其当成 PEAK，也没有宣称已接入可新建的 VB-MAPP 方法。

## 验证

- `go test ./...`：包含第二种仅测试方法，覆盖 0.5 分、不同完成条件、相同 ID 跨方法隔离、固定旧版复测、方法专属对比、角色限制与 PEAK 旧接口兼容。
- `go vet ./...`。
- `cd web && npm test && npm run build`：方法切换、未知方法、非二元档案、通用图片展示、学生只读、完成错误反馈与原 PEAK 组件回归。
- 本地实际 API：D/G 各 64 项，以及档案 → 目标 → 题目 → 作业 → 学生提交 → 复测 → 对比流程。

浏览器控制连接超时，因此上述验证不包含本次实际浏览器点击或视口视觉验收。

## 本次交付记录（2026-10-09）

- Go 测试与 vet 通过；前端 18 个测试文件、69 项测试通过，生产构建通过。
- 本地 D/G 统一接口与完整教学跟进流程通过。
- 已部署至 `https://go.ylmz.com.cn/#/assessment`。三种角色的评估与教学计划接口权限均完成线上只读验证。
- 线上 72 个 HTML/JS/CSS 文件与本地构建哈希一致；后台进程正常运行。
- PEAK、VB-MAPP、教学计划及其他既有业务行数未变；PEAK 仍使用原存储表，未产生重复记录；教学计划方法标识补齐。
- 备份：`/data/backups/testogo-20261009-164547`。
- 后端 SHA256：`0217bf8c1fe212ebcba595f435c3b24e4eabc5bd2fadb5019de28bf93f4fd257`。
- 本次没有完成实际浏览器点击和视觉检查，浏览器控制连接仍超时。
