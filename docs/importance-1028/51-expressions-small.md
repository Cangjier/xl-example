# 51 — expressions 小文件批（43 个：标记壳 / 小候选 / 目录 / 表）

审计对象：`typescript/tokens/expressions/` 下 43 个文件（标记壳 29、小候选 6、目录/工厂 3、表 1、宿主 1、带 factory 的 shape 3）。
判据：`docs/importance-1028/01-rules.md`（R01–R36，编号 `S1…D1`）。事实表：`docs/importance-1028/_facts/typescript-tokens-expressions.md`（只取本批 43 行；字节/代码行与该表一致）。
只读源码，未改任何源码与 `docs/IMPORTANCE.md`。

**全局前提（其它批次已证实，本批直接采用）**：`ShapeStates` 只有 `Reject/Accept/Uncertain`，没有 `Nothing`（`core/syntax/shape-states.xl.md:5-7`）。因此 R25「越界返回 `Nothing`」在 `ComputeByIndex` 的返回类型上**不可表达**：凡越界返回 `Uncertain`/`Reject` 一律记 `[B1]` ○ 并注明「类型不可表达」，不按每个文件重复判为独立设计错误。
另一条全局事实（本批每条 `S4` 共用）：全仓 `ParseFromShape` 仅 1 处且是抛「未实现」的桩（`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`），表达式侧只有一个没有成员的 `ExpressionAstNode extends AstNode`（`typescript/ast/expressions/expression-ast-node.xl.md:8`）——即这些 shape 没有任何 AST 产出通道。

---

### typescript/tokens/expressions/expression-shape-catalog.xl.md（6211B / 51行；ExpressionShapeCatalog）

- 结构：目录装配层（catalog 工厂）。只产出 `Array<PossibleShape>`，交给 `CatalogGuide` 构造候选集（`core/syntax/catalog-guide.xl.md:34-42`），本身无 shape、无 possible、无 `end`。
- 偏离：
  - `[X1]` ○ 候选目录改由「片段注册区」拼装：每个形态自带 `AppendTo` 静态方法，集合内容与顺序靠 `[A1]…[P6]` 标签和行序维持 — 证据 `expression-shape-catalog.xl.md:89-119`（`// [E-CAT:FRAGMENTS] 以下是各形态片段，每行一个，按 WP id 排序` … `AssignmentPossibleShape.AppendTo(shapes); // [P6]`）。IMPORTANCE 的 catalog guide 只表示「候选数组 + 关联」，没有「候选自注册 + 标签 + 行序」这一层机制。
  - `[X1]` ○ 同一份目录存在两个内容逐行相同的入口：`CreateStatement` 与 `CreateDeclarationInitializer` — 证据 `expression-shape-catalog.xl.md:58-67` 与 `:78-84`（两段 `const shapes = …CreatePrimary(); const operators = …CreateOperators(); for (const shape of operators) { shapes.push(shape); }`）。
- 结论：偏离（2 条，均 ○，机制层）。符合部分：候选数组交给 guide，`Candidates` 由 `CatalogGuide` 自己维护且 `PossibleShapes` 不被改写（`core/syntax/catalog-guide.xl.md:66-70`）；`end` 候选由调用方另传，零候选走 `EndPossible === null` 即抛错，与 R28 一致。

---

### typescript/tokens/expressions/binary-expression-possible-shape.xl.md（4791B / 70行；BinaryExpressionPossibleShape extends PossibleShape）

