# T5e `source:PossibleSource` 第 4 形参 —— bindings / literals / members / files

- 集成分支：`feature/all-possible-1027` @ `c1e64c03`
- 工作分支：`feature/all-possible-1027-t5e`
- 工作副本：`xl-example-set/all-possible-1027-t5e`
- 范围：只做机械签名迁移，**不改行为**。未跑 gates / wide-ast / tts / ts-all；未 push。
- 前置契约（T1/T2 已落地）：`PossibleShape.ComputeByIndex` 与 `Compute` 的尾参为**必填** `source:PossibleSource`，
  基类 `Compute` 原样转给 `ComputeByIndex`。因此候选侧的机械动作 = 加 import + 第 4 形参。

## 1. 改动文件（6 改 / 0 新增）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/bindings/array-binding-pattern-possible-shape.xl.md` | 加 `PossibleSource` import；`ComputeByIndex` 加第 4 形参 |
| `typescript/tokens/bindings/binding-element-possible-shape.xl.md` | 同上 |
| `typescript/tokens/bindings/object-binding-pattern-possible-shape.xl.md` | 同上 |
| `typescript/tokens/literals/string-literal-possible-shape.xl.md` | 同上 |
| `typescript/tokens/members/enum-member-possible-shape.xl.md` | 同上 |
| `typescript/tokens/files/source-file-end-possible-shape.xl.md` | 同上 |

每文件净改动 `+2 / -1`（import 1 行 + 方法头 1 行），`git diff --stat` 合计 `6 files changed, 12 insertions(+), 6 deletions(-)`。
全部文件 **UTF-8 无 BOM、LF**（写入后逐文件复核首三字节与 CR 数：`bom=False cr=0`）。

## 2. 统计

| 指标 | 数 |
|---|---|
| 四目录 `*-possible-shape.xl.md` 候选文件 | 6 |
| 其中含 `ComputeByIndex` 的候选 | 6 |
| 已加 `source:PossibleSource` | 6（100%） |
| `Compute` 覆写 | 0（这 6 个类都没有覆写基类 `Compute`，故无需处理） |
| 转调（需透传 `source`） | 0（6 个 `ComputeByIndex` 体里都不再调用别的候选，形参按 TS 少用规则保持未用，行为不变） |

## 3. 验收

| 项 | 结果 |
|---|---|
| `xl_build`（`paths=["core","typescript"], targets=["ts"]`） | **0 error**；6 written / 632 skipped；3 warning 均为基线既有的 `E1107` 重复声明（get/index/set accessor，非本次引入） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| `node tmp/target-cases.mjs` | `cases=30 ok=29 moved=0 diff=0 error=0 fallback=1`（与基线逐字一致） |
| 四目录 grep `source:PossibleSource` | bindings 3、literals 1、members 2、files 1，全部命中 |
| 产物签名 | 6 个 `dist/ts/**/*-possible-shape.ts` 的 `ComputeByIndex(... cache: PossibleShapeCache, source: PossibleSource)` 均已生成 |

基线（改动前，同一工作副本）复核为同一组读数：`xl_build` 0 error / 3 warning、`tsc` exit 0、`29 ok / 1 fallback / 0 diff / 0 error`。

## 4. 说明

- `typescript/tokens/members/enum-member-shape.xl.md` 的 `ComputePossibleShapes(..., source:PossibleSource)` 是**改动前既有**的 Shape 入口签名（不是候选 `ComputeByIndex`），本次未触碰。
- 未触碰 `statements/`、`declarations/`、`types/`、`expressions/`。
- 未跑 gates；`_reports/T5e.md` 与 6 个源文件同一提交进 `feature/all-possible-1027-t5e`。
