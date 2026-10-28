# 50 设计偏离审计 — typescript/tokens/expressions/expression-builder 等 5 个文件

审计对象为本批 5 个文件；判据取自 `01-rules.md`（R01–R36，编号 `S1…D1`），事实表取自 `_facts/typescript-tokens-expressions.md`，行号为 `read` 返回的真实行号。只读源码，未改任何源码与 `docs/IMPORTANCE.md`。

### typescript/tokens/expressions/expression-builder.xl.md（100806B / 2231 代码行（全文 2706 行）；ExpressionBuilder）

- 结构：**建造器/旁路层**——不是 basic token、不是 shape、不是 possible/end、不是 end possible。它把 basic token 数组装进 `Units`/`Positions` 两个平行数组（`Load:154`），用下标 `At` 当游标做递归下降，按首单元文本分派，直接 `new XxxShape(this.Template)` + `shape.Add(...)` 拼出**表达式形状树**，并由 `SpanLeaf`/`SpanNode` 自己签范围、写 `Pos`、调 `TryToClose`。全文 0 处 `ComputeByIndex`/`BuildByIndex`/`IsBuildable`/`tokenIndex`，0 处 `GetState`/`SetState`/`GetShare`/`SetShare`，0 处 `ParseFromShape`，0 处 `GetRaw`。它是**第二条建 AST 的管线**：与 possible + `BuildByIndex` 主线并列，且调用面极广——全仓库 110 处 `new ExpressionBuilder(` / `.ParseExpression()`，共落在 **34 个文件**（含本文件与 `feas-operator-parser`），其余 32 个分布在 `declarations/`、`statements/`、`types/`、`bindings/`、`expressions/forms/` 各处。

#### 量化事实（与 `_facts` 表一致，逐项 grep 复核）

| 指标 | 值 | 说明 |
| --- | --- | --- |
| 类规模 | 1 类 / 5 字段 / 65 方法 / 100806B / 2231 代码行 | 单类 2706 行，占本批 5 文件总字节的 69% |
| `new XxxShape(` | **124** 处 | 其中 `new XxxTokenShape(` **47** 处，非 token 形状 **77** 处 |
| `new ExpressionBuilder(` | **7** 处 | `1349` `1430` `1455` `1733` `2054` `2556` `2576`：每进一个括号就新起一个 builder 整段重建 |
| `.slice(` | **9** 处 | `453` `495` `1825` `1913` `1947` `2030` `2088` `2178` `2191`：整段切给 `TypeBuilder`/`StatementBuilder` |
| `GetRaw` | **0** 处 | 不回读 raw（但见 `U1`：回读的是 `SourceRange.Document`） |
| `ParseFromShape` | **0** 处 | R21 的产出通道完全缺席（全仓库也只有 1 个未实现桩） |
| `.splice(` | **1** 处 | `1677`（对象字面量简写属性插 `=` token） |
| `TryToClose(` | 19 处 | 全部由 builder 在本地调，关闭权不在 close/possible 一侧 |
| `SignIn(`/`SignOut(` | 25 处 | 区间由 builder 逐节点手签 |
| `.Pos = ` | 42 处 | Pos 由 `Positions[]` 平行数组给出 |

#### 职责分布（65 方法 / 17 组）

| 组 | 职责 | 方法:行 |
| --- | --- | --- |
| 装载与读取 | 收 raw 单元、**剔 trivia**、记 `Positions`、文本判定 | `Load:154` `Peek:173` `TextOf:183` `IsText:195` `StartsNumber:201` |
| 区间与收口 | 唯一收口通道：签 In/Out、写 Pos、`TryToClose` | `SpanLeaf:214` `SpanNode:229` |
| 运算符判定 | 三个薄封装 + 一份手抄赋值表 | `IsPrefixOperator:245` `BinaryPrecedence:251` `IsRightAssociative:257` `IsAssignmentText:263` |
| 表达式主线 | 逗号 / 赋值 / 条件 / 二元 / 一元 | `ParseExpression:284` `ParseExpressionFrom:291` `ParseAssign:319` `ParseAssignFrom:326` `ParseConditional:348` `ParseConditionalFrom:355` `ParseBinary:382` `ParseBinaryFrom:389` |
| 一元与 yield | 前缀算子、yield 受限产生式 | `ParseUnary:522` `ParseYield:591` |
| 类型算子 | `as`/`satisfies` 右接类型、尖括号实参 | `IsTypeOperator:440` `ParseFollowingType:449` `FindTypeArgumentClose:463` `CanStartTypeArgumentCall:469` `CanStartTypeArguments:480` `ParseTypeArgumentsAtCurrent:486` |
| 运算符文本 | 文本 → 是否二元 | `BinaryOperatorText:503` |
| **上下文回读原文** | 逐字符回扫源码判函数 / 箭头 / 生成器 / async | `EnclosingFunctionFlags:646` `ArrowBodyFlags:734` `FunctionBodyFlags:766` `IsControlKeyword:827` `MatchParenBackward:834` `ReadWord:854` `IsIdentifierKeywordOrLiteral:869` `IsAwaitExpressionStart:881` `IsWhitespaceChar:905` `IsIdentifierChar:911` |
| 后缀链 | 泛型实例化 / 调用 / 箭头 / 模板 / `.` / `?.` / `!` / `++` / `()` / `[]` | `ParsePostfix:921` `ParsePostfixSuffix:929` |
| new 与模板 | `new.target`、被构造者后缀链、模板串拆分 | `ParseNew:1161` `IsTemplateToken:1295` `ParseTemplateToken:1309` |
| 括号内容 | 对象字面量成员全谱、数组、计算属性名 | `ParseComputedPropertyName:1420` `ParseObjectLiteral:1452` `ParsePropertyName:1696` `ParseArrayLiteral:1730` |
| 函数 / 箭头 / 类 | 箭头（含返回类型回溯）、类表达式、块、`=>` 前瞻 | `ParseArrowFromBracket:1792` `ParseClassExpression:1858` `ParseArrowBody:1928` `ParseBlock:1938` `HasArrowAfter:1956` |
| 函数表达式 | `function` 表达式与形参表 | `ParseFunctionExpression:1977` `ParseFunctionParameters:2050` |
| 尖括号 | 断言 `<T>x` / 泛型箭头 `<T>(…)` | `MatchAngleClose:2165` `ParseAngleType:2171` `ParseAngleTypeParameters:2187` `ParseAngleStart:2201` |
| 原子分派 | 表达式起点大分派 + 消费别处已建原子 | `ParsePrimary:2243` `MakeKeywordLeaf:2518` `ParseName:2524` `IsBracketStart:2547` |
| 括号内表达式 / 实参 | 整段切片 → 新 builder | `ParseBracketExpression:2553` `ParseBracketArguments:2572` |
| 运算符 token 工厂 | 44 分支 `new XxxTokenShape` | `MakeOperatorToken:2603` |

