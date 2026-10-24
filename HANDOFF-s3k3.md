# HANDOFF s3k-3：import.meta / 动态 import 路由接通

分支 `feature/possible-statement-s3k3`　基线 `92581fe6`　本文写在 92581fe6 之上。
本轮**没有** merge s3k2 的旧基线分支，只按它的定位结论在 92581fe6 上重放必要改动。

## 1. 根因（打点证据）与修法

### 1.1 s3k2 的假设不成立

`ImportDeclarationPossibleShape.ComputeByIndex` 首格对 `import` 返回的是 `Uncertain`（`Stage = 1`），
**不是** `Accept`；它对 `import` + `.` / `(` 也已经返回 `Reject`（`Stage = 3`，基线里那段注释就是为
`import.meta` 写的）。所以「首格先 Accept」不是卡点，`declined = 0` 也不是「拒绝」，而是**壳一次都没建**。

### 1.2 真正的首格死锁

两条一起成立才死：

1. `StatementRouteUtil.DecideCommon` 把 `import` 无条件判成 `Legacy`（`IsLegacyKeyword` 里有 `import`）；
2. `RootExpressionStatementPossibleShape.ComputeByIndex` 在**首代码单元那一格**对任何非
   `ShellPlainExpression` 一律 `Reject`，而 `CatalogGuide` 的 `Reject` 是**永久删除**——等到 `.` / `(`
   那一格，根本已经没有候选还能建壳。

这也解释了 s3k2 两次实验（`DecideCommon` 加前瞻 / 对 `import` 一律 `ShellPlainExpression`）都没反应：
它们改的是第二格才生效的判据，而候选在第一格就被删了。

### 1.3 修法（两格判据，不靠候选先后）

| 文件 | 改动 |
| --- | --- |
| `statement-route-util.xl.md` | `DecideCommon` 里 `import` 先看**下一个代码单元**：还没到 → `None`（继续等）；`(` 或 `.` → `ShellPlainExpression`；其余（`a` / `{` / `*` / `"m"` / `type`）→ `Legacy`。整段只在 `EnableShellExpressions` 为真时生效，开关关掉逐位回到 legacy |
| `root-expression-statement-possible-shape.xl.md` | 首格与「晚建」两处的 `Reject` 前加 `None → Uncertain`，让候选活到 `.` / `(` 那一格；晚建路径把 `import` + 那一格一起搬进壳（r3 就有的通道，一行没改） |
| `statement-operator-body.xl.md` | 新 `KindImportKeyword = 23`：`import` 只吃一格建关键字叶子，`.` / `(` 交给**普通成员 / 调用后缀**；`IsBareImport` 判据不变、只收窄文档（它本来就只挡 `KindIdentifier` 的 `import`） |
| `statement-shape-ast.xl.md` | 新 `KindImportKeyword` → `ImportKeywordShape` 叶子（`SpanLeaf`）；`KindMember` 分支里当基底是 `KindImportKeyword` 且名字是 `meta` 时改写成 `MetaPropertyShape`（children 只有 `identifier(meta)`，`import` 与 `.` 只进区间），与 legacy `ParsePrimary` 的 import 分支同源。三格一起进 `covered` |

**为什么不用 s3k2 的 `KindMetaProperty` / `Dot` / `Meta`**：那套要在 `BuildOperand` 里做两格向前看，
而壳可以在任何一格建起来（`StatementShape.Add` 每加一格都会 `IngestAll`）——壳在 `import` 那一格建时，
后面两格还不存在，向前看必然失败。逐格接后缀与建壳时机无关，所以只需要一个 Kind，且没有不可达代码。

## 2. import.meta / 动态 import 结果（`tests/statement-possible/import-expression-cases.mjs`，9/9）

```
import-meta          import.meta;              shapeAst=1 texts=["member(import,meta)"]            AST: MetaPropertyShape
import-meta-url      import.meta.url;          shapeAst=1 texts=["member(member(import,meta),url)"] AST: MetaProperty + PropertyAccess
import-dynamic       import("x");              shapeAst=1 texts=["call(import)"]                  AST: ImportKeyword + Call
import-dynamic-then  import("x").then;         shapeAst=1 texts=["member(call(import),then)"]     AST: ImportKeyword + Call + PropertyAccess
import-meta-then-call import.meta.url.length;  shapeAst=1
import-decl-default  import x from "y";        shapeAst=0（控制组：声明仍走 legacy）
import-decl-named    import { a } from "m";    shapeAst=0
import-decl-side-effect import "m";            shapeAst=0
import-decl-mixed    两条同文件                  shapeAst=1，声明 0 变化
```

每条用例都断言：`shapeAst >= 1`（表达式组）、`fallback == false`、**XML == legacy 逐字节**、TS 表达式
种类与期望一致（`MetaProperty` / `CallExpression` / `PropertyAccessExpression`）、AST 里出现
`MetaPropertyShape` / `ImportKeywordShape`。声明组断言 `shapeAst == 0` 且 XML == legacy。
（AST 与 TS 的逐节点等价另由全表 `ast-json` 6167/6167 + `ast-json-diff` 0/0/0 守住：XML == legacy
且 legacy 与 TS 完全一致，所以本组不重复造一套 AST 对拍。）

`comma-import-fallback.mjs` 的 import 组读数已从「回退契约」变成「已接管」：
`import-meta` shapeTexts `member(import,meta)`、`import-dynamic` `call(import)`，用例仍 11/11。