- 结构：possible（候选）。二元运算符位置：判定「当前格是不是运算符 + 左操作数是否已是形状」，build 时把「左形状 + 运算符」就地替换成 `BinaryExpressionShape` 并**挂载**一个新目录（`RightOperandPossibleShape.Catalog()`）。
- 偏离：
  - `[B1]` ○ 越界返回 `Uncertain` 而非 `Nothing` — 证据 `binary-expression-possible-shape.xl.md:28-30`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）。类型不可表达（`ShapeStates` 无 `Nothing`）。
  - `[B1]` ● `BuildByIndex` 未做越界检查，直接解引用 `host.Data[tokenIndex]`，缺格时抛自定义错误而不是「不建」 — 证据 `binary-expression-possible-shape.xl.md:64-67`（`const token = host.Data[tokenIndex]; if (!(token instanceof Symbol)) { throw new Error("增量变量形状未支持：expression 二元运算符"); }`）；同批 `semicolon-class-element-possible-shape.xl.md:62` 用 `return host` 表达「不建」，说明返回类型可表达该语义，故此处判 ●。
  - `[C3]` ○ 形参 `cache`/`source` 全未使用，既无 get state / set state，也无 share — 证据 `binary-expression-possible-shape.xl.md:25`（签名）与 `:27-58`（整段 Compute 无 `cache.` 调用）。
  - `[U4]` ○ build 把运算符前后的 trivia **插回 `Data`**，关闭时无人剔除 — 证据 `binary-expression-possible-shape.xl.md:78-82`（`const trivia = ItemUtil.TriviaBetween(...)`，`host.Data.splice(leftIndex + 1, trivia.length)`）；`Token.Add` 不过滤 trivia（`core/syntax/token.xl.md:91-97`）。
  - `[X1]` ○ 与 `forms/operator/binary-operator-possible-shape.xl.md` 构成**同一职能的双候选**，谁处理哪种格靠注释约定与一条手写守卫 — 证据 `binary-expression-possible-shape.xl.md:51-57`（`// WP-A2：其余二元运算符让给 BinaryOperatorPossibleShape … if (leftIndex >= 0 && units[leftIndex] instanceof ShapeToken) { return ShapeStates.Reject; }`）。
- 结论：偏离（5 条：B1×2、C3、U4、X1）；挂载路径本身符合 R32（建出后 `MountedUnit = binary` 并配新目录，`:83-85`，不 `TryToClose`）。

---

### typescript/tokens/expressions/numeric-literal-possible-shape.xl.md（3169B / 50行；IncrementalItemPosition，NumericLiteralPossibleShape extends PossibleShape）

- 结构：possible + 一个寄生工具类。`IncrementalItemPosition.AfterPreviousCode`（`:19-33`）被本批与外批多处复用（如 `binary-expression-possible-shape.xl.md:93`）——工具类放在候选文件里。
- 偏离：
  - `[B4]` ● Compute 通过 `ItemUtil.ItemStartCached` 求 item 起点，而该函数是从 `units.length - 1` **反向扫到 0**，即读 `tokenIndex` 之后的数据 — 证据 `numeric-literal-possible-shape.xl.md:47`（`const start = ItemUtil.ItemStartCached(units, cache);`）与 `typescript/tokens/item-util.xl.md:15`（`for (let index = units.length - 1; index >= 0; index--)`）。调用方确实会传更早的格：`typescript/tokens/statements/deferred-bracket-catalog.xl.md:257`（`shape.ComputePossibleShapesByIndex(at, …)`）、`declaration-asi-boundary.xl.md:576`、`statement-shape.xl.md:555`。
  - `[B1]` ○ 越界返回 `Uncertain` — 证据 `numeric-literal-possible-shape.xl.md:40-42`；类型不可表达。
  - `[C3]` ○ cache 只用于存 `ItemStart`（`item-util.xl.md:81-87` 的 `GetItemStart/SetItemStart`），本候选自身无 state；且该「共享」缓存会被 `CatalogGuide.Reset` 整体清空（`core/syntax/catalog-guide.xl.md:117`），等于把 share 当 state 清 — 证据 `numeric-literal-possible-shape.xl.md:47`。
  - `[X1]` ● build 带全局副作用：把新形状登记进模块级注册表 — 证据 `numeric-literal-possible-shape.xl.md:80`（`ExpressionAtomRegistry.RegisterNode(shape);`）与 `typescript/tokens/expressions/forms/shared/expression-atom-registry.xl.md:16,18`（`static field Nodes:Set<any> = new Set()`、`RegisterNode`）。IMPORTANCE 的 possible/build 无任何全局可变注册表，且它使体积结果依赖 build 顺序。
- 结论：偏离（4 条）；正面：basic token 的数据在 build 那一刻就提取进 shape 并丢弃原 token（`:84-90`，`NumericLiteralShape.FromBasicToken` + `token.Replace(shape)`），是 R19/R31 的正例。

---

### typescript/tokens/expressions/semicolon-class-element-possible-shape.xl.md（3137B / 40行；SemicolonClassElementPossibleShape extends PossibleShape）