- 偏离：

  - `[S4]` ● AST 不由关闭后的 shape 产出：全文 0 处 `ParseFromShape`，124 处直接 `new XxxShape` 建节点并 `Add` 子节点，节点身份与层级由 builder 决定 — 证据 `expression-builder.xl.md:135`（`# class ExpressionBuilder`，其后 65 个方法无一走 shape→AST 通道）；旁证 `typescript/ast/declarations/import-declaration-ast-node.xl.md:31`（`throw new Error("ImportDeclarationAstNode.ParseFromShape 未实现");`，全仓库唯一一处 `ParseFromShape`，且是桩）
  - `[S4]` ● 关闭权内联在 builder：范围、`Pos`、`TryToClose` 三件事都由 builder 在本地做完（19 处 `TryToClose`、25 处 `SignIn/SignOut`、42 处 `.Pos =`），关闭不是 close/possible 一侧的结果 — 证据 `expression-builder.xl.md:225`（`shape.TryToClose(this.Context);`，通用收口函数 `SpanLeaf:214-227`/`SpanNode:229-243`）
  - `[S4]` ● 整个仓库的「AST」其实是形状树的打印：`ToAstLine` 直接遍历 `Data` 出树 — 证据 `core/syntax/token.xl.md:257-269`（`## method ToAstLine:(indent:int)=>string` / `for (let i = 0; i < this.Data.length; i++)`），即没有独立的 AST 阶段可供 `ParseFromShape` 挂钩

  - `[S2]` ● 三件套不成立：本类不 import 亦不实现 `PossibleShape`/`CatalogGuide`，无 `ComputeByIndex`/`IsBuildable`/`BuildByIndex`、无 `tokenIndex` 形参（grep 全 0），入口是 `ParseExpression()` — 证据 `expression-builder.xl.md:284`（`## method ParseExpression:()=>Token` / `return this.ParseExpressionFrom(this.ParseAssign(), start);`）

  - `[X2]` ● 本文件就是 legacy 旁路本体：它是 34 个文件共 110 处的公共入口，表达式的一切（优先级、结合性、箭头/类/模板/对象字面量）都在这里用整段缓冲重算，绕开逐字增量 — 证据 `typescript/tokens/expressions/forms/primary/parenthesized-possible-shape.xl.md:158-160`（possible 的 `BuildByIndex` 里 `const builder = new ExpressionBuilder(host.Template, context); builder.Load(raw, basePos); const inner = builder.ParseExpression();`——候选已定案，仍整段重建）
  - `[X2]` ● 旁路与主线的缝合靠「全局登记表 + 开关」：`ParsePrimary` 里只认别处登记过的身份才收下已建形状，注释自陈开关为假时表恒空 — 证据 `expression-builder.xl.md:2265`（`if (ExpressionAtomRegistry.Has(unit)) {`，注释 2261-2264「登记表每文件被 `ExpressionAtomRegistry.Reset()` 清空，开关 `EnableExprBracketCatalog` 为假时恒空」）

  - `[C2]` ● 每进一个括号就整段重建：新起 `ExpressionBuilder` 吃掉 `bracket.Data` 的全部单元再从头 `ParseExpression()`（7 处 `new ExpressionBuilder`），区间不走任何已有形状 — 证据 `expression-builder.xl.md:2556-2565`（`const inner = new ExpressionBuilder(this.Template, this.Context); ... inner.Load(bracket.Data, base); ... const shape = inner.ParseExpression();`，同款 1349/1430/1455/1733/2054/2576）
  - `[C2]` ● 子区间不从形状取，而是 `.slice(...)` 后整段交给另一个建造器（`TypeBuilder` / `StatementBuilder` / `HeritageClause`），共 9 处 — 证据 `expression-builder.xl.md:1947`（`builder.Load(this.Units.slice(start), this.Positions[start]);`，来自 `ParseBlock:1938-1953`；同类 453/495/1913/2030/2088/2178/2191）

  - `[U1]` ● AST 阶段回读原文：判 `yield`/`await` 是否为表达式时，从 `SourceRange.Document` 起**逐字符往回扫全文**重建「所在函数/箭头/生成器/async」信息——这些信息本该在 basic token 或形状阶段就落成字段 — 证据 `expression-builder.xl.md:654-661`（`const document = unit.SourceRange.Document; ... const whole = SourceRange.Whole(document); let index = from - 1; while (index >= 0) { const ch = whole.At(index);`）
  - `[U1]` ○ 同一信息还被逐字符二次拼词：`ReadWord` 把文档里的字符一个个拼回标识符再去比对 `function`/`async` — 证据 `expression-builder.xl.md:862-865`（`while (at <= to) { word = word + whole.At(at); at++; }`）

  - `[C1]` ● 每轮重扫且无缓存：`EnclosingFunctionFlags` 每次调用都全文件回扫，而 `ParseYield:598` 与 `IsAwaitExpressionStart:895` 各调一次；`HasArrowAfter:1959` 前扫到单元末尾；`ParseClassExpression:1898` 线性找类体 `{` — 证据 `expression-builder.xl.md:660`（`while (index >= 0) {`，函数体 660-731 共 72 行的回扫循环）
  - `[C1]` ● 同一段被反复试探：箭头返回类型对每个候选 `=>` 都新起一个 `TypeBuilder` 试解析一遍，失败就 `continue` 到下一个候选 — 证据 `expression-builder.xl.md:1818-1827`（`for (let candidate = returnTypeStart; candidate < this.Units.length; candidate++) { ... const returnTypeBuilder = new TypeBuilder(this.Template, this.Context); returnTypeBuilder.Load(returnTypeUnits, ...)`）
  - `[C1]` ● 类内 5 个字段全是输入快照与游标，没有任何「已扫出的位置」记录位；0 处 `GetState`/`SetState`/`GetShare`/`SetShare`，扫过的结论无处可存 — 证据 `expression-builder.xl.md:137-145`（`## field Units:Array<Token> = []` … `## field Context:SyntaxContext`）

  - `[B2]` ● compute/build 里 catch 吃掉异常：箭头返回类型的候选试解析把异常吞成 `continue`，于是「类型读不完」这一诊断永远不会浮出 — 证据 `expression-builder.xl.md:1828-1838`（`try { const parsed = returnTypeBuilder.ParseReturnType(); ... } catch (error) { continue; }`）

  - `[X1]` ● 设计外的「运算符 token 工厂」：`MakeOperatorToken` 用 44 个 `text === "…"` 分支 `new XxxTokenShape`（本文件 47 处 `new XxxTokenShape`，其中 44 处集中在此），而设计里 token 形状由各形状的静态工厂产出（见下条旁证） — 证据 `expression-builder.xl.md:2603-2609`（`## method MakeOperatorToken:(unit:Token, index:int)=>Token` / `if (text === "=") { shape = new EqualsTokenShape(this.Template); }`，分支至 2705）；对照设计内写法 `typescript/tokens/expressions/binary-expression-possible-shape.xl.md:101`（`const shape = PlusTokenShape.FromSymbol(token, context);`）
  - `[X1]` ● 自造「已建原子接收点」，两个管线在 `ParsePrimary` 处缝合：4 处登记表查询分别对接控制流头、表达式括号内原子、容器形状、嵌套标签模板 — 证据 `expression-builder.xl.md:2257`（`if (ControlHeadPossibleShape.IsAtom(unit)) {`）、`2265`（`if (ExpressionAtomRegistry.Has(unit)) {`）、`2274`（`if (ExpressionAtomRegistry.HasContainer(unit)) {`）、`2283`（`if (ExpressionAtomRegistry.HasNode(unit)) {`）
  - `[X1]` ● 重复实现运算符语义：手抄 16 个赋值符而不用 `OperatorTable.IsAssignmentOperator`；条件表达式优先级写死 `4`（与 `??` 的优先级同为 4，`OperatorTable` 里没有独立的 `?:` 级） — 证据 `expression-builder.xl.md:266-281`（`return text === "=" || text === "+=" ... || text === "??=";`）、`352`（`return this.ParseConditionalFrom(this.ParseBinary(4), start);`）；对照 `typescript/tokens/expressions/operator-table.xl.md:41-43`（`if (text === "??") { return 4; }`）
  - `[X1]` ○ 用「整段缓冲 + 游标」替代设计里的 `tokenIndex` 单格推进，越界/之后数据的判据在此层无对应物（等价于任意前瞻） — 证据 `expression-builder.xl.md:2318-2325`（`let probe = this.At + 2; while (probe < this.Units.length) { if (this.IsText(this.Units[probe], "=>")) { arrowAhead = true; break; } probe++; }`）

  - `[U4]` ○ trivia 被整体丢弃，与增量侧相反：`Load` 里 `continue` 掉所有 trivia，而增量路径用 `ItemUtil.InsertTrivia` 把 trivia 塞回 `Data`——于是「close 后 `Data` = AST children」在两条路径上是两个口径，且靠各 build 点手工摘 trivia 对齐 — 证据 `expression-builder.xl.md:162-164`（`if (unit.IsTriviaToken) { continue; }`）；对照 `typescript/tokens/expressions/forms/operator/reassociation-possible-shape.xl.md:181-184`（`ItemUtil.InsertTrivia(outer, 1, outerTrivia); ...`）

  - `[B4]` ○ 查看 `tokenIndex` 之后的数据（本层无 `tokenIndex`，故为等价形态）：条件表达式的 `?` 与 `:` 之间先整段 `ParseAssign` 再回头找 `:`，箭头前瞻直接扫到单元末尾 — 证据 `expression-builder.xl.md:1959`（`for (let at = from; at < this.Units.length; at++) {`，`HasArrowAfter:1956-1975`）

