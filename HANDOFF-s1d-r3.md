# HANDOFF — T1d r3：stage1 全绿、开关仍为 false（AST 门未回到基线）

分支 `feature/possible-statement-s1d`（本目录 r3），起点 `c434d5b7`（r2）。

## 1. r2 高置信假设的验证结果（重要：只对了一半）

r2 假设「`ExpressionEndCode` 拿 code-only 数组调 `IsAsiBoundary`，数组元素与下标基准不同 → 两个方向同时判错」。
**实测：基准不同是真的，但它不是 stage1-mixed 的根因。**

- `IsAsiBoundary` 的换行判据走 `LineTerminator.HasBefore`（按**源位置**扫 `SourceRange` 之间的原文），
  在 code-only 数组上也能判出换行；`prev` / `head` 回走也都被 `ItemStart`/数组首元素界定，
  所以 r2 的 code-only 调用在 stage1-mixed 上**并不会**判错。
- 真正的根因（用 monkeypatch 打印 `Decide` / `ExpressionEndCode` 实证，见 §2）：
  **上一条语句的壳在 ASI 边界收口时，边界那一格正是下一条语句的首代码单元**，它随 `FinishShell`
  被搬回父单元，而父目录**只在令牌到达时求值一次**（`common.js:163` → `CatalogGuide.ComputePossibleShapes`），
  因此该条目**从未在头格被求值**；下一格（`let a = 1` ⏎ `f();` 的 `(`）求值时 `tokenIndex > headAt`，
  旧实现直接 `Reject`（`root-expression-statement-possible-shape.xl.md` 的「只在首代码单元那一格 Accept」），
  于是整条表达式语句没有壳，拖到 EOF 由 `SourceFileEndPossibleShape.BuildTrailingDeclaration` 兜底 →
  `ExpressionStatementShape.FromUnits` 抛「表达式语句没有读完」（`expression-statement-shape.xl.md:71`）。
  证据：该源码下 `ExpressionEndCode` 一次都没被调用（壳没建）；`Decide` 只在 idx=3 被调、返回 1。

## 2. 本次改动（相对 c434d5b7）

1. `statement-end-possible-shape.xl.md`
   - `ExpressionEndCode` 签名改为 `(units:Array<Token>, codeAt:Array<int>, atEof:bool)`：
     **判界基准回到 `host.Data`**（含 trivia），返回**壳 `Data` 下标**；ASI 用 `IsAsiBoundary(units, lastAt)`，
     `;` 用 `IsSemicolon(units[lastAt])`，结果一律经 `CodeAt` 折算。与 legacy 调用点同基、同下标，
     不再混用两套下标（这是 r2 留下的真实缺陷，虽非 stage1 根因，但保留是对的）。
   - `ComputeByIndex` 只在「当前单元本身是代码」时判界（trivia 到达时不再把上一条代码单元当新句起点）。
   - `BuildByIndex` 直接用 `ExpressionEndCode` 给的壳下标，不再二次折算。
2. `root-expression-statement-possible-shape.xl.md`
   - **头格被吞掉时的补建**：`tokenIndex > headAt` 且 `CanEndStatement(...)` 为假（不是 `;` / EOF / ASI）时
     也 `Accept`，`BuildByIndex` 把 `[start..tokenIndex]` 搬进壳，并补一次 `shell.ComputePossibleShapes(context)`
     （与 `ImportDeclarationPossibleShape` 的「壳晚建」同一手法）。
     `CanEndStatement` 为真的格仍 `Reject`：那一格要收的是上一条语句，两候选同格 Accept 会撞 CatalogGuide。
3. `statement-route-util.xl.md`：`EnableShellExpressions` **最终值 = false**（熔断），文档写明 §3 的读数。

## 3. 每道门的读数

`true`（本次改动后，`xl_build` 884/0 error、`tsc` 0）：