- 结构：possible。判定与构造全部委派给 `ClassMemberPossibleUtil.Scan`（增量扫描）与 `ClassDeclarationShape.BuildMemberFromCode`。
- 偏离：
  - `[B1]` ○ 越界返回 `Uncertain` — 证据 `semicolon-class-element-possible-shape.xl.md:28-30`；类型不可表达。
  - `[P3]` ○ build 有两条「不建、不关、也不挂」的静默返回：状态不完整时 `return host`，构造返回 null 时也 `return host` — 证据 `semicolon-class-element-possible-shape.xl.md:61-63`（`if (start < 0 || end < start) { return host; }`）与 `:67-69`（`if (built === null) { return host; }`）。R31/R32 只给「立即关闭」与「未关闭+挂载」两个去向；此处是第三去向，而 `CatalogGuide` 仍会 `BuildCount += 1` 并 `Reset`（`catalog-guide.xl.md:102-107`），即「记一次建成但没有产物」。
  - `[P3]` ○ 建出的形状只设 `Parent`，既不 `TryToClose` 也不设置自己的目录，也不 `SignOut` — 证据 `semicolon-class-element-possible-shape.xl.md:76-77`（`built.Parent = host; return built;`）。R31 要求静态工厂式 build 自己收口（对照 `expression-with-type-arguments-shape.xl.md:51`）。
  - `[C3]` ○ 判定状态用**共享槽**承载：`ClassMemberPossibleUtil.CacheKey = PossibleShape.SlotOf(ClassMemberPossibleScan)`（`typescript/tokens/types/class-member-possible-util.xl.md:55`），本文件以 `GetState/SetState` 读写它（`:44`、`:55`），即把 R10 的 share 塞进 R11 的 state 槽；`Reset` 清空后增量进度全丢（`catalog-guide.xl.md:117`）。
- 结论：偏离（4 条）；正面：扫描本身是增量的（`class-member-possible-util.xl.md:765-775` 用 `state.Checked` 游标只扫新格），build 也未每轮重找形状，故不记 R08/C1。

---

### typescript/tokens/expressions/operator-table.xl.md（2292B / 76行；OperatorTable）

- 结构：纯数据表 + 纯函数（运算符 → 优先级/结合性/类别）。无 possible、无 shape、无 IO。
- 偏离：
  - `[X1]` ○ 条件/逗号等帧优先级不在本表，另有三份独立数值且彼此不一致 — 证据 `operator-table.xl.md:81,83`（本表只给 `AssignmentPrecedence = 0`、`CommaPrecedence = -1`）与第二份来源 `typescript/tokens/expressions/shape-operator-stack.xl.md:15`（`ConditionalPrecedence:int = 1`）、`typescript/tokens/statements/statement-operator-body.xl.md:194`（`CondPrecedence:int = 1`）、`typescript/tokens/direct/direct-expression-engine.xl.md:102`（`CondPrecedence:int = 2`，与 1 冲突）。优先级事实因此有两个来源（那三个文件属 50 篇，本批只记位置）。
  - `[X1]` ○ 哨兵复用：未知运算符返回 `-1`，而逗号优先级也定义为 `-1`，两者不可区分，调用方必须绕道常量并写注释解释 — 证据 `operator-table.xl.md:44`（`return -1;`）与 `:83`（`CommaPrecedence:int = -1`）、`statement-operator-body.xl.md:574-575`（`// 优先级只取 OperatorTable.CommaPrecedence … Precedence(",") 仍是未知哨兵 -1、IsBinaryOperator(",") 仍为 false`）。
- 结论：偏离（2 条，均 ○）；同时它是 R18 的**正向证据** —— 全仓唯一的二元运算符数值优先级表，其余五处一律调用它而不自带数字：`operator-shape-map.xl.md:162`、`shape-operator-stack.xl.md:115`、`feas-operator-parser.xl.md:121`、`expression-builder.xl.md:254`（`BinaryPrecedence` 直接 `return OperatorTable.Precedence(text)`）、`forms/operator/reassociation-possible-shape.xl.md:53`。相对次序也与 TS 一致（`**` 15 > 乘法 14 > 加减 13 > 移位 12 > 关系 11 > 相等 10 > `&` 9 > `^` 8 > `|` 7 > `&&` 6 > `||` 5 > `??` 4），`as`/`satisfies` 与关系同级用 `AsPrecedence = 11`（`:59`）。

---

### typescript/tokens/expressions/binary-expression-shape.xl.md（2253B / 45行；BinaryExpressionShape extends ShapeToken）

