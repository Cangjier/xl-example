# dependencies
```xl
```

# namespace cangjie

# class StatementLegacyMetrics

**legacy 退场的静态计数器**（Stage 5d-1a，零行为变化）：只加静态 `int` 字段与自增，**不读任何状态、不改任何分支、
不改任何顺序**——每个字段都只是「这件事发生了」的进程内累计值，供 `tests/statement-possible/legacy-retirement.mjs`
逐文件 Reset → Parse → 读数。

四个字段各自钉住一条退场判据（定义见 `docs/possible-statement-5d-plan.md`）：

| 字段 | 含义 | 目标 |
| --- | --- | --- |
| `LegacyStatementDispatchCount` | 语句壳收口时**真的**走了 `StatementBuilder.BuildStatement()` 整段 raw 分派建树（`StatementShape.BuildFromShell` 的 fallback 分支） | 0 |
| `ScanRootCallCount` | `StatementScanner.ScanRoot` 被调用的次数（入口自增；判界仍由它回答的族每格都会 +1） | 0（默认解析；仅文件级 fallback / 关开关时允许 > 0） |
| `RawTailBuildCount` | 块体里**逐条 raw 尾巴**被 `Load` + `BuildStatement()` 建树的次数（`BuildBlock` 的整段 raw 递归与 `CollectBodyStatements` 的 raw 段各算一条） | 0 |
| `ShapeAstDeclinedCount` | 表达式语句**本该**由形状树建 AST、实际拒绝了（`StatementShapeAst.Decline` / 形状路径抛错）的次数 | 0 |

**为什么 `ShapeAstDeclinedCount` 的计数点不在 `StatementShapeAst.Decline` 里**：`Decline` 在 `statement-shape-ast.xl.md`，
本阶段的可改文件面不含它；而所有「表达式语句由形状树建 AST」的尝试**只有一个入口**——`StatementShape.BuildFromShell`
里 `builder.BuildExpressionStatementFromShapes(shell.OperatorBody)` 那一处，拒绝与抛错都会让 `built` 停在 `null`。
把计数放在那次尝试对应的 fallback 分支上，计的是「整条表达式语句拒绝形状树」的**次数**（一次尝试至多 +1），
与 `StatementShapeAst.TotalDeclined` 的差值**语义一致但更严格**：形状路径抛错时 `TotalDeclined` 不动，这里仍会 +1。
探针同时记录两者作为交叉校验（见 `legacy-baseline.json` 的 `shapeAstDeclined` / `totalDeclined`）。

**Reset 的理由**：探针逐文件读指标，必须在 Parse 之前把四个字段清零；Parse 自身不改这些字段，所以清零后的读数
就是该文件自己的贡献。生产路径从不调用 `Reset`。

## static field LegacyStatementDispatchCount:int = 0

语句壳收口退回 legacy「整段 raw 分派建树」的次数（`StatementShape.BuildFromShell`：形状树 / 三层 possible 都没接住时）。

## static field ScanRootCallCount:int = 0

`StatementScanner.ScanRoot` 的调用次数（入口自增；含变量族判界、根 legacy 候选、EOF 兜底三条路）。

## static field RawTailBuildCount:int = 0

块体内 raw 尾巴逐条建树的次数（`StatementBuilder.BuildBlock` 的整段 raw 递归 + `CollectBodyStatements` 的两段 raw）。

## static field ShapeAstDeclinedCount:int = 0

表达式语句拒绝「由形状树建 AST」的次数（`BuildFromShell` 里形状路径返回 `null` 或抛错，随后退回 legacy 表达式重解析）。

## static method Reset:()=>void

把四个计数清零（探针在每个文件 Parse 之前调用；纯赋值，无副作用）。

```ts
StatementLegacyMetrics.LegacyStatementDispatchCount = 0;
StatementLegacyMetrics.ScanRootCallCount = 0;
StatementLegacyMetrics.RawTailBuildCount = 0;
StatementLegacyMetrics.ShapeAstDeclinedCount = 0;
```