- 结论：**偏离（20 条：`S4`×3、`S2`×1、`X2`×2、`C2`×2、`U1`×2、`C1`×3、`B2`×1、`X1`×4、`U4`×1、`B4`×1；其中 ● 16 条、○ 4 条）**。这是本批最重的一处越权：它以「一个类 + 65 个方法」承担了本应由 possible 的 `BuildByIndex` + `ParseFromShape` 承担的一切（建节点、定优先级、签范围、收口），并且是 34 个文件的公共入口，因此在事实上不是「备选方案」而是主路径。合规项需一并记明以免误读：`Peek:173-181` 是干净的空值返回（`return null`）；全文仅 1 处 `catch`（`1828-1838`，即 `B2` 那一条），无其它吞异常点；0 处 `ExitOrPre` 覆盖（无 `R1`）、0 处 `ComputePossibleShapes` 覆盖（无 `R2`）；0 处 tsx/JSX 形状（无 `X3`）；围栏外 0 行散文（无 `D1`，`_facts` 的 prose 列为 0，中文注释全在 `ts` 围栏内）。

### typescript/tokens/expressions/operator-shape-map.xl.md（14760B / 211 代码行（全文 376 行）；OperatorShapeMap）

- 结构：**工具/工厂层**——纯静态类（12 个 `static field` + 16 个 `static method`），既不做 possible 也不做 shape：一半方法是把 `OperatorTable` 的判定转手（`IsBinary:120`、`IsAssignment:126`、`IsPrefix:132`、`PrecedenceOf:156`、`IsRightAssociative:165`），另一半是「运算符文本 → 形状类」的**大型映射表**：`Create` 按 `position` 四分派（`171-187`），`CreateBinary` 的 43 个 `text === "…"` 分支全部以 `FinishShape(new …(template), start, end, context)` 收口（`189-322`；其中 40 个是 `XxxTokenShape`，另 3 个是 `FirstBinaryOperatorShape`/`InstanceOfKeywordShape`/`InKeywordShape`），`CreatePrefix`/`CreatePostfix`/`CreateTypeAssert` 再各造表达式形状（`324-361`），最后由 `FinishShape` 自己 `SignIn`/`SignOut`/`TryToClose`（`363-376`）。全文 50 处 `new`（40 处 `new XxxTokenShape` + 10 处表达式形状），43 处 `FinishShape(` 调用，0 处 possible/end/cache/`ParseFromShape`。