- 结构：shape。持有 `OperatorPrecedence` 字段，静态工厂 `FromLeftAndOperator` 立即把左操作数、trivia、运算符塞进 `Data`；另有 `SealRightOperand` 与 `Close`。
- 偏离：
  - `[U4]` ○ `Close` 只把未封口子单元 `TryToClose`，**不剔除** `Data` 里的 trivia；而 trivia 是 `Add` 进来的（`binary-expression-possible-shape.xl.md:44-48`、`:78-82`）——关闭后 `Data` ≠ AST children，遗留 basic token — 证据 `binary-expression-shape.xl.md:82-88`（`for (const item of this.Data.slice()) { if (!item.Closed) { item.TryToClose(context); } } this.Closed = true;`）。
  - `[X1]` ○ 自造「封口」步骤 `SealRightOperand`：先 `TryToClose` 自己，再按 `Parent.MountedUnit === this` 调 `Quit()` — 证据 `binary-expression-shape.xl.md:70-77`。IMPORTANCE 的 build 只有「立即关闭」与「挂载后由后续 token 关闭」，没有「挂载体被外部触发的 Seal/Quit」这一机制（R32 也不允许挂载即关闭）。
- 结论：偏离（2 条，均 ○）；正面：`FromLeftAndOperator` 只做字段提取与 `Add`，不重新扫 token，`OperatorPrecedence` 把判定结果记下来供 `NeedsReassociation` 复用（`:53-68`），不违 R08。

---

### typescript/tokens/expressions/arrow-function-shape.xl.md（1757B / 22行；ArrowFunctionShape extends ShapeToken）

- 结构：shape（无 factory 的「被 builder 直接填 Data 的壳」）。`TryToClose` 自己负责关闭子单元与清理；`BindParameterBracket` 是给 bracket 用的静态绑定入口。
- 偏离：
  - `[X1]` ○ `TryToClose` 里自建一次子单元关闭循环，并顺手 splice 掉尾随 trivia，然后才 `super.TryToClose` — 证据 `arrow-function-shape.xl.md:29-39`（`for (let at = this.Data.length - 1; at >= 0; at--) { … unit.TryToClose(context); } while (this.Data.length > 0 && this.Data[this.Data.length - 1].IsTriviaToken) { this.Data.splice(...); }`）。关闭只该由 `Close` 完成（`core/syntax/shape-token.xl.md:58-63`），这里在 close 之前改 `Data`。
  - `[X1]` ○ 关闭之后再回改区间：`super.TryToClose` 之后调 `TrimEndToLastCode()`，注释自述是为抵消「驱动层按文件长度整树 `SignOut`」把箭头签出到尾随空白 — 证据 `arrow-function-shape.xl.md:40-44`（`// EOF 收口时驱动层先按文件长度 SignOut 整棵树 …this.TrimEndToLastCode();`）。这是用一个补偿动作修另一个机制的错误，IMPORTANCE 无此环节。
  - `[P4]` ○ 参数括号的归属不走 `bracket.HandleCloseDispatch`（R15/R16），而由 builder 阶段回调静态方法绑定 — 证据 `arrow-function-shape.xl.md:47-53`（`BindParameterBracket` → `ArrowParamsCatalog.BindArrowParen`）与调用点 `typescript/tokens/expressions/expression-builder.xl.md:2064`（`ArrowFunctionShape.BindParameterBracket(bracket, this.Context);`），另有 `DeferredBracketCatalog`（`:8`、`:59`）作为「延迟括号」通道。
  - `[X1]` ○ 调试报告接口 `Report():string` 把两个 catalog 的报告拼成一个字符串 — 证据 `arrow-function-shape.xl.md:56-60`（`return ArrowParamsCatalog.Report() + " | " + DeferredBracketCatalog.Report();`）。IMPORTANCE 无形状级报告字符串。
- 结论：偏离（4 条，均 ○）；`BindParameterBracket` 对 null 有防御（`:50-52`），无 `ExitOrPre` 覆盖，不涉 R1/R33。

---

### typescript/tokens/expressions/feas-prefix-unary-possible-shape.xl.md（1702B / 20行；FeasPrefixUnaryPossibleShape extends PossibleShape）

- 结构：possible（FEAS 原型候选，配合 `FeasOperatorParser` 与 `FeasRawTokenHost`）。
- 偏离：
  - `[B1]` ○ 越界返回 `Uncertain` — 证据 `feas-prefix-unary-possible-shape.xl.md:22-24`；类型不可表达。
  - `[P3]` ● `BuildByIndex` 无条件抛错，即该候选一旦成为唯一候选，`CatalogGuide`（`catalog-guide.xl.md:102`）就会把解析打断 — 证据 `feas-prefix-unary-possible-shape.xl.md:45-47`（`throw new Error("FeasPrefixUnaryPossibleShape.BuildByIndex: 原型由 FeasOperatorParser 增量建形状");`）。R31/R32 要求 build 必须产出去向（关闭或挂载），这里是「永不成形」。
  - `[C3]` ○ `cache`/`source` 未使用，无 state/share — 证据 `feas-prefix-unary-possible-shape.xl.md:19`（签名）与 `:21-41`（整段无 `cache.`）。
  - `[X1]` ○ 判定里塞了一个不起作用的守卫：`OperatorTable.IsRightAssociative` 只对 `**` 为真，与「是不是前缀运算符」无关，条件恒真 — 证据 `feas-prefix-unary-possible-shape.xl.md:37`（`if (OperatorTable.IsPrefixOperator(text) && !OperatorTable.IsRightAssociative(text))`）与 `operator-table.xl.md:50`（`return text === "**";`）。
