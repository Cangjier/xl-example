# HANDOFF — Stage 4s（switch case 体接管 + 块内函数体收集）

分支 eature/possible-statement-s4s，基线 eature/possible-statement @ 64cb87ef。

## 0. 完成度

| 目标 | 状态 | 证据 |
| --- | --- | --- |
| 1. switch case 体接管 | **完成**（EnableSwitchCaseBody = true） | case 1: { let y = 1; } → BlockBodyStatementCount +1、SwitchCaseBodyMountCount +1、fallback 0；case a + 1: / case foo(): / case a ? b : c: 表达式不受影响；stage4p 25/25、stage4s 20 条全绿 |
| 2. 块内函数体收集 | **完成**（EnableBlockFunctionBody = true） | { function f(){ let x = 1; } } → body **+1**（4p 是 +0）、mount +1；{ function g(){ a; b; } } → body 2；XML/AST 零差异 |
| 3. 专用 cases | **完成** | switch-case-cases.json 新增组 stage4s（20 条：case 表达式 4 / case 体块·控制流·try·嵌套 6 / 块内函数体 6 / 冒名 4）；control-flow-body-takeover.mjs 计数门 31→39 条 |
| 4. 集成收敛 | **全表绿** | 见 §4；ast-json 6167/6167 且 git status typescript/cases 为空 |
| 5. 生产代码回退 | 不适用 | 两个修复都已验证并默认开 |

## 1. switch case 体：根因与修法（Stage 4p 的失败点 1）

**根因：挂错了括号。** BlockPossibleShape.OnChildBracketCreated 里 const body = parent as Bracket（宿主括号），
4p 的两个新分支都调用 MountBodyCatalog(body)：