## 3. 逗号运算符：结论（**未实现**，交计划）

按 HANDOFF-s3k §3 的结论不变：节点名不是障碍（`constructor.name.replace("Shape","")`），**障碍是树本身**——
legacy `ExpressionBuilder.ParseExpression` 对 `,` 建左结合嵌套的 `BinaryExpressionShape`，而 TS 是**一个**
`SequenceExpression` 带 N 个 children。只在形状层建 `SequenceExpression` 会让壳路径 XML != legacy 路径
（`comma-import-fallback` 的逐字节断言立刻红），所以必须**原子改 legacy + fixtures**：

1. `typescript/tokens/expressions/sequence-expression-shape.xl.md`（新）：
   `class SequenceExpressionShape extends ShapeToken`，无自有字段（children 即 `expressions`）。
2. `expression-builder.xl.md` `ParseExpression`：循环里**累积**操作数数组，末尾长度 > 1 时建**一个**
   `SequenceExpressionShape`（children 按源码顺序 `Add`，`SpanNode(shape, start, At - 1)`）；`a,b,c` 必须
   是一个节点三个 children，不是嵌套。
3. `statement-operator-body.xl.md` `ExpectOperator` 分支显式加 `,`（`OperatorTable` 不把它当二元运算符），
   新 `KindSequence`，`Data` 是摊平后的操作数列表。
4. `statement-shape-ast.xl.md`：`KindSequence` → `SequenceExpressionShape`，`SpanNode(首单元, 末单元)`。
5. `Render` / 结构文本：加 `seq(a,b,c)` 形态，op 组的期望文本同步更新。

验证顺序（不可回退）：先只改 legacy 并单独跑 `ast-json`（`git status` 应只有含逗号表达式的用例变化，
条数应等于语料里逗号表达式语句数）→ `ast-json-diff` 确认归零 → 重生快照并提交（fixtures 变更）→
再改形状层 → `comma-import-fallback` 的 `comma-*` 从「回退契约」组改成「已接管」组 → 四步 ast-json 严格复跑。

本轮预算用尽，只交计划，legacy 一行未动（`comma-*` 仍 shapeAst=0 / declined=1，行为与基线逐位一致）。

## 4. 全表读数（本分支实测，四步 ast-json 严格）

```
xl_build                   887 written / 0 error（2510 warning，与基线同）
xl_check                   887 files / 0 error / 2510 warning
tsc                        exit=0
import-expression-cases    cases=9  pass=9  fail=0
op-ast-proof               cases=62 pass=62 fail=0（形状树接管 62 / TS 逐节点 62 / AST 数字叶子 8）
op-proof                   cases=40 pass=40 fail=0（结构文本 40 / InsertBetween 38）
operators-live             pass=40 fail=0 skip=0 uncovered=0，file-fallback total=0 distinct=0
dev                        pass=22 fail=0 skip=0 uncovered=0，file-fallback total=4 distinct=2（与基线同）
comma-import-fallback      cases=11 pass=11 fail=0（import 组已 shapeAst=1，comma 组仍回退契约）
harness --all              pass=101 fail=0 known=1 skip=0，file-fallback total=0 distinct=0
harness --double-accept    冲突 0，cases=120 failed=0
harness --lint             PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）
validate                   1720 条用例，0 条不合格
ast-json                   total 6167 cj-ok=6167 cj-fail=0；git status --short typescript/cases 为空
ast-json-diff              6167 条：完全一致 6167 / 6167；结构差 0、位置差 0、字段差 0
token-ast                  total=1716 ok=1706 crash=0 diff=0 ts-invalid=10，known-gap 0
real-dts                   226 文件：解析成功 226、崩溃 0、AST 完全一致 226
feas-operator              cases=6 pass=6 fail=0
insert-between             tests=9 pass=9 fail=0
perf                       many statements=2000 median=31.33ms tokens=2000 candidateCalls=34017（17.01/token）
                           scale ratio(200/100)=2.21 ratio(400/200)=2.24（线性≈2.0，无退化告警）
```

## 5. 未覆盖清单 / 风险

- **逗号运算符**仍走 legacy `BinaryExpression`，与 TS 的 `SequenceExpression` 是真实结构差，只由 gate 与
  `comma-import-fallback` 的回退契约钉住；本轮未改。
- `import.meta` / `import()` 只在**根表达式语句**与块内表达式语句里验证（块内走同一套表达式壳，但没有
  专用用例）；`import.meta` 在非语句位置（`const x = import.meta`、参数里）仍由 legacy 建，不在接管范围。
- 非法形态（`import.foo`、`import()` 空实参语法本身）由 `KindMember` 的 `meta` 判据 / 形状层 `Fail` 回退
  legacy，不建错树；没有为它们写专用用例。
- `KindImportKeyword = 23` 是新增 Kind，`KindMetaProperty`（s3k2 的 23/24 死代码）**没有重放**，
  本分支不存在不可达分支。
- 路由改动会影响所有以 `import` 开头的条目：首格由「立即 Reject」变成「等一格」。全表 6167 + 226 + 1716
  用例与 `--double-accept` 冲突 0 是它的回归证据；perf 的 candidateCalls/token 未见上升（17.01）。
- 风险点：`import` 后紧跟换行的 `(` 仍判表达式（与 TS 一致）；`import` 后紧跟 `?.`（非法）会判 `Legacy`
  回 legacy，与基线相同。