- 结论：偏离（4 条：P3 ●、B1 ○、C3 ○、X1 ○）；无 `try/catch`（不违 R23），只看 `units[tokenIndex]`（不违 R22）。

---

### typescript/tokens/expressions/feas-binary-operator-possible-shape.xl.md（1665B / 20行；FeasBinaryOperatorPossibleShape extends PossibleShape）

- 结构：possible（FEAS 原型候选）。
- 偏离：
  - `[B1]` ○ 越界返回 `Uncertain` — 证据 `feas-binary-operator-possible-shape.xl.md:22-24`；类型不可表达。
  - `[P3]` ● `BuildByIndex` 无条件抛错 — 证据 `feas-binary-operator-possible-shape.xl.md:45-47`（`throw new Error("FeasBinaryOperatorPossibleShape.BuildByIndex: 原型由 FeasOperatorParser 增量建形状");`）。
  - `[P2]` ○ 判定只看「这个 token 是不是二元运算符」，不看左操作数是否存在，因此 `a + b` 与 `+ a` 在候选层面无法区分（对照 `binary-expression-possible-shape.xl.md:54-57` 有左操作数守卫）— 证据 `feas-binary-operator-possible-shape.xl.md:37-40`（`if (OperatorTable.IsBinaryOperator(text)) { return ShapeStates.Accept; }`）。
  - `[C3]` ○ `cache`/`source` 未使用 — 证据 `feas-binary-operator-possible-shape.xl.md:19`、`:21-41`。
- 结论：偏离（4 条：P3 ●、B1 ○、P2 ○、C3 ○）。

---

### typescript/tokens/expressions/feas-operand-possible-shape.xl.md（1527B / 18行；FeasOperandPossibleShape extends PossibleShape）

- 结构：possible（FEAS 原型候选，判定「这一格能不能开始一个操作数」）。
- 偏离：
  - `[B1]` ○ 越界返回 `Uncertain` — 证据 `feas-operand-possible-shape.xl.md:21-23`；类型不可表达。
  - `[P3]` ● `BuildByIndex` 无条件抛错 — 证据 `feas-operand-possible-shape.xl.md:42-44`（`throw new Error("FeasOperandPossibleShape.BuildByIndex: 原型由 FeasOperatorParser 增量建形状");`）。
  - `[P2]` ○ 只认 `Bracket("(")` 与 `Common`，符号（标识符/关键字）与已建形状（`ShapeToken`）一律 `Reject`，即真实操作数形态被漏掉 — 证据 `feas-operand-possible-shape.xl.md:28-37`（`if (unit instanceof Bracket) { … } if (unit instanceof Common) { return ShapeStates.Accept; } return ShapeStates.Reject;`）。
  - `[C3]` ○ `cache`/`source` 未使用 — 证据 `feas-operand-possible-shape.xl.md:18`、`:20-38`。
- 结论：偏离（4 条：P3 ●、B1 ○、P2 ○、C3 ○）。

---

### typescript/tokens/expressions/expression-with-type-arguments-shape.xl.md（1524B / 21行；ExpressionWithTypeArgumentsShape extends ShapeToken）

- 结构：shape + 静态工厂。字段 `Expression`、`TypeArguments` 把 basic token 的数据在 build 时提取出来，工厂内签范围、`TryToClose` 收口。
- 偏离：无。
- 结论：符合（R19/R31 正例：`shape.Expression = name; shape.TypeArguments = typeArguments;` 在 build 那一刻取字段 `:36-37`，`SignInToken`/`SignOutToken` 签范围 `:42-49`，`shape.TryToClose(context)` 立即关闭 `:51`；无 possible 参与，无重扫，无 `ExitOrPre`/`ComputePossibleShapes` 覆盖）。唯一可议之处是 `endToken === null` 且无实参时用名字自身签出（`:45-46`），属显式兜底，不是偏离。

---