- 偏离：

  - `[X1]` ● 设计外的「形状工厂」：IMPORTANCE 里没有「文本 → 形状类」的表；token 形状的产出方式是各形状自己的静态工厂（`FromSymbol`/`FromBasicToken`/`FromBracket`）。本类把 40 个 punctuation 形状的构造集中到一张 `if` 链上，形状的**构造权**因此落在一个中立工具类手里 — 证据 `operator-shape-map.xl.md:189-193`（`## private static method CreateBinary:...` / `if (text === "*") { return OperatorShapeMap.FinishShape(new AsteriskTokenShape(template), start, end, context); }`，同款 40 条至 319）
  - `[X1]` ● 同一语义的第 2 份实现（运算符文本 → 形状类），且两份清单**长度与成员都不同**：本类 `CreateBinary` 覆盖 43 个文本，`expression-builder.MakeOperatorToken` 覆盖 47 个（多 `,` `=>` `...` `?.`），即前者是后者的真子集；另有 2 处零散手写 — 证据 `operator-shape-map.xl.md:319`（`return OperatorShapeMap.FinishShape(new ColonTokenShape(template), start, end, context);`）对照 `expression-builder.xl.md:2669`（`shape = new CommaTokenShape(this.Template);`，本类无 `CommaTokenShape`）、`2671`（`shape = new QuestionDotTokenShape(this.Template);`，本类同样没有）；另有 `forms/operator/conditional-possible-shape.xl.md:512`（`const questionShape = new QuestionTokenShape(host.Template);`）、`666`（`const shape = new ColonTokenShape(host.Template);`）、`forms/primary/arrow-possible-shape.xl.md:323`（`const arrowToken = new EqualsGreaterThanTokenShape(host.Template);`）——同一映射在 **4 个文件**里被手写，设计内写法另有静态工厂一种
  - `[X1]` ○ `KindOf` 是第 4 份运算符分类判据，且判序自己定：先 `?`/`:`、再 `as`/`satisfies`、再赋值、再 `++`/`--`、再二元、再前缀——`+` 因而归 `binary`，一元 `+a` 只能靠 `CreatePrefix` 的兜底分支接住 — 证据 `operator-shape-map.xl.md:99-109`（`if (OperatorTable.IsAssignmentOperator(text)) { ... if (OperatorTable.IsBinaryOperator(text)) { ... if (OperatorTable.IsPrefixOperator(text)) { ...`）、`336-338`（`if (OperatorTable.IsPrefixOperator(text)) { return new PrefixUnaryExpressionShape(template); }`）

  - `[P2]` ● 越过候选收敛：本类不参与淘汰/终结判定，却对「该建什么」再做一次判定（`KindOf`/`Create` 的 position 分派），而调用方是在**唯一候选已定案之后**的 `BuildByIndex` 里调它——同一格的分类被候选层与本类各判一次，且本类失败即 `throw`，不返回任何候选状态 — 证据 `typescript/tokens/expressions/forms/operator/binary-operator-possible-shape.xl.md:141-142`（`const precedence = OperatorShapeMap.PrecedenceOf(text); const operatorShape = OperatorShapeMap.Create(text, OperatorShapeMap.PositionBinary, host.Template, ...)`）；本类的失败形态 `operator-shape-map.xl.md:321`（`throw new Error("增量变量形状未支持：expression 运算符 " + text);`）、`186`（`throw new Error("增量变量形状未支持：expression 运算符位置 " + position);`）
  - `[P2]` ○ `CreateBinary` 的 43 条分支与 `OperatorTable.IsBinaryOperator` 的可接受集合不一致（`<` 走 `FirstBinaryOperatorShape`、`in`/`instanceof` 走关键字形状），分类与建形状两处判据需人工同步 — 证据 `operator-shape-map.xl.md:219-220`（`if (text === "<") { return OperatorShapeMap.FinishShape(new FirstBinaryOperatorShape(template), start, end, context); }`）、`231-235`（`instanceof` → `InstanceOfKeywordShape`，`in` → `InKeywordShape`）

  - `[P3]` ○ 自造的「收口」不满足 R31/R32 任一支：`FinishShape` 手写 `SignIn`→`SignOut`→`TryToClose`，但 `TryToClose` 被三个前置条件守门（`context !== null` 且两端 `>= 0`），条件不满足就**原样返回一个未闭合的形状**；此时它既不 `SignOut` 到宿主、也不设 `MountedUnit` — 证据 `operator-shape-map.xl.md:366-375`（`if (start >= 0) { shape.SignIn(start); } if (end >= 0) { shape.SignOut(end); } if (context !== null && shape.SourceRange.Start >= 0 && shape.SourceRange.End >= 0) { shape.TryToClose(context); } return shape;`）

- 结论：**偏离（6 条：`X1`×3（2 ● + 1 ○）、`P2`×2（1 ● + 1 ○）、`P3`×1 ○）**。判定要点：这确实是设计外的「形状工厂」（`X1`），而且它并不承担候选收敛——它是在收敛**之后**被调用、却把「文本 → 形状类 + 分类」这两件事又实现了一遍（`P2`），因此它与 `OperatorTable`、`expression-builder.MakeOperatorToken`、各 possible 的静态工厂构成四重语义副本。合规项：本类纯静态、无状态，0 处 cache 调用（`C3` 不涉及）、0 处扫描循环（`C1` 不涉及）、0 个 `catch`（`B2` 合规）、0 处 `ExitOrPre`/`ComputePossibleShapes` 覆盖（`R1`/`R2` 合规）、围栏外 0 行散文（`D1` 合规）。

### typescript/tokens/expressions/right-operand-possible-shape.xl.md（11444B / 204 代码行（全文 312 行）；RightOperandPossibleShape、RightOperandFormPossibleShape）

- 结构：**possible 层**（本批唯一名副其实的 possible 文件，两个类都 `extends PossibleShape`）。`RightOperandPossibleShape` 负责「数字 / BigInt / 标识符」这一格（5 个方法：`IsIdentifierText:31`、`Catalog:43`、`ComputeByIndex:56`、`IsBuildable:84`、`BuildByIndex:93`）；`RightOperandFormPossibleShape` 用字符串 `Kind`（`paren`/`string`/`template`/`keyword`/`object`）承载 5 种「形态右操作数」，靠 `Claims`/`IsOperatorLike`/`AcceptsPrevious` 三个静态判据分派（2 字段 + 8 方法）。`Catalog:43-54` 每次调用都新建 1+5 个候选实例，结束判定交给 `CatalogGuide`（不在本文件）。

