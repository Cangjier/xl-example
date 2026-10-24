# HANDOFF — Stage 3m：async 箭头 / async function / 生成器 / 复杂 class 头 / 解构参数

分支 `feature/possible-statement-s3m`，基线 `feature/possible-statement` @ 4e74b689。只动形状层
（`statement-operator-body.xl.md`）、AST 收口（`statement-shape-ast.xl.md`）、路由（`statement-route-util.xl.md`）
与专用 cases；`core/`、`StatementBoundaryUtil.IsAsiBoundary`、legacy 构造器未改。

## 1. 新增支持

### 1.1 async 箭头（语句首与括号内）
- 路由 `DecideCommon`：`async` 只在**能确认为箭头**时进表达式壳——下一代码单元是 `function` → `Legacy`（声明）；
  是 `(` 且其后紧跟 `=>`、或标识符且其后紧跟 `=>` → `ShellPlainExpression`；决定性的单元还没到 → `None`（继续等，
  不可 `Reject`）；`async(x)` 调用、`async;` 等一律留 `Legacy`（保守，不扩大面）。
- 形状层：`ExpectOperator` 里 `async` 后跟标识符时不再置 `Closed`（原本会把它当成下一条语句的起点，导致表达式只建出
  `async` 一个根），而是收成第二操作数；`async (…)` 的 `call(async)` 在 `=>` 时原地收成**未解析参数表**；
  `StartArrow` 把 async 单元摘进参数的 `Raw`。AST 从 async 那格起调用 legacy `ParseAssign`（与 `async x => …` 同一条路）。
- cases：`s3m-async-arrow-ident`、`s3m-async-arrow-params`、`s3m-async-arrow-paren`、`s3m-async-arrow-default`。

### 1.2 async function 表达式
- 形状层：`function` 出现在 async 之后时继续 `StartDeclarationOperand`（原先会落到 `Fail`，括号内本体不完整 → 退成
  `params`），并把 async 标识符摘成函数节点的 `Data[0]`；AST 用 `builder.MakeKeywordLeaf(new AsyncKeywordShape(...), asyncIndex)`
  建 AsyncKeyword（与 legacy 同一工厂、同一位置），再 `ParseFunctionExpression(asyncKeyword, spanStart)`，区间从 async 起。
- cases：`s3m-async-function`、`s3m-async-function-named`、`s3m-async-generator`（`async function*`）。

### 1.3 生成器 / 复杂 class 头 / 解构·默认·rest 参数（无形状层新代码，补用例钉住）
- `function*`：`ExpectBody` 跳过 `*` 与头部，AST 由 legacy `ParseFunctionExpression` 整段建。
- class 头：`extends` / `static` 成员 / 泛型参数都被 `ExpectBody` 整格跳过，AST 由 legacy `ParseClassExpression` 建。
- 参数：括号内不是表达式时形状层只留未解析参数表（`params`），`=>` 后整段交给 legacy 箭头分支。
- cases：`s3m-generator-bare`、`s3m-generator-named`、`s3m-class-extends`、`s3m-class-extends-static`、
  `s3m-param-object`、`s3m-param-array`、`s3m-param-default`、`s3m-param-rest`。

## 2. 未覆盖（全部安全回退：Fail/Decline → legacy，或路由直接留 Legacy）
- **async 箭头带返回类型** `(async (a, b): number => a + b)`：形状树 Fail，declined 用例
  `s3m-declined-async-arrow-type` 钉住（`shapeAst=0`、`declined>0`、XML==legacy）。
- async 泛型箭头 `async <T>(x) => x`、语句首 `async(x)` 调用、`async;`：路由仍返回 `Legacy`。
- **class 泛型 + implements**（`class C<T> extends B implements I {}`）：legacy `ParseClassExpression` 自身抛
  「缺少标识符」，与本片形状层无关，故不接也不建用例。
- `yield` 复杂体、async 方法、声明位置的 `async function`：不在本片范围，仍由 legacy 建。
- 逗号表达式仍未接（另立任务）。
- 形状层 `StartArrow` 对 `async x`（无 `=>`）会把 x 收进同一表达式，AST 多根 → `Decline` → legacy；这是有意的安全回退。