### typescript/tokens/expressions/expression-catalog-factory.xl.md（1179B / 8行；ExpressionCatalogFactory）

- 结构：目录入口的转发层（两个静态方法都只转调 `ExpressionShapeCatalog` / `RightOperandPossibleShape`）。
- 偏离：
  - `[X1]` ○ 目录入口重复：本文件 `Create`/`CreateRightOperandCatalog` 与 `ExpressionShapeCatalog.CreateDeclarationInitializer`/`CreateRightOperand` 是同一批目录的两个调用面 — 证据 `expression-catalog-factory.xl.md:21`（`return ExpressionShapeCatalog.CreateDeclarationInitializer();`）与 `:27`（`return RightOperandPossibleShape.Catalog();`），对照 `expression-shape-catalog.xl.md:75-84`、`:69-73`。
  - `[X2]` ○ 注释自述存在「旧开关」与 legacy 旁路，且本入口被包在一层兼容说明里 — 证据 `expression-catalog-factory.xl.md:15-20`（`// E0b 之前这里是内联列表 [NumericLiteralPossibleShape, BinaryExpressionPossibleShape] … // legacy 路径不经过本方法（调用点只在旧开关为真时执行）。`）。开关位本身不在本文件，故只记 ○。
- 结论：偏离（2 条，均 ○）；转发不做候选筛选，`PossibleShapes` 未被改写，不违 R26。

---

### typescript/tokens/expressions/feas-raw-token-host.xl.md（898B / 4行；FeasRawTokenHost extends UnitToken）

- 结构：宿主壳。继承 `UnitToken`，但把 `ProcessQueue` 换成 `Template.BasicBranchQueue()`，`Default` 空实现，靠「调度层 +1 吞字符」推进——即把**原始 Token** 包装成 `UnitToken` 供 FEAS 解析器消费。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre` — 证据 `feas-raw-token-host.xl.md:21-25`（`protected method ExitOrPre:(context, buffer, index, value)=>BranchStates` / `return BranchStates.Undo;`）。R33 明确「shape 禁止用 `ExitOrPre` 结束自己，禁止覆盖 `ExitOrPre`」；`ExitOrPre` 在基类已存在（`core/syntax/shape-token.xl.md:65-69`、`unit-token.xl.md:48`），此处显式重写。
  - `[X1]` ● 把原始 Token 冒充成 `UnitToken`：换掉字符处理队列、把 `Default` 做成空实现并声明「空白与未知字符由调度层统一 +1 吞掉」— 证据 `feas-raw-token-host.xl.md:18`（`this.ProcessQueue = Template.BasicBranchQueue();`）与 `:27-30`（`// 空实现：空白与未知字符由调度层统一 +1 吞掉。`）。IMPORTANCE 中 `UnitToken` 的消费通道是 `Process`/`Default`/`ExitOrPre` 三件，这里绕开全部三条另起一条旁路。
- 结论：偏离（2 条，均 ●）；该类没有任何 shape 语义，是 FEAS 旁路的入口（`FeasOperatorParser` 属 50 篇）。

---

### typescript/tokens/expressions/expression-continuation-catalog.xl.md（649B / 10行；ExpressionContinuationCatalog）

- 结构：目录查询器。`Claims` 用「重新构造整份表达式目录 + 逐个问 `ContinuationClaim`」的方式回答「这一格还该不该继续等」。
- 偏离：
  - `[C1]` ● 每次调用都新建一份完整候选目录（30 个 `new`）再线性遍历，全部靠 `AppendFragments` 的静态 `AppendTo` 现场注册 — 证据 `expression-continuation-catalog.xl.md:18-23`（`const shapes:Array<PossibleShape> = ExpressionShapeCatalog.CreateDeclarationInitializer(); for (const shape of shapes) { if (shape.ContinuationClaim(units, tokenIndex)) {`），配 `expression-shape-catalog.xl.md:58-67`（`CreateStatement` → `CreatePrimary` + `CreateOperators` 全量装配）。它被放在候选的 compute 里逐格调用（`typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md:72`，`if (ExpressionContinuationCatalog.Claims(units, tokenIndex)) {`），即每轮 compute 重建并全量遍历，未把结果记进 cache 复用 —— R08 明列的「差」。
  - `[X1]` ○ `Claims` 依赖一个 IMPORTANCE 未定义的「认领」协议：候选通过覆盖 `ContinuationClaim` 自报是否继续等待（默认 false，`core/syntax/possible-shape.xl.md:59-64`；本仓 16 个 form 候选覆盖它，例如 `forms/primary/parenthesized-possible-shape.xl.md:74`）— 证据 `expression-continuation-catalog.xl.md:20`。R04/R26 的候选语义只有 `ComputeByIndex` 的三种状态，没有第四个「认领」谓词。