- 偏离（按 R22/R25/R23/R08/R09–R11/R26–R30/R31–R32 逐条）：

  - `[B4]` ○ 构建期读了 `tokenIndex` 之后的数据并使之后移：`BuildByIndex` 先用 `ItemUtil.NextCode(host.Data, tokenIndex)` 向前找格，再从该格**往回**连续 `splice` 掉 trivia——被删格之后的所有下标整体前移，而候选目录仍按旧下标记账（`CatalogGuide` 需靠 `LastBuildTokenIndex`/`LastBuildDataLength` 兜住） — 证据 `right-operand-possible-shape.xl.md:98`（`let codeIndex = ItemUtil.NextCode(host.Data, tokenIndex);`）、`105-108`（`while (codeIndex > 0 && host.Data[codeIndex - 1].IsTriviaToken) { host.Data.splice(codeIndex - 1, 1); codeIndex -= 1; }`，同款 296-303）
  - `[B4]` ○ 同一处注释自陈 trivia 处理是为了对齐两条管线的 digest（`residualBasicLines`），而非设计中的语义 — 证据 `right-operand-possible-shape.xl.md:102-104`（`// 留在宿主里会变成增量树多出来的 basic 行（legacy 的 BinaryExpressionShape 不保留它们，residualBasicLines 会 +N）`）

  - `[B1]` ○ 越界未返回 `Nothing`：两个 `ComputeByIndex` 在 `tokenIndex` 越界时都返回 `Uncertain`，而按 R26 `Accept`/`Uncertain` 同义=「还活着」，等于越界时**不淘汰**；本仓库的 possible 语义里没有 `Nothing` 通道（`ShapeStates` 只有三个值），越界信号只能由 `IsBuildable` 的 `false` 补 — 证据 `right-operand-possible-shape.xl.md:59-61`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`，另一处 238-240）；对照 `core/syntax/shape-states.xl.md:3-7`（`# enum ShapeStates` / `- case Reject` `- case Accept` `- case Uncertain`）
  - `[B1]` — `IsBuildable` 两支都合规（越界返回 `false`）— 证据 `right-operand-possible-shape.xl.md:87-89`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return false; }`，另一处 268-270）

  - `[B2]` — 合规：本文件 0 处 `catch`，两个 `BuildByIndex` 的失败一律 `throw`（100/111/126/134/294/298）。

  - `[C1]` — 合规（R08 达标）：两条 `ComputeByIndex` 都不自己线性找起点，而是 `ItemUtil.ItemStartCached(units, cache)`，结果按 `units.length` 记进 cache 复用 — 证据 `right-operand-possible-shape.xl.md:66`（`const start = ItemUtil.ItemStartCached(units, cache);`，另一处 245）；实现 `typescript/tokens/item-util.xl.md:81-87`（`const cached = cache.GetItemStart(units.length); ... cache.SetItemStart(value, units.length);`）

  - `[C3]` ○ cache 语义只落地了三分之一：只用了 `ItemStart` 这条第三通道（不在 R09–R11 里），`GetState`/`SetState`/`GetShare`/`SetShare` 两个类里 0 次；更要紧的是 `source:PossibleSource` 形参**声明了却从不读**，于是「build 后 reset 的 state」与「不 reset 的 share」两种语义在本候选上都无法表达，触发来源（create / close）也不可辨 — 证据 `right-operand-possible-shape.xl.md:56`（`## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates`，函数体 59-82 无 `source` 出现；另一处 235 同）

  - `[P2]` — 合规（R26 淘汰语义）：`ComputeByIndex` 只返回三态、不修改 `PossibleShapes` 数组，trivia 格一律 `Uncertain`（存活）、形态不符一律 `Reject` — 证据 `right-operand-possible-shape.xl.md:242-244`（`if (unit.IsTriviaToken) { return ShapeStates.Uncertain; }`）、`259-261`（`if (!RightOperandFormPossibleShape.Claims(unit, this.Kind)) { return ShapeStates.Reject; }`）
  - `[P2]` ○ `IsBuildable` 里重跑形态判定（R30 说「只在恰好一个候选时问、默认 true」）：`object` 支把 `ComputeByIndex` 已判过的 `Claims` 再判一次，「`paren`」支还额外跑一次**整段试解析** — 证据 `right-operand-possible-shape.xl.md:275-287`（`if (this.Kind === "object") { ... return ObjectLiteralOperandPossibleShape.Claims(unit); } ... return ParenthesizedPossibleShape.CanParseInside(unit as Bracket, context);`）

  - `[P3]` ○ build 去向偏离 R32：R32 要求「未关闭 + 挂载：`host.MountedUnit = shape`，既不 `SignOut` 也不 `TryToClose`」。本文件两条 `BuildByIndex` 都不设 `MountedUnit`，而是调 `host.SealRightOperand(context)`——后者先 `TryToClose` 再 `Quit`（即先关闭、再清 `MountedUnit`），与 R32 恰好相反；产物是靠 `Replace` 顶替掉 basic token 才留在 `Data` 里 — 证据 `right-operand-possible-shape.xl.md:136`（`(host as BinaryExpressionShape).SealRightOperand(context);`，另一处 305-310）；`SealRightOperand` 实义见 `typescript/tokens/expressions/binary-expression-shape.xl.md:73-76`（`this.TryToClose(context); if (this.Parent !== null && this.Parent.MountedUnit === this) { this.Quit(); }`）
  - `[P3]` — 合规（R31 静态工厂 + R19/R35 即时丢弃 basic token）：三条分支都用静态工厂建形状、取字段、再 `Replace` 掉原 basic token — 证据 `right-operand-possible-shape.xl.md:117-120`（`const bigint = BigIntLiteralShape.FromBasicToken(token as Common, context); ... (token as Common).Replace(bigint);`）、`128-131`（`IdentifierShape.FromBasicToken(...)` + `Replace`）；`Replace` 会 `splice` 掉自己见 `core/syntax/token.xl.md:236-237`

  - `[X1]` ● 类型判据靠**类名字符串**而非 `instanceof`：`IsOperatorLike` 用 `unit.constructor.name.endsWith("TokenShape")` 与两个类名相等判断，注释自陈曾因 `InstanceofKeywordShape`/`InstanceOfKeywordShape` 大小写漂移导致整族形态右操作数全灭，现在的补丁是**同时接受两种拼写** — 证据 `right-operand-possible-shape.xl.md:169-180`（`const name = unit.constructor.name; if (name.endsWith("TokenShape")) { return true; } ... return name === "InstanceOfKeywordShape" || name === "InstanceofKeywordShape";`，注释 173-176 即为漂移记录）
  - `[X1]` ● 分支转发器：一个 `RightOperandFormPossibleShape` 用字符串 `Kind` 承载 5 种形态，`Catalog` 里放 5 个同实现不同字段的实例；R04 要求「关联通过 catalog guide 表达」，形态差异本应是各自的 possible — 证据 `right-operand-possible-shape.xl.md:48-52`（`shapes.push(RightOperandFormPossibleShape.Create("paren", new ParenthesizedPossibleShape())); ... RightOperandFormPossibleShape.Create("object", new ObjectLiteralOperandPossibleShape())`）、`142-160`（`## field Kind:string = ""` / `Create` 里 `shape.Kind = kind; shape.Inner = inner;`）
  - `[X1]` ○ `Catalog()` 不缓存候选实例：每次调用都 `new` 一批（含 5 个包装 + 5 个内核），与 `CatalogGuide` 的 `PossibleShapes` 生命周期无约定 — 证据 `right-operand-possible-shape.xl.md:46-53`（`const shapes:Array<PossibleShape> = []; shapes.push(new RightOperandPossibleShape()); ...`）

  - `[X2]` ● `object` 形态直接把括号内容交给 legacy 建造器整块吃掉，注释明写 — 证据 `right-operand-possible-shape.xl.md:276-279`（`// 括号里的内容由 ObjectLiteralOperandPossibleShape.BuildInto 用 legacy ExpressionBuilder 整块吃掉（与容器关闭格候选建对象字面量同一条路）`）
  - `[C2]` ● 双倍整段重建：`IsBuildable` 用 `ParenthesizedPossibleShape.CanParseInside` 试解析一次（内部 `new ExpressionBuilder` + `ParseExpression` + `try/catch`），`BuildByIndex` 再整段解析一次 — 证据 `right-operand-possible-shape.xl.md:287`（`return ParenthesizedPossibleShape.CanParseInside(unit as Bracket, context);`）；试解析本体 `typescript/tokens/expressions/forms/primary/parenthesized-possible-shape.xl.md:127-134`（`const builder = new ExpressionBuilder(bracket.Template, context); ... try { builder.ParseExpression(); } catch (error) { return false; }`）