| 门 | 读数 | 基线 |
| --- | --- | --- |
| harness `--group=stage1` | **12/0**（stage1-mixed 绿） | 12/0 |
| harness `--all` | **72 pass / 0 fail / 1 known**（satisfies 已知基线缺陷） | 同 |
| harness `--double-accept` | 冲突 **0**，91 用例 0 失败 | 0 |
| harness `--lint` | **PASS** | PASS |
| ast-json | **6037/6167**，130 条结构差（0 位置差 / 0 字段差） | 6167/6167 |
| ast-json-diff | **0/0/0** | 0/0/0 |
| token-ast | ok=**1692** crash=**14** ts-invalid=10 | 1706 / 0 / 10 |
| real-dts | **226/226** | 226/226 |

失败分布（`true`）：`missing-end` 24（与 r2 相同）、`possible-compute` 49（r2 61）、`dts-recovery` 7、
其余零星（`gaps-r1231` 1、`gaps-types` 2、`declarations` 1、`asi-import-boundary` 1、`async-arrows` 1 …）。
即：本次把 possible-compute 收了 12 例、ast-json +26 例，**但 missing-end 24 一例未动**。

`false`（最终提交状态，与 Wave1 基线逐位相同）：
`validate` 1720/0、`ast-json` **6167/6167**、`ast-json-diff` **0/0/0**、
`token-ast` **1706 ok / 0 crash / 10 ts-invalid**、`real-dts` **226/226**、
`harness --all` 72/0/1known、`--double-accept` 0、`--lint` PASS、feas 6/6、insert-between 9/9、
`perf` 无退化（scale ratio 0.68 / 1.90，线性≈2.0；2000 语句 median 20.29ms）。

## 4. 剩余根因（下一任的起点）

1. **`missing-end` 24 例完全没动**：`typescript/cases/…/missing-end` 那组专测「没有 `;` 的语句怎么收口」。
   `StatementEndPossibleShape.ExpressionEndCode`（`statement-end-possible-shape.xl.md:165-210`）里
   `atEof` 一支只处理「文件末尾」，但 `missing-end` 的形态是**条目末尾 / 块末尾**（`{ a = 1 }`、`{ a\n}`），
   那里 `StatementScanner.AtEOF` 为 false 且 `IsAsiBoundary` 也可能为 false → `End` 永远 -1。
   建议：把「本层没有后续单元」也当成收口（`StatementScanner` 的 `AtEOF` 语义在块里是 `code.length` 到顶，
   见 `statement-scanner.xl.md:436/480/745/766` 的 `AtEOF && code.length > 0` 各支），而不是只看文件末尾。
2. **`possible-compute` 49 例**：该组直接对拍候选的 `ComputeByIndex` 逐格结果。补建分支让「本该 Waiting 的格」变成
   `Accept`，会改变部分格子的期望值；需要按组内用例逐条校准（`Accept` 的条件是否该再收窄到
   「当前单元是延续符/操作符」而不是「任何非 `;`/EOF/ASI 的格」）。
3. **`token-ast` 14 个 crash**：仍与 `BuildFromShell` 抛错后 `DetachShell` 兜底同源
   （`statement-shape.xl.md:107-141`），但具体壳待按崩溃栈定位（r3 未做）。
4. `dts-recovery` 7 例：`.d.ts` 恢复路径里表达式语句与 `declare` 的边界，未定位。

## 5. 下一步（建议顺序）

1. 先修 §4.1（块内 / 条目末尾的收口），它最可能是 missing-end 24 + token-ast 若干 crash 的共同原因；
   修完立刻跑四道 AST 门。
2. 再按 §4.2 收窄补建条件（先试「当前单元是延续符 / 操作符 / 开括号」），跑 `possible-compute`。
3. 四道 AST 门全绿后，再单独一个 commit 把 `EnableShellExpressions` 置 true（本次已把该行留成 false）。
4. 调试手法（本次用过，可复用）：临时 untracked `.cjs` 脚本，`require('build/ts/...')` 后 patch
   `StatementRouteUtil.Decide` / `StatementEndPossibleShape.ExpressionEndCode` 打印入参出参；
   注意 `ExpressionEndCode` 是**静态方法**，patch `endMod.StatementEndPossibleShape.ExpressionEndCode` 有效。