- 结论：偏离（2 条：C1 ●、X1 ○）；越界返回 `false`（`:15-17`），对 `bool` 返回类型是正确表达。

---

### typescript/tokens/expressions/synthetic-expression-shape.xl.md（404B / 1行；SyntheticExpressionShape extends ShapeToken）

- 结构：shape 标记壳，且注释声明「无源码形态：转换阶段合成的表达式节点，源码里写不出来」。
- 偏离：
  - `[S3]` ○ 形状树里保留了一个**没有 AST 对应物、也不来自源码**的壳类 — 证据 `synthetic-expression-shape.xl.md:11-13`（`无源码形态：转换阶段合成的表达式节点，源码里写不出来。`）与 `typescript/ast/expressions/expression-ast-node.xl.md:8`（表达式 AST 只有一个无成员基类，无任何合成节点类）。R18 要求 shape 树与 TS AST 同构；壳类留在树里即不同构。
  - `[S4]` ○ AST 不由它产出 — 证据 `synthetic-expression-shape.xl.md:9`（`# class SyntheticExpressionShape extends ShapeToken`，类体只有 `constructor`）；全仓 `ParseFromShape` 仅 `typescript/ast/declarations/import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：偏离（2 条，均 ○）。

---

### typescript/tokens/expressions/function-expression-shape.xl.md（345B / 1行；FunctionExpressionShape extends ShapeToken）

- 结构：shape 标记壳（无字段、无 factory），类体只有 `constructor` 转调 `super`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `function-expression-shape.xl.md:9`（`# class FunctionExpressionShape extends ShapeToken`）与 `:15-19`（只有 `constructor`）；`typescript/ast/expressions/expression-ast-node.xl.md:8` 是唯一表达式 AST 类（空基类），全仓 `ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与，不涉 R22–R35；S4 ○ 为全仓性缺口，不重复计为本文件独立设计错误）。

---

### typescript/tokens/expressions/satisfies-expression-shape.xl.md（345B / 1行；SatisfiesExpressionShape extends ShapeToken）

- 结构：shape 标记壳（无字段、无 factory），只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `satisfies-expression-shape.xl.md:9`、`:15-19`；表达式 AST 只有空基类 `expression-ast-node.xl.md:8`，全仓 `ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/yield-expression-shape.xl.md（345B / 1行；YieldExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `yield-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/object-literal-expression-shape.xl.md（344B / 1行；ObjectLiteralExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `object-literal-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/type-assertion-expression-shape.xl.md（340B / 1行；TypeAssertionExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `type-assertion-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。注：`<T>x` 是 TS 断言语法，不涉及 tsx（不违 R36）。

---

### typescript/tokens/expressions/parenthesized-expression-shape.xl.md（339B / 1行；ParenthesizedExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `parenthesized-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/array-literal-expression-shape.xl.md（338B / 1行；ArrayLiteralExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `array-literal-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/semicolon-class-element-shape.xl.md（338B / 1行；SemicolonClassElementShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`；实际由 `ClassDeclarationShape.BuildMemberFromCode` 直建（`semicolon-class-element-possible-shape.xl.md:66`）。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `semicolon-class-element-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/template-expression-shape.xl.md（338B / 1行；TemplateExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `template-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/class-expression-shape.xl.md（336B / 1行；ClassExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `class-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/conditional-expression-shape.xl.md（335B / 1行；ConditionalExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `conditional-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。注：`?:` 的优先级不在 `OperatorTable`，由 `ShapeOperatorStack.ConditionalPrecedence` 另管（见 `operator-table.xl.md` 一节）。

---