- 结论：**偏离（11 条：`B4`×2 ○、`B1`×1 ○、`C3`×1 ○、`P2`×1 ○、`P3`×1 ○、`X1`×3（2 ● + 1 ○）、`X2`×1 ●、`C2`×1 ●；合计 ● 4 条、○ 7 条）**。本文件是 5 个文件里最接近设计的一份（`extends PossibleShape`、catalog 化、cache 记起点、淘汰/存活语义正确、basic token 用后即弃），偏离集中在四处：越界用 `Uncertain` 顶替 `Nothing`、`source` 形参不读使 state/share 无从落地、`SealRightOperand` 与 R32 的挂载语义相反、以及把「形态容器」和「整块 legacy 重建」两件事塞进同一个候选。合规项（已逐条标 `—`）：`B2`（0 处 catch）、`C1`（`ItemStartCached`）、`R26` 淘汰语义、`R31`（三支静态工厂 + `Replace` 丢弃 basic token）均达标。

### typescript/tokens/expressions/shape-operator-stack.xl.md（9524B / 246 代码行（全文 375 行）；ShapeOperatorStack）

- 结构：**工具/归约器层**——既不是 shape 也不是 possible（类名带 Shape 但不是 `ShapeToken` 子类，构造只吃 `Template`）。它是典型的 shunting-yard 栈机：`Nodes`/`Frames`/`FramePrecs`/`FramePending` 四个平行数组（`19-25`）＋ `Open`/`LastReduced` 两个游标，`PushOperand:79`/`AttachRight:90`/`PushOperator:104`/`Reduce:143`/`Drain:163` 归约，由 `Mount:288`/`MoveInto:315` 在**已建形状树的 `Data` 上做手术**（`indexOf` + `splice` 换节点）。它只被一处调用：`reassociation-possible-shape` 在「外层 `/`、内层 `*`」这类需要拆层的合成框上，用 2 操作数 + 2 运算符喂它归约出两层（`164-170`）。

- 偏离：

  - `[X1]` ● 第三套运算符归约实现：本类把「优先级 → 归约」写成一台独立栈机（19 个方法），而同一语义在 `expression-builder.ParseBinaryFrom:389-438`（递归下降 + `minPrecedence`，同一判据的递归版）与 `FeasOperatorParser.ParseExpression:75-194`（自建 6 个平行数组的 while-reduce）各有一份 —— 证据 `shape-operator-stack.xl.md:143-161`（`## method Reduce:(precedence:int, rightAssoc:bool)=>Token|null` / `while (this.Frames.length > 0) { ... if (!(this.FramePrecs[top] > precedence || (this.FramePrecs[top] === precedence && !rightAssoc))) { break; } reduced = this.ReduceTop(); }`），对照 `expression-builder.xl.md:424-430`（`const precedence = this.BinaryPrecedence(opText); if (precedence < minPrecedence) { break; } ... this.ParseBinary(this.IsRightAssociative(opText) ? precedence : precedence + 1)`）
  - `[X1]` ● 在已建形状树上做手术，绕开 `Add`/`Replace` 的语义：`NextLeft` 直接 `node.Data.splice(lastIndex, 1)` 把右操作数从父节点摘下，`Mount` 用 `indexOf` + 双 `splice` 把新二元节点塞回原格，`MoveInto` 迁移 `Parent` 与 `MountedUnit` — 证据 `shape-operator-stack.xl.md:256-258`（`const right = node.Data[lastIndex]; node.Data.splice(lastIndex, 1); return right;`）、`303-312`（`const leftIndex = leftHost.Data.indexOf(left); ... leftHost.Data.splice(leftIndex, 1); leftHost.Data.splice(leftIndex, 0, node); node.Parent = leftHost;`）
  - `[X1]` ● 第三份优先级/结合性判定与第三个「条件表达式优先级」常量：本类另立 `ConditionalPrecedence = 1`，而 `expression-builder` 用硬编码 `4`，`feas-operator-parser` 干脆不支持 `?:` — 证据 `shape-operator-stack.xl.md:15`（`## static field ConditionalPrecedence:int = 1`）、`152`（`if (this.FramePrecs[top] === ShapeOperatorStack.ConditionalPrecedence) { break; }`）；对照 `expression-builder.xl.md:352`（`ParseBinary(4)`）
  - `[X1]` ○ 自造一致性守卫：`CheckOperatorPos` 用「运算符 `Pos` 必须等于左操作数 `SourceRange.End`」判树是否合法，不等就 `throw`；这把「位置口径」变成了一条独立的不变量，与 `SignIn/SignOut` 的区间语义并行 — 证据 `shape-operator-stack.xl.md:345-359`（`const end = previous.SourceRange.End; ... if (operatorShape.Pos !== end) { throw new Error("增量变量形状未支持：expression 运算符 Pos 与左操作数不一致（" + text + "）"); }`）

  - `[P3]` ● 收口不走设计通道：归约时只调自造的 `Seal`（若节点已 `SignOut` 就返回，否则取最后一个子节点的 `End` 补 `SignOut`），既不 `TryToClose` 也不 `Quit`；被它归约的 `BinaryExpressionShape.FromLeftAndOperator` 本身也只 `SignIn` 不 `SignOut`（`binary-expression-shape.xl.md:31-33`），于是「归约完成的节点仍是未关闭形状」这一点被留给调用方 — 证据 `shape-operator-stack.xl.md:362-374`（`## private method Seal:(node:Token)=>void` / `if (node.SourceRange.End >= 0) { return; } ... node.SignOut(last.SourceRange.End);`）
  - `[P3]` ○ `Drain` 后不校验根节点是否已关闭，只校验「残留 1 个操作数」，把两根以上的情况 `throw`（是诊断，不是收口） — 证据 `shape-operator-stack.xl.md:171-177`（`if (this.Nodes.length > 1) { throw new Error("增量变量形状未支持：expression 归约后残留 " + String(this.Nodes.length) + " 个操作数"); }`）

  - `[S2]` ● 三件套里没有它的位置：无 `extends`、无 `ComputeByIndex`/`BuildByIndex`/`IsBuildable`、无 catalog 关联，却直接 `new ConditionalExpressionShape(this.Template)`（`193`）与 `BinaryExpressionShape.FromLeftAndOperator`（`133`）造 AST 节点——「建形状」的权力在设计里属于 possible 的 build — 证据 `shape-operator-stack.xl.md:193-203`（`const conditional = new ConditionalExpressionShape(this.Template); ... conditional.Add(condition); conditional.Add(questionShape); this.Mount(conditional, condition, leftHost, questionShape, operatorHost);`）