## 3. 专用 cases（`op-ast-cases.json` group `ast-from-shapes`，新增 17 条）
每条断言：①壳路径 XML == 同源代码 legacy（`EnableShellExpressions=false`）XML 逐字节；②`StatementShapeAst.TotalShapeAst`
达到期望条数（未覆盖必须 `declined>0`）；③形状结构文本 == `ts.createSourceFile` 逐节点渲染（箭头/函数/类 TS 渲染不了，
用 `tsTexts: []` 显式声明）；④`counts` 直接数 `ArrowFunctionShape` / `FunctionExpressionShape` / `ClassExpressionShape` /
`AsyncKeywordShape`。

```
s3m-async-arrow-ident      s3m-async-arrow-params     s3m-async-arrow-paren
s3m-async-arrow-default    s3m-async-function         s3m-async-function-named
s3m-async-generator        s3m-generator-bare         s3m-generator-named
s3m-class-extends          s3m-class-extends-static   s3m-param-object
s3m-param-array            s3m-param-default          s3m-param-rest
s3m-declined-async-arrow-type (shapeAst=0, declined>0)
```

## 4. 全表读数（本分支实测）

| 门 | 读数 |
| --- | --- |
| xl_build（core+typescript, ts） | 887 written / 0 error（最后一次增量 1 written） |
| tsc -p tsconfig.json | 0 error |
| op-ast-proof（ast-from-shapes） | [op-ast-proof] group=ast-from-shapes cases=90 pass=90 fail=0 | 形状树接管计数已核 90 条、TS 逐节点已核 85 条、AST 数字叶子已核 8 条 |
| op-proof（operators-live） | [op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条 |
| harness --group=operators-live | 40 pass / 0 fail |
| harness --group=dev | [statement-possible] groups run=1 skipped=0 | cases pass=22 fail=0 skip=0 known=0 uncovered=0 |
| harness --all | [statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0 |
| harness --double-accept | [statement-possible] double-accept: cases=120 failed=0 |
| harness --lint | [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| validate | 1720 条用例，0 条不合格 |
| ast-json（四步严格） | total cases=6167 cj-ok=6167 cj-fail=0（47 个构造）；重生成后 status 空；diff 合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条 |
| token-ast | non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10) |
| real-dts | 真实 .d.ts 全量解析成功且 AST 逐节点一致 |
| feas-operator | 6/6 |
| insert-between | 9/9 |
| perf | [perf] long n=300 median=5.57ms tokens=599 candidateCalls=34 callsPerToken=0.06; [perf] many statements=2000 median=37.45ms tokens=2000 candidateCalls=34017 callsPerToken=17.01; [perf] scale n=100 median=0.76ms tokens=199 candidateCalls=34; [perf] scale n=200 median=1.52ms tokens=399 candidateCalls=34; [perf] scale n=400 median=3.33ms tokens=799 candidateCalls=34; [perf] scale ratio(200/100)=1.99 ratio(400/200)=2.19（线性≈2.0；>2.5 视为退化告警，不判失败） |

## 5. 风险
1. **async 路由的换行盲区**：判据只看代码单元，`async\n(x) => …` 按 TS 的 ASI 是两条语句，这里会判成箭头；形状层随后可能
   建出跨行箭头。全表 ast-json 未暴露该形态，但若后续出现需在 `DecideCommon` 用 `HasLineBreak` 收窄。
2. **把 `async` 后的标识符收进表达式**是新增的宽松点；没有 `=>` 时靠 AST 多根 `Decline` 回退，不会静默建错树，但会让
   「`async` 单独成句 + 下一条表达式以标识符开头」这类边缘源码先建一棵被拒绝的树（可观测为 `declined`）。
3. **AsyncKeywordShape 经由 `builder.MakeKeywordLeaf` 建**，与 legacy `ParseAssign` 的 async function 分支同工厂；若该工厂
   的位置参数语义变化，这里要同步。
4. 形状层把 async 单元放在 `KindFunction.Data[0]` 里只是为了交给 AST（`KindFunction` 的 Render 固定返回 `function`）；
   后续若有人按 `Data` 解释函数节点，需要知道这条约定。
5. class 的 `ExpectBody` 仍然只靠「第一个 `{` 是体」——装饰器 / 类字段初始化里的对象字面量若进入头部会重新成为风险点。