- case 分支把块体目录挂到了 **switch 的 case 块括号**上 → 目录里的表达式/语句候选把整段 case <表达式>: 当
  语句建壳。case 1: 的壳在收口时取到未 SignIn 的区间 → 抛 SourceRange is not set；
  case 1: {} 更早，ParsePrimary 在 { 上抛 不支持的表达式起点。default: 没有表达式，故不抛。
- 抛错被 SourceFileRunner.Parse 的文件级 fallback 接住 → 整条文件重解析（XML/AST 仍对，但 fallback≠0），
  4p 因此把开关默认关。

**修法（最小）**：两个分支都改成挂**体括号自己**，并加 CatalogGuide === null 幂等门：

`	s
const caseBody = bracket as Bracket;
if (caseBody.CatalogGuide === null) {
  BlockPossibleShape.MountBodyCatalog(caseBody);
  BlockPossibleShape.SwitchCaseBodyMountCount += 1;
}
`

挂对之后 switch 的 case 块括号保持纯 raw，BuildCaseBlock 仍按 case / default 切段、
BuildExpressionRange(inner.At, colonAt - 1) 建子句表达式（case 1:、case a + 1:、case foo():、
三元 case a ? b : c: 全部保持原路径）；子句体 { 由 inner.BuildStatement() → BuildBlock() →
HasBuiltBodyStatements / CollectBodyStatements 收集体内语句。CaseBlockShape / CaseClauseShape
一行未改。

**反证（4p 的抛错表在新代码上的读数）**：case 1: / case a: / 空体 / 体内 if 全部不再抛，
stage4p 25 条 XML==legacy、AST==TS、fallback 0；stage4s 的 4 条 case 表达式 + 6 条 case 体块用例同样全绿。

## 2. 块内函数体：根因与修法（Stage 4p 的失败点 2）

**根因同一类：挂错括号。** IsFunctionDeclarationBody(parent, bracket) 判定正确（unction 那一格），
但随后 MountBodyCatalog(body) 挂到了**外层块括号**：

- 外层块括号本来已有块体目录，这次 MountBodyCatalog 把它**整个覆盖**掉（新 CatalogGuide 覆盖旧的）；
- 函数体括号仍是纯 raw，BuildFunctionDeclaration → BuildBlock() 的
  HasBuiltBodyStatements(bodyBracket) 永远为 false → 走 legacy 递归；
- 于是 4p 读数正好是「mount +1 / body +0」，且不抛错（覆盖外层目录对已建好的外层语句没有影响）。

**修法**：改挂 racket（函数体 {）自己，同样加 CatalogGuide === null 门。声明本身仍留 raw 段，
由 legacy BuildFunctionDeclaration 建；体内语句走与根层函数体完全相同的收集通道。

**读数**：{ function f(){ let x = 1; } } body **+1**；{ function g(){ a; b; } } body **+2**；
{ function f(){ let x = 1; } f(); } body +1；<T>(a: T) / 返回类型 / 体内 if / case 体内函数体均 body +1；
BlockFunctionBodyMountCount 与 body 同步增长（不再是「挂上但没接管」）。

## 3. 专用 cases

- 	ests/statement-possible/switch-case-cases.json 新组 stage4s（20 条）：
  case 表达式 4（ + 1 / oo() /  ? b : c / o.k）；case 体 6（let、if/else、for、混合子句、
  嵌套 switch、try/catch）；块内函数体 6（简单、两句、返回类型、泛型、体内 if、case 体内）；
  冒名 4（对象方法体、箭头体、类方法、无 case 体的 switch）——必须仍不误挂、树不变。
  每条的断言与 stage4p 一致：XML==legacy 逐字节、AST==	s.createSourceFile 逐节点、两次解析 XML 相同、
  无 StatementShape/PossibleShape/CatalogGuide 泄漏、**无文件级 fallback**。
- 	ests/statement-possible/control-flow-body-takeover.mjs：4p 的 5 条「不接管」证据改为接管读数
  （switch 体 4 条 + 块内函数体 1 条），并新增 8 条计数用例（body/brace/cf 增量）。

## 4. 全表读数（本分支，修复后编译产物）

| 步骤 | exit | 读数 |
| --- | --- | --- |
| xl_build | 0 | 890 written / 0 error（+ 单文件重生成 0 error） |
| tsc | 0 |  |
| cf-body-takeover | 
1
 | 
[control-flow-body-takeover] cases=38 failed=1 defaultFlags=true totalBrace=34 totalBody=53
 |
| stage4s | 
0
 | 
[statement-possible] groups run=1 skipped=0 | cases pass=20 fail=0 skip=0 known=0 uncovered=0
 |
| stage4p | 0 | cases pass=25 fail=0 skip=0 known=0 uncovered=0 ; file-fallback total=0 |
| harness-all | 0 | groups run=8 skipped=3 / cases pass=101 fail=0 skip=0 known=1 uncovered=0 ; file-fallback total=0 |
| double-accept | 0 | 冲突 0 ; cases=120 failed=0 |
| lint | 0 | PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| stage4n | 0 | cases pass=28 fail=0 |
| stage4o | 0 | cases pass=27 fail=0 |
| cf-takeover | 0 | cases=39 failed=0 defaultFlag=true |
| block-body-takeover | 0 | cases=21 failed=0 defaultFlag=true |
| s4j-function-body | 0 | 全 PASS |
| s4l-await-body | 0 | 全 PASS |
| r1-asi | 0 | cases pass=31 fail=0 |
| stage5c | 0 | groups run=0 skipped=1（快照组） |
| stage4b | 0 | cases pass=17 fail=0 |
| stage4c | 0 | cases pass=42 fail=0 |
| stage4c2 | 0 | cases pass=33 fail=0 |
| dev | 0 | 与基线同（2 处已知 fallback） |
| operators-live | 0 | cases pass=40 fail=0 |
| op-ast-proof | 0 | cases=90 pass=90 fail=0 |
| op-proof | 0 | cases=40 pass=40 fail=0 |
| comma-import-fallback | 0 | cases=11 pass=11 |
| validate | 0 | 1720 条用例，0 条不合格 |
| ast-json | 0 | total cases=6167 cj-ok=6167 cj-fail=0（47 构造） |
| ast-json git status | - | empty=True（XML/AST 逐字节等价） |
| ast-json-diff | 0 | 6167/6167 完全一致，结构/位置/字段差 0 |
| token-ast | 0 | ok 1706 / ts-invalid 10 / known-gap 0 |
| real-dts | 0 | 226 文件全解析、AST 一致 226 |
| feas-operator | 0 | cases=6 pass=6 |
| insert-between | 0 | tests=9 pass=9 |
| perf | 0 | WARN 耗时增长超过 2.5 倍（基线同，无新断言） |

## 5. 未覆盖 / 剩余

1. **case 子句级语句**（case 1: f(); 不带 {}）：仍 raw。子句语句不在括号里，块体目录没有落点；
   要接管需给 BuildCaseBlock 加子句级收集分支（4p §1 已列为下一步），本轮未做。
2. **switch 体括号**本身仍不挂目录（它是 CaseBlockShape 的入口，不是语句序列），本轮未改。
3. **块内声明族的壳化**（unction / class / enum / declare 在块内）：未做，声明本身仍 raw，
   本轮的接管只发生在**函数体内部**；{ function f(): void; function f(){} } 重载体未专门验证。
4. **case 体内的 unction 声明**：已由 s4s-fn-block-in-case 覆盖 XML/AST，但体内收集计数未单独断言。
5. perf 只有 WARN 级输出（基线同），无新性能断言。

## 6. 风险

- 两个开关现在默认 	rue：若将来 MountBodyCatalog 的候选集变化，case 体 / 块内函数体是第一批受影响面，
  stage4p + stage4s 双组会同时报红（这是有意的）。
- 修复依赖「宿主传进来的 racket 就是体括号」这一事实（Bracket.OnBracketCreatedEvent 的语义）；
  若事件改成传父括号，这两处要同步调整。
- case 体的树仍由 BuildCaseBlock 建 CaseBlockShape，本轮只接管体内语句；子句级语句未接管不改变树。
- IsFunctionDeclarationBody 依赖参数表是**一个已闭合的 ( 括号单元**（与本语法 ( ) 同体口径一致）；
  若括号改成两个单元，要与 TryMountFunctionBody 一起改。