- 结论：**偏离（7 条：`X1`×4（3 ● + 1 ○）、`P3`×2（1 ● + 1 ○）、`S2`×1 ●；合计 ● 5 条、○ 2 条）**。判定要点：它是**第三套运算符解析/归约实现**（与 `expression-builder`、`feas-operator-parser` 并存，另加 `binary-expression-possible` 的单层原位归约），漂移已可见：条件表达式优先级 `1` / `4` / 不支持三值并存。合规项：0 处 `ExitOrPre`、0 处 `ComputePossibleShapes` 覆盖（`R1`/`R2` 合规）；0 处 `catch`（`B2` 合规）；无输入扫描、无 cache（`C1`/`C3` 不涉及）；围栏外 0 行散文（`D1` 合规）。

### typescript/tokens/expressions/feas-operator-parser.xl.md（9098B / 179 代码行（全文 285 行）；FeasOperatorParser）

- 结构：**建造器/解析器层（第四套）**——一个自足的表达式解析器：`Load:66` 从 `ExpressionBuilder` 借 `Units`/`Positions`，`ParseExpression:75` 用 6 个平行数组（`frames`/`precs`/`pending`/`starts`/`ends`/`rightStarts`）＋ `prefixShapes` 做 precedence climbing，`BuildOperand:253` 遇到 `(` 就 `new FeasOperatorParser` 递归整段重建。它的「判定」全部外包给三个 feas 候选的 `ComputeByIndex`，而「建形状」自己做（`new BinaryExpressionShape:141`、`new ParenthesizedExpressionShape:268`、`PrefixUnaryExpressionShape:163`）。文件头 `31-36` 的 `txt` 围栏是 4 条算例（R01 允许）。

- 偏离：

  - `[X1]` ● 第四套运算符解析器：与 `expression-builder.ParseBinaryFrom`、`shape-operator-stack`、`binary-expression-possible`+`reassociation-possible` 并列，自己再实现一遍优先级 climbing 与结合性 — 证据 `feas-operator-parser.xl.md:123-135`（`while (frames.length > 0 && !pending[frames.length - 1] && (precs[precs.length - 1] > precedence || (precs[precs.length - 1] === precedence && !rightAssoc))) { ... }`）
  - `[X1]` ● 而且**没有接入**：全仓库除自身递归外无任何调用点（`grep FeasOperatorParser` 命中 15 处，全部在本文件与三个 feas 候选的报错文本里），三个 feas 候选的 `BuildByIndex` 反而直接抛错把责任推给它 — 证据 `typescript/tokens/expressions/feas-operand-possible-shape.xl.md:43`（`throw new Error("FeasOperandPossibleShape.BuildByIndex: 原型由 FeasOperatorParser 增量建形状");`，同款 `feas-binary-operator-possible-shape.xl.md:46`、`feas-prefix-unary-possible-shape.xl.md:46`）
  - `[X1]` ● 自造树手术与跨对象取字段：用 `ShapeInsertUtil.InsertBetween` 把新节点插进栈顶节点的 `Data`，并把 `ExpressionBuilder` 降格成工具类（只为 `StartsNumber` 与 `Positions`） — 证据 `feas-operator-parser.xl.md:146`（`ShapeInsertUtil.InsertBetween(top, operand, shape);`）、`276-281`（`if (this.Builder.StartsNumber(text)) { shape = NumericLiteralShape.FromBasicToken(unit as Common, this.Context); } else { ... } shape.Pos = this.Builder.Positions[index];`）
  - `[X1]` ○ 语义覆盖远小于前三套，且是静默的：不支持条件表达式、赋值、逗号、`as`/`satisfies`、`await`/`yield`、箭头、`new`、对象/数组字面量（`BuildOperand` 只认 `(` 与 `Common`），遇到即 `throw` — 证据 `feas-operator-parser.xl.md:256-260`（`if (bracket.StartBracketChar !== "(") { throw new Error("FeasOperatorParser: 只支持圆括号操作数"); }`）、`168`（`throw new Error("FeasOperatorParser: 无法处理的单元（下标 " + String(index) + "）");`）

  - `[P2]` ● 把 possible 降格成布尔谓词，候选收敛整条链路被跳过：`IsOperandStart`/`IsBinaryOperator`/`IsPrefixOperator` 直接吃 `ComputeByIndex(...) === Accept`，`Reject` 与 `Uncertain` 被压成同一个 `false`；`PossibleSource.Close` 写死，于是 `BuildByIndex`/`IsBuildable`/淘汰/R30 的唯一候选次序全部不参与 — 证据 `feas-operator-parser.xl.md:205-221`（`return (this.OperandPossible as PossibleShape).ComputeByIndex(this.Units, index, this.Cache, PossibleSource.Close) === ShapeStates.Accept;`，三份同款）

  - `[C2]` ● 整段重建（覆盖式）：`ParseExpression` 一次吃掉从 `At` 到 `Units.length` 的全部单元；括号操作数整段递归重建 — 证据 `feas-operator-parser.xl.md:89`（`while (this.At < this.Units.length) {`，循环体至 169）、`265-267`（`const inner = new FeasOperatorParser(this.Template, this.Context); inner.Load(bracket.Data, base); const expression = inner.ParseExpression();`）
  - `[C1]` ○ 同一格被判多次且结果不落 cache：主循环里每轮对同一 `index` 最多连问三个候选（操作数 / 二元 / 前缀），只共享一个 `PossibleShapeCache`（`50`）而没有 state 记忆 — 证据 `feas-operator-parser.xl.md:92`（`if (left === null && this.IsOperandStart(index)) {`）、`119`（`if (this.IsBinaryOperator(index) && ...)`）、`162`（`if (left === null && this.IsPrefixOperator(index)) {`）

  - `[S2]` ● 三件套不成立：本文件只消费候选的判定、不产生候选也不产生 end，产出直接是 AST 形状（3 处 `new …Shape`），既不 `SignOut` 到宿主也不设 `MountedUnit`，收口靠 `FinishNode:235` 手写 `SignIn`/`SignOut`/`Pos` — 证据 `feas-operator-parser.xl.md:244-250`（`if (node.SourceRange.Start < 0 && head.SourceRange.StartIndex >= 0) { node.SignIn(head.SourceRange.StartIndex); } ... node.Pos = this.Positions[startIndex];`）
  - `[S4]` ○ 同样的 `ParseFromShape` 缺席（0 处）——它同样自称「由解析器增量建形状」 — 证据 `feas-operator-parser.xl.md:141`（`const shape = new BinaryExpressionShape(this.Template);`）
  - `[B4]` ○ 整段缓冲解析，无 `tokenIndex` 概念，任意前瞻（等价于看 `tokenIndex` 之后） — 证据 `feas-operator-parser.xl.md:186`（`if (this.At !== this.Units.length) { throw new Error("FeasOperatorParser: 单元没有读完"); }`）