### typescript/tokens/expressions/omitted-expression-shape.xl.md（335B / 1行；OmittedExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `omitted-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/tagged-template-expression-shape.xl.md（335B / 1行；TaggedTemplateExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `tagged-template-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/template-span-shape.xl.md（333B / 1行；TemplateSpanShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `template-span-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/element-access-expression-shape.xl.md（332B / 1行；ElementAccessExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `element-access-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/property-access-expression-shape.xl.md（332B / 1行；PropertyAccessExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `property-access-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/as-expression-shape.xl.md（331B / 1行；AsExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `as-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/delete-expression-shape.xl.md（331B / 1行；DeleteExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `delete-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/postfix-unary-expression-shape.xl.md（330B / 1行；PostfixUnaryExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `postfix-unary-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/type-of-expression-shape.xl.md（329B / 1行；TypeOfExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `type-of-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/prefix-unary-expression-shape.xl.md（328B / 1行；PrefixUnaryExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `prefix-unary-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/await-expression-shape.xl.md（327B / 1行；AwaitExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `await-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/meta-property-shape.xl.md（327B / 1行；MetaPropertyShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `meta-property-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/spread-element-shape.xl.md（326B / 1行；SpreadElementShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `spread-element-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/new-expression-shape.xl.md（325B / 1行；NewExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `new-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/void-expression-shape.xl.md（325B / 1行；VoidExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `void-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/non-null-expression-shape.xl.md（324B / 1行；NonNullExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `non-null-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

### typescript/tokens/expressions/call-expression-shape.xl.md（322B / 1行；CallExpressionShape extends ShapeToken）

- 结构：shape 标记壳，只有 `constructor`。
- 偏离：
  - `[S4]` ○ AST 不由它产出 — 证据 `call-expression-shape.xl.md:9`、`:15-19`；`expression-ast-node.xl.md:8`，`ParseFromShape` 仅 `import-declaration-ast-node.xl.md:28` 一处且抛「未实现」。
- 结论：符合（纯标记，无 possible 参与；S4 ○ 为全仓性缺口）。

---

## 本批统计

**文件 43；有偏离 14；符合 29。**

| 编号 | ● | ○ | 合计 |
| --- | --- | --- | --- |
| `X1` 设计外挂 | 2 | 12 | 14 |
| `B1` 越界未返回 Nothing | 1 | 6 | 7 |
| `S4` AST 不由 shape 产出 | 0 | 29 | 29 |
| `C3` cache 语义偏离 | 0 | 6 | 6 |
| `P3` build 去向偏离 | 3 | 2 | 5 |
| `P2` 候选判定语义偏离 | 0 | 2 | 2 |
| `U4` basic token 用后未丢弃 | 0 | 2 | 2 |
| `B4` 查看 tokenIndex 之后 | 1 | 0 | 1 |
| `C1` 每轮重扫 | 1 | 0 | 1 |
| `P4` bracket 晋升偏离 | 0 | 1 | 1 |
| `R1` 覆盖 ExitOrPre | 1 | 0 | 1 |
| `S3` shape 树与 AST 不同构 | 0 | 1 | 1 |
| `X2` legacy 旁路（注释自述） | 0 | 1 | 1 |
| **合计** | **9** | **62** | **71** |

其余编号本批为 0：`S1`、`S2`、`P1`、`C2`、`U1`、`U2`、`U3`、`B2`（43 个文件内无一处 `try/catch`）、`B3`、`R2`、`X3`、`D1`（43 个文件 prose 列全为 0，无围栏外散文）。

**计数口径**：`S4` 的 29 条是同一全仓缺口的逐文件标注，不计入「有偏离 14」——那 14 个文件的结论是「偏离」，其 `S4` 之外的独立问题才是各自的偏离条目。

**本批 ● 级问题（按影响排序）**

1. `P3` ● 三个 FEAS 候选的 `BuildByIndex` 恒抛（`feas-prefix-unary-possible-shape:45-47`、`feas-binary-operator-possible-shape:45-47`、`feas-operand-possible-shape:42-44`）：候选一旦被唯一化，`CatalogGuide` 直接抛错中断解析。
2. `B4` ● `numeric-literal-possible-shape:47` 经 `ItemStartCached` 从 `units.length - 1` 反向扫，读 `tokenIndex` 之后的数据；调用方（`deferred-bracket-catalog:257` 等）会传更早的格。
3. `X1` ● `numeric-literal-possible-shape:80` build 写全局 `ExpressionAtomRegistry`（模块级 `Set`，`expression-atom-registry:16,18`），产物依赖 build 顺序。
4. `C1` ● `expression-continuation-catalog:18-23` 每次查询重建整份 30 候选目录并线性遍历，无 cache 复用。
5. `R1` ● `feas-raw-token-host:21-25` 覆盖 `ExitOrPre` 返回 `Undo`，且（`X1` ●）用原始 Token 换掉 `ProcessQueue`、`Default` 空实现，另起一条字符消费旁路。
6. `B1` ● `binary-expression-possible-shape:64-67` build 未检查越界即解引用 `host.Data[tokenIndex]`，缺格时抛「未支持」错误而非 `return host`。