- 结论：**偏离（10 条：`X1`×4（3 ● + 1 ○）、`P2`×1 ●、`C2`×1 ●、`C1`×1 ○、`S2`×1 ●、`S4`×1 ○、`B4`×1 ○；合计 ● 6 条、○ 4 条）**。判定要点：它是**第四套运算符解析器**，并且是一份**未接入的半成品**——三个 feas 候选的 `BuildByIndex` 直接抛错，全仓库无调用点，因此它的语义（不支持 `?:`/赋值/逗号、`Reject` 与 `Uncertain` 不分）既未被任何用例暴露，也无人维护，与另外三套的漂移只会继续扩大。合规项：0 处 `catch`（`B2` 合规）、0 处 `ExitOrPre`/`ComputePossibleShapes` 覆盖（`R1`/`R2` 合规）、`txt` 围栏内算例不算散文（`D1` 合规）、无 tsx/JSX 形状（`X3` 不存在）。

## 本批统计

- 文件数：**5**
- 有偏离文件数：**5**
- 总字节：145632B；总代码行：3071（全文 4054 行）
- 按编号计数：`S4:4 S2:3 X2:3 X1:18 C2:4 C1:4 C3:1 U1:2 U4:1 B2:1 B4:4 B1:1 P2:4 P3:4`（合计 **54 条**，其中 ● **34** 条、○ **20** 条；`S1`/`S3`/`U2`/`U3`/`B3`/`R1`/`R2`/`P1`/`P4`/`X3`/`D1` 本批均未出现）

| 编号 | ● | ○ | 落在哪些文件 |
| --- | --- | --- | --- |
| `S4` | 3 | 1 | expression-builder ×3、feas-operator-parser ×1 |
| `S2` | 3 | 0 | expression-builder、shape-operator-stack、feas-operator-parser |
| `X2` | 3 | 0 | expression-builder ×2、right-operand-possible-shape ×1 |
| `X1` | 13 | 5 | expression-builder ×4、operator-shape-map ×3、right-operand ×3、shape-operator-stack ×4、feas ×4 |
| `C2` | 4 | 0 | expression-builder ×2、right-operand ×1、feas ×1 |
| `C1` | 3 | 1 | expression-builder ×3、feas ×1 |
| `C3` | 0 | 1 | right-operand |
| `U1` | 1 | 1 | expression-builder ×2 |
| `U4` | 0 | 1 | expression-builder |
| `B2` | 1 | 0 | expression-builder |
| `B4` | 0 | 4 | expression-builder ×1、right-operand ×2、feas ×1 |
| `B1` | 0 | 1 | right-operand |
| `P2` | 2 | 2 | operator-shape-map ×2、right-operand ×1、feas ×1 |
| `P3` | 1 | 3 | operator-shape-map、right-operand、shape-operator-stack ×2 |

（注：`feas-operator-parser` 的三件套缺失同时命中 `S2` 与 `X1`，上表按「主要归类」只记 `S2` 一次，正文两条并列记录；`right-operand` 的 5 条 `—` 合规项不计入上表。）

- 本批最严重 5 条：
  1. `[S4]`/`[X2]` `ExpressionBuilder` 是第二条建 AST 的管线：100806B / 2231 代码行 / 65 方法 / 124 处 `new XxxShape` / **0** 处 `ParseFromShape` / **0** 处 `BuildByIndex`，却被 34 个文件共 110 处当作表达式入口（`expression-builder.xl.md:135`、`:284`；调用面 `forms/primary/parenthesized-possible-shape.xl.md:158-160`）。
  2. `[X1]` 「运算符文本 → 形状类」在 **4 个文件**里被手写：`expression-builder.MakeOperatorToken`（47 分支，`2603-2705`）、`operator-shape-map`（`CreateBinary` 43 分支 + `CreatePrefix/Postfix/TypeAssert` 7 分支，`189-361`）、`conditional-possible-shape:512/666`、`arrow-possible-shape:323`；而设计内的写法是各形状自己的静态工厂（`PlusTokenShape.FromSymbol`，`binary-expression-possible-shape.xl.md:101`）。`operator-shape-map` 的清单是 `expression-builder` 的真子集（43 ⊂ 47），靠人工同步。
  3. `[X1]` 运算符解析/归约有 **4 套**并存：`expression-builder.ParseBinaryFrom:389`（递归下降）、`shape-operator-stack:143`（shunting-yard 栈机）、`feas-operator-parser:75`（自建 6 数组，且**未接入**，三个候选反而 `throw`）、`binary-expression-possible:61`+`reassociation-possible:163`（单层原位归约）。漂移已具体化：条件表达式优先级 **1 / 4 / 不支持** 三值并存（`shape-operator-stack.xl.md:15`、`expression-builder.xl.md:352`）。
  4. `[U1]` AST 阶段回读原文：`yield`/`await` 的上下文判定靠从 `SourceRange.Document` 逐字符回扫全文（72 行循环）再逐字符拼词判 `function`/`async`——这些信息本应在 basic token/形状阶段落字段（`expression-builder.xl.md:654-731`、`:862-865`）。
  5. `[P2]`/`[P3]` possible 的收敛与去向被两处绕过：`feas` 把 `ComputeByIndex` 当布尔谓词（`Reject` 与 `Uncertain` 不分、`source` 写死，`feas-operator-parser.xl.md:205-221`）；`right-operand` 的 `SealRightOperand` 先 `TryToClose` 再 `Quit`，与 R32 的「未关闭 + `MountedUnit` 挂载」恰好相反（`right-operand-possible-shape.xl.md:136`、`binary-expression-shape.xl.md:73-76`）。

- 本批合规面（防止误读）：5 个文件围栏外 **0 行散文**（`D1`=0）；`X3`（tsx/JSX）=0；`R1`（覆盖 `ExitOrPre`）=0；`R2`（覆盖 `ComputePossibleShapes`）=0；`B3`（跳跃式处理）=0；`catch` 仅 `expression-builder:1836` 一处（其余 4 文件 0 处）；`right-operand-possible-shape` 的 `ItemStartCached`（`66`/`245`）是本批唯一达标 R08 的取起点方式；basic token 的「用后即弃」在 `right-operand-possible-shape:119/130` 用 `Replace` 正确落地。
