# 42 types 小文件批：类型层数据壳与成员壳（审计）

审计对象：`typescript/tokens/types/` 下 35 个 shape 文件。判据见 [01-rules.md](01-rules.md)，事实行（字节 / 代码行）取自 [_facts/typescript-tokens-types.md](_facts/typescript-tokens-types.md)，证据行号以 `read` 返回值为准。只读源码，未改任何源码与 `docs/IMPORTANCE.md`。

两条本批共用的前置事实（各节只在用到时再引具体行）：

- **类型层没有 `ParseFromShape`**：全仓唯一实现仍是抛「未实现」的桩（`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`），`typescript/ast/` 下也没有任何类型节点类；类型位置的产物就是 `TypeBuilder` 在解析现场拼出的 shape 树（`Parse*` → `new` 形状 → 填字段 → `Add` → `SpanNode`/`SpanLeaf` 收口）。所以本批 28 个「数据壳」逐节记 `S4` ○，只写它自己的构造点。
- **成员层的 5 个成员 shape 被当 raw 壳用**：`MemberShellCatalog.Create` 把 `host.Data[start..end]` 整段 `slice` 进 `shell.Data` 并 `host.MountedUnit = shell`（`member-shell-catalog.xl.md:240`、`:269-275`），收口时再 `Unwrap` 回 raw、整段重建（`:764-791`、`:734-760`）。

### typescript/tokens/types/get-accessor-shape.xl.md（1627B / 14 行；GetAccessorShape）
- 结构：成员 shape，但类体零字段、零工厂——只有构造、`ExitOrPre`、`ComputePossibleShapes`、`OnBracketCreatedEvent` 四节，全部转调 `MemberShellCatalog`；它是成员壳目录的壳类，`Data` 里装的是 raw 单元。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre`，在体括号闭合时返回 `Reload` 接管关闭派发——R33 明令 shape 禁止覆盖、禁止用 `ExitOrPre` 结束自己；基类本来只回 `Undo` — 证据 `get-accessor-shape.xl.md:28-36`（`if (MemberShellCatalog.IsOpen(this)) { if (MemberShellCatalog.HandOffOnBodyClose(this, value, context)) { return BranchStates.Reload; } } return BranchStates.Undo;`）、对照 `core/syntax/shape-token.xl.md:65-69`（`return BranchStates.Undo;`）。
  - `[R2]` ● 覆盖 `ComputePossibleShapes`，壳打开期间每轮都改走 `HeadCompute`，绕开本类经 `CatalogGuide` 的那条候选收敛 — 证据 `get-accessor-shape.xl.md:39-45`（`if (MemberShellCatalog.IsOpen(this)) { return MemberShellCatalog.HeadCompute(this, context); }`）、对照 `core/syntax/unit-token.xl.md:22-29`（基类 `ComputePossibleShapes` 只转 `CatalogGuide`）。
  - `[P2]` ○ 走到 `HeadCompute` 后 R26–R30 的淘汰/终结/零候选/唯一候选都不再发生，只剩 `Nothing`/`Waiting`/`Built` 三种回值 — 证据 `member-shell-catalog.xl.md:682`（`return ComputePossibleShapesStates.Nothing;`）、`:708-715`（`return ComputePossibleShapesStates.Waiting;` … `return ComputePossibleShapesStates.Built;`）。
  - `[S3]` ● 形状树里留壳类与 raw basic token：`Create` 把 `[start,end]` 的原始单元逐个 `Add` 进这只 shape，`Data` 此刻是 raw 列表，AST 要等收口时整段重建 — 证据 `member-shell-catalog.xl.md:269-275`（`for (const unit of consumed) { shell.Add(unit); } … host.Data.splice(start, consumed.length, shell); host.MountedUnit = shell;`）、本文件 `:16-26`（类体只有构造，无任何 AST 字段）。
  - `[S4]` ○ 本类不产出 AST，也没有 `ParseFromShape`：成员内容由 `ClassDeclarationShape.BuildMembers` 从 raw 重建后 `new GetAccessorShape(...)` 再逐子节点拼出 — 证据 `typescript/tokens/declarations/class-declaration-shape.xl.md:1260-1304`（`memberShape = new GetAccessorShape(host.Template); … memberShape.TryToClose(context);`）。
- 结论：偏离（5 条）。补注：`OnBracketCreatedEvent` 覆盖的是 `UnitToken` 的空钩子（`core/syntax/unit-token.xl.md:40-41`），本身不违规；它把 `(`/`{` 创建格转给 `MemberShellCatalog.OnBracketCreated`（`:647-675`）。

### typescript/tokens/types/constructor-shape.xl.md（1622B / 14 行；ConstructorShape）
- 结构：成员 shape，零字段零工厂；方法体与 `get-accessor-shape` 逐字同构，壳打开时把关闭与每轮 compute 都交给成员壳目录。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre` 并用它改写自己的结束路径（`Reload`） — 证据 `constructor-shape.xl.md:28-36`（`if (MemberShellCatalog.IsOpen(this)) { … return BranchStates.Reload; }`）、对照 `core/syntax/shape-token.xl.md:65-69`。
  - `[R2]` ● 覆盖 `ComputePossibleShapes`，壳打开时不经 `CatalogGuide` — 证据 `constructor-shape.xl.md:39-45`（`return MemberShellCatalog.HeadCompute(this, context);`）、对照 `core/syntax/unit-token.xl.md:22-29`。
  - `[P2]` ○ 候选收敛被 `HeadCompute` 的 `Waiting`/`Built` 二态取代 — 证据 `member-shell-catalog.xl.md:708-715`。
  - `[S3]` ● 壳持有 raw 单元：`Create` 把整段原文塞进 `shell.Data`，收口前没有 AST children — 证据 `member-shell-catalog.xl.md:269-275`、本文件 `:16-26`（零字段）。
  - `[S4]` ○ AST 由 `BuildMembers` 直建（`new ConstructorShape(...)` 后手工 `Add`），本类无 `ParseFromShape` — 证据 `class-declaration-shape.xl.md:1265-1304`（`memberShape = new ConstructorShape(host.Template);`）。
- 结论：偏离（5 条）。补注：`:1279-1289` 的构造特判（constructor 不加名字/类型参数）在 `BuildMembers` 里，而不在本类，形状本身对「构造」这一语义零约束。

### typescript/tokens/types/method-declaration-shape.xl.md（1618B / 14 行；MethodDeclarationShape）
- 结构：成员 shape，零字段零工厂；与 `get/set-accessor`、`constructor` 同一模板，是成员壳目录最常落的壳（方法头）。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre`，体括号闭合时转 `HandOffOnBodyClose` 并 `Reload` — 证据 `method-declaration-shape.xl.md:28-36`（`if (MemberShellCatalog.HandOffOnBodyClose(this, value, context)) { return BranchStates.Reload; }`）。
  - `[R2]` ● 覆盖 `ComputePossibleShapes`，壳打开时整轮交给 `HeadCompute` — 证据 `method-declaration-shape.xl.md:39-45`（`return MemberShellCatalog.HeadCompute(this, context);`）、对照 `core/syntax/unit-token.xl.md:22-29`。
  - `[P2]` ○ 方法成员的「成不成立/何时收口」由 `HeadCompute` 的边界判定定死，R26–R30 不再参与 — 证据 `member-shell-catalog.xl.md:684-715`（`WrapAt` → `FinalizeShell` → `Waiting`/`Built`）。
  - `[S3]` ● 壳里装 raw：`Data` 在 `Create` 之后是原文单元列表，形状树含壳类与 basic token — 证据 `member-shell-catalog.xl.md:240`、`:269-275`。
  - `[S4]` ○ 方法成员的全部 AST 内容由 `BuildMembers` 从 raw 重建（名字/类型参数/参数/返回类型/函数体逐个 `Add`），本类无 `ParseFromShape` — 证据 `class-declaration-shape.xl.md:1268-1304`。
- 结论：偏离（5 条）。补注：本类同时被 `NewShell`（`member-shell-catalog.xl.md:210`）、`BuildMembers`（`class-declaration-shape.xl.md:1268`）、`ExpressionBuilder`（`expression-builder.xl.md:1631`）、`direct-object-member-assembly`（`:132`）四处各自 `new`，构造契约分散在四个文件里。

### typescript/tokens/types/set-accessor-shape.xl.md（1617B / 14 行；SetAccessorShape）
- 结构：成员 shape，零字段零工厂；与 `get-accessor-shape` 只差类名，`Data` 装 raw，行为全在壳目录。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre` 并以 `Reload` 结束当前字符 — 证据 `set-accessor-shape.xl.md:28-36`（`return BranchStates.Reload;`）、对照 `core/syntax/shape-token.xl.md:65-69`。
  - `[R2]` ● 覆盖 `ComputePossibleShapes` — 证据 `set-accessor-shape.xl.md:39-45`（`return MemberShellCatalog.HeadCompute(this, context);`）。
  - `[P2]` ○ 候选判定被 `HeadCompute` 的 `Nothing`/`Waiting`/`Built` 取代 — 证据 `member-shell-catalog.xl.md:682`、`:708-715`。
  - `[S3]` ● 壳持有 raw basic token，关闭后才由目录重建 — 证据 `member-shell-catalog.xl.md:269-275`、本文件 `:16-26`。
  - `[S4]` ○ AST 由 `BuildMembers` 产出（`new SetAccessorShape(...)`），本类无 `ParseFromShape` — 证据 `class-declaration-shape.xl.md:1263-1304`。
- 结论：偏离（5 条）。

### typescript/tokens/types/property-declaration-shape.xl.md（1370B / 11 行；PropertyDeclarationShape）
- 结构：成员 shape，零字段零工厂；只有构造、`ExitOrPre`、`ComputePossibleShapes` 三节——同类里唯一不接 `OnBracketCreatedEvent` 的一个（代码行也少 3 行）。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre`（`Reload` 结束路径） — 证据 `property-declaration-shape.xl.md:27-35`（`if (MemberShellCatalog.IsOpen(this)) { if (MemberShellCatalog.HandOffOnBodyClose(this, value, context)) { return BranchStates.Reload; } } return BranchStates.Undo;`）。
  - `[R2]` ● 覆盖 `ComputePossibleShapes` — 证据 `property-declaration-shape.xl.md:38-44`（`return MemberShellCatalog.HeadCompute(this, context);`）。
  - `[P1]` ○ 唯一缺 `OnBracketCreatedEvent` 的成员壳：initializer 里的 `(`/`{` 创建格不通知壳目录，R13 的「bracket create 就触发」在这条成员上只能靠 `ExitOrPre`/`ComputePossibleShapes` 事后兜底 — 证据 `property-declaration-shape.xl.md:21-44`（三节之后文件即结束）、对照 `get-accessor-shape.xl.md:48-53`（`MemberShellCatalog.OnBracketCreated(this, bracket, context);`）。
  - `[P2]` ○ 同上，候选收敛降为 `HeadCompute` 的二态 — 证据 `member-shell-catalog.xl.md:702-715`。
  - `[S3]` ● 壳持有 raw 单元（属性声明整段原文进 `shell.Data`） — 证据 `member-shell-catalog.xl.md:269-275`、本文件 `:15-25`（零字段）。
  - `[S4]` ○ 属性的名字/问号/类型/初始化全部由 `BuildMembers` 现场重建后再 `new PropertyDeclarationShape(...)` 拼 — 证据 `class-declaration-shape.xl.md:1307-1444`（`const property = new PropertyDeclarationShape(host.Template);`）。
- 结论：偏离（6 条）。

### typescript/tokens/types/decorator-shape.xl.md（903B / 9 行；DecoratorShape）
- 结构：leaf shape + 静态工厂 `FromParts(atToken, expression, pos, context)`：签 `@` 的入点与表达式的出点、把表达式挂成唯一子节点、`TryToClose` 立即关闭（R31 的「立即关闭」去向）。
- 偏离：无（符合：R31——工厂内 `SignInToken`/`SignOutToken`/`TryToClose` 一条龙，`:31-37`；R19/R20——`Expression` 字段与 `Add(expression)` 同指一个已建好的子形状，`@` 符号只用来定区间、不进 `Data`，关闭后 `Data` 只剩表达式，与 TS `Decorator.expression` 同构；R35——`@` 用后即丢）。
- 结论：符合。补注：表达式子树来自 `ExpressionBuilder`（`type-builder.xl.md:1649-1659`），那是另一条管线的 `S4`，不在本文件计；`Expression` 字段与 `Data[0]` 双重表示同一节点，读哪边都不会丢数据。

### typescript/tokens/types/this-type-shape.xl.md（822B / 10 行；ThisTypeShape）
- 结构：leaf shape + 静态工厂 `FromBasicToken(token, context)`：从 basic token 的 `SourceRange` 取入点/出点、`TryToClose` 立即关闭；没有字段，因为 `this` 的语义全在类名里。
- 偏离：无（符合：R31——工厂内 `SignIn`/`SignOut`/`TryToClose`（`:26-34`），是类型层仅有的两个真工厂之一；R19/R20——单 token 叶子，无子节点、无残留 basic token；R22/B1 不涉及——不读任何 `Data[index]`）。
- 结论：符合。补注：同一个形状还有第二个构造入口——`ParseTypePredicate` 里 `this.SpanLeaf(new ThisTypeShape(this.Template), thisIndex)`（`type-builder.xl.md:2123`），与工厂等价但不共用，属重复实现。

### typescript/tokens/types/mapped-type-shape.xl.md（725B / 1 行；MappedTypeShape）
- 结构：shape 层纯数据节点：5 个字段（`ReadonlyToken`/`TypeParameter`/`QuestionToken`/`NameType`/`Type`）+ 只转调 `super(template)` 的构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、也没有 `ParseFromShape`：字段由 `TypeBuilder.ParseMappedType` 现场填、子节点现场挂、末尾 `TryToClose` — 证据 `mapped-type-shape.xl.md:19-27`（五个 `Token | null` 字段）、`type-builder.xl.md:2603-2631`（`shape.ReadonlyToken = readonlyToken; … shape.TryToClose(this.Context);`）。
  - `[X1]` ○ `NameType` 不是本层的解析结果，而是从内层 builder 的**字段** `MappedNameType` 读出来的出参通道（没有返回值契约） — 证据 `type-builder.xl.md:2607`（`shape.NameType = inner.MappedNameType;`）、`:2652`（`inner.MappedNameType = null;`）、`:2666`（`this.MappedNameType = inner.MappedNameType;`）。
- 结论：偏离（2 条）。补注：`-readonly`/`-?` 的 `-`/`+` 只以 `MinusTokenShape`/`PlusTokenShape` 进 `ReadonlyToken`/`QuestionToken`（`:2536-2548`、`:2562-2569`），字段名叫 `ReadonlyToken` 却可能是 `-`，字段语义比 TS 的 `readonlyToken` 更宽。

### typescript/tokens/types/conditional-type-shape.xl.md（614B / 1 行；ConditionalTypeShape）
- 结构：shape 层纯数据节点：4 个字段（`CheckType`/`ExtendsType`/`TrueType`/`FalseType`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：四个分支类型由 `ParseType` 现场解析后直接赋字段并 `Add`，`SpanNode` 收口 — 证据 `conditional-type-shape.xl.md:17-23`（四个 `Token | null` 字段）、`type-builder.xl.md:396-405`（`shape.CheckType = checkType; … return this.SpanNode(shape, start, this.At - 1);`）。
- 结论：偏离（1 条）。补注：字段与 children 顺序一一对应（`:401-404`），`extends`/`?`/`:` 三个符号不进 `Data`（用后即丢，R35 成立）；嵌套条件类型（`A extends B ? C : D extends E ? F : G`）靠 `ParseType` 递归自然右结合，形状层没有额外机制。

### typescript/tokens/types/type-parameter-shape.xl.md（607B / 1 行；TypeParameterShape）
- 结构：shape 层纯数据节点：4 个字段（`TypeParameterName`/`Type`/`DefaultType`/`VarianceTokens`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：名字/约束/默认值/修饰符由 `ParseTypeParameter` 现场建后填字段并 `Add` — 证据 `type-parameter-shape.xl.md:18-24`、`type-builder.xl.md:2734-2749`（`shape.TypeParameterName = name; … return this.SpanNode(shape, start, this.At - 1);`）。
- 结论：偏离（1 条）。补注：`VarianceTokens` 不只收 `in`/`out`，还收 `const`（`type-builder.xl.md:2708-2719`），名字与实际内容不符；同一形状还被 `ParseInferType` 借去当 `infer R extends A` 的载体（`:1995-2021`），两处对 `Type` 字段的语义（约束 vs 默认）不同。

### typescript/tokens/types/parameter-shape.xl.md（606B / 1 行；ParameterShape）
- 结构：shape 层纯数据节点：4 个字段（`ParameterName`/`QuestionToken`/`Type`/`RestToken`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：参数名/问号/类型/`...` 全由 `ParseParameter` 现场建形状后赋字段并 `Add` — 证据 `parameter-shape.xl.md:18-24`、`type-builder.xl.md:1715-1734`（`parameter.ParameterName = name; … return this.SpanNode(parameter, paramStart, this.At - 1);`）。
- 结论：偏离（1 条）。补注：装饰器只作为 children 进 `Data`（`type-builder.xl.md:1720-1722`），类里没有 `Modifiers`/`Decorators` 字段，TS `Parameter.modifiers` 在属性面没有落点（树结构仍与 AST 一致，不另计编号）；解构参数直接塞 `ObjectBindingPatternShape`/`ArrayBindingPatternShape`（`:1682-1689`），本类不区分。

### typescript/tokens/types/import-type-shape.xl.md（585B / 1 行；ImportTypeShape）
- 结构：shape 层纯数据节点：4 个字段（`Argument`/`AssertClause`/`Qualifier`/`TypeArguments`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：模块字符串、attributes、限定名、类型实参由 `ParseImportType` 现场建后赋字段 — 证据 `import-type-shape.xl.md:17-23`、`type-builder.xl.md:2330-2354`（`shape.Argument = argument; … shape.TryToClose(this.Context);`）。
  - `[U1]` ○ 两个创建点字段覆盖不一致：`typeof import("m").A<B>` 那条路径只写三个字段、既不解析也不写 `TypeArguments`，于是 `<B>` 这一段不会被消费进形状（既不在字段也不在 children） — 证据 `type-builder.xl.md:1939-1959`（只 `imported.Argument/AssertClause/Qualifier` 三行赋值，之后直接 `TryToClose`）、对照 `:2328`/`:2334`（`typeArguments = this.ParseTypeArguments();` … `shape.TypeArguments = typeArguments;`）。
- 结论：偏离（2 条）。补注：attributes 不是 build 时提取的——`ParseImportTypeAttributes` 重新遍历 `bracket.Data`、按 `,` 手工切组再造 `ImportAttributeShape`（`type-builder.xl.md:2151-2229`），这一条已记在 `40-types-builder` 的 `U1` 里，本文件只承担「字段存在但没有生产者」的部分。

### typescript/tokens/types/type-predicate-shape.xl.md（582B / 1 行；TypePredicateShape）
- 结构：shape 层纯数据节点：3 个字段（`AssertsToken`/`ParameterName`/`Type`）+ 构造，零方法；`this is` 的 `this` 侧用 `ThisTypeShape` 叶子。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`asserts`/名字/`is` 之后的类型由 `ParseTypePredicate` 现场建后赋字段并 `Add` — 证据 `type-predicate-shape.xl.md:18-22`、`type-builder.xl.md:2137-2148`（`shape.AssertsToken = asserts; … return this.SpanNode(shape, start, this.At - 1);`）。
- 结论：偏离（1 条）。补注：`is` 只用来切分、不进任何字段；`asserts x`（无 `is`）允许 `Type === null`（`:2127-2135`），字段的可空组合比 TS 的 `TypePredicateNode` 多一态。

### typescript/tokens/types/constructor-type-shape.xl.md（547B / 1 行；ConstructorTypeShape）
- 结构：shape 层纯数据节点：3 个字段（`AbstractToken`/`Parameters`/`ReturnType`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`abstract`/参数表/返回类型由 `ParseConstructorType` 现场建后赋字段，`new` 与 `=>` 用后即丢 — 证据 `constructor-type-shape.xl.md:17-21`、`type-builder.xl.md:2075-2089`（`shape.AbstractToken = abstractToken; … return this.SpanNode(shape, start, this.At - 1);`）。
- 结论：偏离（1 条）。补注：泛型构造类型 `new <U>(a: U) => A` 的 `U` 只进 children（`:2057-2061`、`:2082-2084`），类里没有 `TypeParameters` 字段，属性面无落点（树结构仍与 AST 一致，不另计编号）。

### typescript/tokens/types/call-signature-shape.xl.md（521B / 1 行；CallSignatureShape）
- 结构：shape 层纯数据节点：3 个字段（`Parameters`/`ReturnType`/`MemberModifiers`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：类型字面量里的 `(a: A): B` 由 `ParseTypeMember` 两条分支各自 `new CallSignatureShape` 并现场填字段 — 证据 `call-signature-shape.xl.md:16-20`、`type-builder.xl.md:1103-1119`（`callShape.Parameters = callParameters; … return this.SpanTypeMember(callShape, start);`）、`:1132-1141`（第二条同类分支）。
- 结论：偏离（1 条）。补注：类型参数只进 children（`:1110-1112`），无 `TypeParameters` 字段；两条分支对 `MemberModifiers` 的填充不一致（`:1106` 有、`:1132-1141` 无），同一个类因此有两种字段组合。

### typescript/tokens/types/function-type-shape.xl.md（520B / 1 行；FunctionTypeShape）
- 结构：shape 层纯数据节点：2 个字段（`Parameters`/`ReturnType`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`(a: A) => B` 与泛型形式 `<T>(a: T) => T` 由两条 `Parse*` 各自 `new FunctionTypeShape` 现场拼 — 证据 `function-type-shape.xl.md:18-20`、`type-builder.xl.md:1550-1564`（`shape.Parameters = parameters; … return this.SpanNode(shape, start, this.At - 1);`）、`:1534-1544`（泛型分支）。
- 结论：偏离（1 条）。补注：泛型分支的类型参数只 `Add` 进 children（`:1535-1537`），没有 `TypeParameters` 字段；`type-alias-declaration-shape.xl.md:540` 另有一处 `new FunctionTypeShape`，构造点第三个。

### typescript/tokens/types/type-reference-shape.xl.md（498B / 1 行；TypeReferenceShape）
- 结构：shape 层纯数据节点：2 个字段（`TypeName`/`TypeArguments`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：名字由 `ParseName`/`MakeQualifiedName` 建、实参由 `ParseTypeArguments` 建，然后现场赋字段并逐个子节点 `Add` — 证据 `type-reference-shape.xl.md:18-20`、`type-builder.xl.md:1821-1828`（`shape.TypeName = typeName; shape.TypeArguments = typeArguments; … return this.SpanNode(shape, start, this.At - 1);`）。
- 结论：偏离（1 条）。补注：`TypeArguments` 与 children 尾部是两份同元素数组，真正进 AST 的是 `Data`；`A.B<C>` 的限定名由 `QualifiedNameShape` 承担，本类不重复。

### typescript/tokens/types/indexed-access-type-shape.xl.md（490B / 1 行；IndexedAccessTypeShape）
- 结构：shape 层纯数据节点：2 个字段（`ObjectType`/`IndexType`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`A[B]` 的对象类型沿用上一层已建形状、索引类型由**内层 builder** 解析，再现场赋字段并 `Add` 两个子节点 — 证据 `indexed-access-type-shape.xl.md:17-19`、`type-builder.xl.md:606-619`（`shape.ObjectType = type; shape.IndexType = indexType; … shape.TryToClose(this.Context);`）。
- 结论：偏离（1 条）。补注：`]` 里的内容整段交给 `inner.Load(bracket.Data, base)` 重解析（`:593-602`），是 `40-types-builder` 记为 `C2` 的那条全量重建路径在本文件的落点。

### typescript/tokens/types/template-literal-type-shape.xl.md（489B / 1 行；TemplateLiteralTypeShape）
- 结构：shape 层纯数据节点：2 个字段（`Head`/`Spans`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：头段/各 span 由 `ParseTemplateType` 现场建，`expression.Add(head)` 起逐个 `Add(span)` — 证据 `template-literal-type-shape.xl.md:17-19`、`type-builder.xl.md:2393-2476`（`const expression = new TemplateLiteralTypeShape(this.Template); … expression.TryToClose(this.Context);`）。
  - `[U1]` ● 两个字段一个都没被写过：`Head` 与 `Spans` 全仓没有赋值点（`expression.Add(head)`、`expression.Add(span)` 只进 `Data`），字段永远是 `null`/`[]` — 证据 `template-literal-type-shape.xl.md:17-19`、`type-builder.xl.md:2404`（`expression.Add(head);`）、`:2466`（`expression.Add(span);`），以及全仓 `.Head =` 只在 `export-declaration-possible-shape`/`import-clause-possible-shape` 的状态对象上出现，与本类无关。
- 结论：偏离（2 条）。补注：`Data` 本身是对的（`[head, span…]`，与 TS `TemplateLiteralType.head/spans` 同序），坏的只是「build 那一刻提取到字段」这一步没做。

### typescript/tokens/types/literal-type-shape.xl.md（478B / 1 行；LiteralTypeShape）
- 结构：shape 层纯数据节点：1 个字段（`Literal`）+ 构造，零方法；字符串/数字/布尔/null/bigint 字面量都套这一层。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`MakeLiteralType` 与负数字面量分支各自 `new LiteralTypeShape` 后赋 `Literal`、`Add`、`SpanNode` — 证据 `literal-type-shape.xl.md:20`、`type-builder.xl.md:1787-1794`（`shape.Literal = literal; shape.Add(literal); return this.SpanNode(shape, index, index);`）、`:647-658`（负数三层手工套）。
- 结论：偏离（1 条）。补注：`Literal` 可以是 `PrefixUnaryExpressionShape`（负数）而不只是字面量，字段名比内容窄；`:2386-2391` 的模板无插值分支也走这一层，字段装的是 `NoSubstitutionTemplateLiteralShape`。

### typescript/tokens/types/qualified-name-shape.xl.md（474B / 1 行；QualifiedNameShape）
- 结构：shape 层纯数据节点：2 个字段（`Left`/`Right`）+ 构造，零方法；`A.B.C` 靠左结合嵌套。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`MakeQualifiedName(left, right)` 现场 `new` + 赋两个字段 + 按 `left`/`right` 签区间 + `TryToClose` — 证据 `qualified-name-shape.xl.md:17-19`、`type-builder.xl.md:1875-1888`（`shape.Left = left; shape.Right = right; … return shape;`）。
- 结论：偏离（1 条）。补注：类型位置（`ParseEntityName`，`:2024-2037`）与 import/export 位置（`import-export-legacy-declaration-mount.xl.md:598`）都用这一个类，字段语义一致；`Pos` 直接取 `(left as ShapeToken).Pos`（`:1886`），左侧若不是 `ShapeToken` 就没有 `Pos` 可取，类型断言把这一点盖住了。

### typescript/tokens/types/type-operator-shape.xl.md（473B / 1 行；TypeOperatorShape）
- 结构：shape 层纯数据节点：**只有 1 个字段**（`Operand`）+ 构造，零方法；`keyof`/`readonly`/`unique` 三种算子共用。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：算子关键字在 `ParsePrimaryType` 里被 `this.At++` 吃掉、只把操作数建形状后赋字段 — 证据 `type-operator-shape.xl.md:18`、`type-builder.xl.md:697-711`（`if (text === "keyof" || text === "readonly" || text === "unique") { this.At++; … shape.Operand = operand;`）。
  - `[U1]` ● 算子本身（`keyof`/`readonly`/`unique`）既没进字段也没进 `Data`：`shape.Add(operand)` 只挂操作数，关键字 token 被丢弃，AST 侧再也分不出是哪个算子 — 证据 `type-builder.xl.md:698-702`（`this.At++; const operand = this.ParsePostfixType(); const shape = new TypeOperatorShape(this.Template); shape.Operand = operand; shape.Add(operand);`）、本文件 `:18`（唯一字段是 `Operand`）。
- 结论：偏离（2 条）。补注：`readonly`/`unique` 的 leaf shape 是存在的（`typescript/tokens/keywords/readonly-keyword-shape.xl.md:9`、`unique-keyword-shape.xl.md:9`），但这条算子路径一个都没造（`readonly` 只在映射类型里被造成形状，`type-builder.xl.md:2535`），`keyof` 连形状类都没有——与 `abstract`/`asserts` 那样「关键字也进 children」的做法不一致。

### typescript/tokens/types/template-literal-type-span-shape.xl.md（472B / 1 行；TemplateLiteralTypeSpanShape）
- 结构：shape 层纯数据节点：2 个字段（`Type`/`Tail`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：插值类型由内层 builder 解析、尾段由 `TemplateMiddleShape`/`TemplateTailShape` 现场建，再赋字段并 `Add` 两个子节点 — 证据 `template-literal-type-span-shape.xl.md:16-18`、`type-builder.xl.md:2453-2465`（`span.Type = value; span.Tail = tail; … span.TryToClose(this.Context);`）。
- 结论：偏离（1 条）。补注：`Tail` 声明成 `Token`，实际只可能是 `TemplateMiddleShape`/`TemplateTailShape` 两种，字段类型比内容宽；尾段的 `Text` 在 `:2429`/`:2442` 直接从原 token 的 `ConstString` 拼出，属于「build 时提取」的合规做法。

### typescript/tokens/types/type-literal-shape.xl.md（465B / 1 行；TypeLiteralShape）
- 结构：shape 层纯数据节点：1 个字段（`Members`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：成员由 `ParseTypeMember` 逐个建后 `Add`，映射类型则整段转给 `ParseMappedType` — 证据 `type-literal-shape.xl.md:18`、`type-builder.xl.md:910-934`（`const shape = new TypeLiteralShape(this.Template); … shape.Members = shape.Data;`）。
  - `[S3]` ○ 字段与 children 是同一个数组：`shape.Members = shape.Data`，之后任何对 `Data` 的增删都会同时改写「AST 字段」 — 证据 `type-builder.xl.md:933`（`shape.Members = shape.Data;`）。
  - `[X1]` ○ 同一个类还有第二条构造管线：type-alias 声明在 `{` 创建格就 `new TypeLiteralShape`、挂 `TypeAliasLiteralStartPossibleShape` 当门，成员由 `BodyGuideUtil.CollectBodyMembers` 收、`literal.Members = members` 单独赋一份（不是 `Data`） — 证据 `typescript/tokens/declarations/type-alias-declaration-shape.xl.md:133-145`（`const literal = new TypeLiteralShape(this.Template); … TypeAliasLiteralStartPossibleShape.Install(bracket as Bracket);`）、`:445-457`（`literal.Members = members; … literal.TryToClose(context);`）。
- 结论：偏离（3 条）。补注：两条管线对 `Members` 的语义不同（别名 vs `Data`），读字段的一方必须知道字面量是从哪条路建出来的。

### typescript/tokens/types/array-type-shape.xl.md（461B / 1 行；ArrayTypeShape）
- 结构：shape 层纯数据节点：1 个字段（`ElementType`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`A[]` 在 `ParsePostfixType` 里现场建（元素已建好，只补 `[`/`]` 区间） — 证据 `array-type-shape.xl.md:18`、`type-builder.xl.md:579-590`（`const arrayShape = new ArrayTypeShape(this.Template); arrayShape.ElementType = type; … arrayShape.TryToClose(this.Context);`）。
  - `[X1]` ○ 同一个形状在 possible 里还会被另一条管线建：参数表候选在 `[` 的**创建格**就 `new ArrayTypeShape` 包住元素、`PendingArray` 记着、等 `]` 那一格才补终点关闭 — 证据 `typescript/tokens/types/parameter-list-possible-shape.xl.md:625-637`（`const openShape = new ArrayTypeShape(unit.Template); openShape.ElementType = element; … state.PendingArray = openShape;`）、`:642-655`（`]` 格 `arrayShape.TryToClose(context);`）。
- 结论：偏离（2 条）。补注：两条管线的「何时关闭」不同（builder 一次性关、possible 跨格关），字段 `ElementType` 的填充时机因此也不一致；`A[B]` 不走本类（`ParsePostfixType:592-620` 归 `IndexedAccessTypeShape`），`[]` 里只允许 trivia 才算数组类型（`:578`）。

### typescript/tokens/types/parenthesized-type-shape.xl.md（460B / 1 行；ParenthesizedTypeShape）
- 结构：shape 层纯数据节点：1 个字段（`Type`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：括号里的类型由内层 builder 解析，之后赋字段、`Add`、按括号签区间 — 证据 `parenthesized-type-shape.xl.md:18`、`type-builder.xl.md:786-797`（`const shape = new ParenthesizedTypeShape(this.Template); shape.Type = type; shape.Add(type); … shape.TryToClose(this.Context);`）。
- 结论：偏离（1 条）。补注：`(A) => B` 在 `ParsePrimaryType:664-667` 被先判成函数类型，不进本类；括号里内容必须读完（`:783-785` 抛错），不存在「多留一段」的静默路径。

### typescript/tokens/types/infer-type-shape.xl.md（457B / 1 行；InferTypeShape）
- 结构：shape 层纯数据节点：1 个字段（`TypeParameter`）+ 构造，零方法；`infer R` 的 `R` 复用 `TypeParameterShape`。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`TypeParameterShape` 先建、`this.SpanNode(parameter, …)` 先关，再 `new InferTypeShape` 包一层 — 证据 `infer-type-shape.xl.md:16`、`type-builder.xl.md:1993-2021`（`const parameter = new TypeParameterShape(this.Template); … const shape = new InferTypeShape(this.Template); shape.TypeParameter = parameter; shape.Add(parameter);`）。
- 结论：偏离（1 条）。补注：`infer R extends A` 的约束判定要回退（`this.At = extendsIndex`，`:2009-2010`），回退发生在内层 `TypeParameterShape` 已经 `TryToClose` 之后，形状仍然留着；`infer` 关键字本身不进 `Data`。

### typescript/tokens/types/tuple-type-shape.xl.md（450B / 1 行；TupleTypeShape）
- 结构：shape 层纯数据节点：1 个字段（`Elements`）+ 构造，零方法；元素可以是普通类型，也可以是 `NamedTupleMemberShape`/`OptionalTypeShape`/`RestTypeShape`。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：元素由内层 builder 逐个解析后 `Add`，最后 `shape.Elements = shape.Data`、按整个括号签区间 — 证据 `tuple-type-shape.xl.md:18`、`type-builder.xl.md:809-898`（`const shape = new TupleTypeShape(this.Template); … shape.Elements = shape.Data; … shape.TryToClose(this.Context);`）。
  - `[S3]` ○ `Elements` 就是 `Data` 本身：字段与 children 同引用 — 证据 `type-builder.xl.md:890`（`shape.Elements = shape.Data;`）。
- 结论：偏离（2 条）。补注：`[A?]` 的 `?` 不进 `Data`、区间靠 `SpanNode` 扩到 `?`（`:880-886`）；空元组 `[]` 也走本类，`Elements` 为空数组。

### typescript/tokens/types/type-query-shape.xl.md（448B / 1 行；TypeQueryShape）
- 结构：shape 层纯数据节点：1 个字段（`ExprName`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：实体名由 `ParseEntityName` 建、实参由 `ParseTypeArguments` 建，现场赋字段后逐个 `Add` — 证据 `type-query-shape.xl.md:17`、`type-builder.xl.md:1962-1987`（`shape.ExprName = name; shape.Add(name); … shape.TryToClose(this.Context);`）。
- 结论：偏离（1 条）。补注：`typeof X<A>` 的类型实参只进 children（`:1974-1976`），类里没有 `TypeArguments` 字段，TS `TypeQueryNode.typeArguments` 在属性面无落点（不另计编号）；`typeof` 关键字本身不进 `Data`；`typeof import("m")` 被 `ParseTypeQuery:1895-1959` 提前转给 `ImportTypeShape`，不到本类。

### typescript/tokens/types/intersection-type-shape.xl.md（446B / 1 行；IntersectionTypeShape）
- 结构：shape 层纯数据节点：1 个字段（`Types`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：成员由 `ParsePostfixType` 逐个建，`Types` 与 `Data` 各存一份同引用数组，`SpanNode` 收口 — 证据 `intersection-type-shape.xl.md:17`、`type-builder.xl.md:468-473`（`const shape = new IntersectionTypeShape(this.Template); shape.Types = members; for (const member of members) { shape.Add(member); }`）。
- 结论：偏离（1 条）。补注：单成员且无前导 `&` 时**不建本节点**（`:465-467` 直接返回成员）；带前导 `&` 的 `& A` 会建一个只有 1 个成员的节点（`:446-451`、`:468-473`），前导 `&` 不进 `Data`（用后即丢，R35 成立）。

### typescript/tokens/types/union-type-shape.xl.md（439B / 1 行；UnionTypeShape）
- 结构：shape 层纯数据节点：1 个字段（`Types`）+ 构造，零方法。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：成员由 `ParseIntersection` 逐个建，`Types` 与 `Data` 各存一份同引用数组，`SpanNode` 收口 — 证据 `union-type-shape.xl.md:17`、`type-builder.xl.md:434-439`（`const shape = new UnionTypeShape(this.Template); shape.Types = members; … return this.SpanNode(shape, start, this.At - 1);`）。
- 结论：偏离（1 条）。补注：单成员且无前导 `|` 时不建节点（`:431-433`）；前导 `|` 只置 `hasLeading`、不进 `Data`（`:412-417`）；`Types` 与 `Data` 元素同引用但数组不同一，与 `TupleTypeShape` 的 `Elements = Data` 写法不一致。

### typescript/tokens/types/computed-property-name-shape.xl.md（348B / 1 行；ComputedPropertyNameShape）
- 结构：**完全没有字段**的 shape（`extends ShapeToken`，类体只有一个构造）；内容全在 `Data[0]` 的表达式子树上。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`[k]` 里的内容由 `ExpressionBuilder` 整段重解析成表达式子树，再 `Add` 进来 — 证据 `computed-property-name-shape.xl.md:9-18`（零字段）、`type-builder.xl.md:1166-1189`（`const inner = new ExpressionBuilder(this.Template, this.Context); … computed.Add(expression); … computed.TryToClose(this.Context);`）。
  - `[X1]` ○ 计算属性名是「表达式管线直建 + 类型管线直接收养」的接缝：`inner.Load(bracket.Data, …)` 把 `[...]` 里的原文整段重解析，形状自身没有任何判定或字段 — 证据 `type-builder.xl.md:1165-1180`、同型第二处访问器计算名 `:1315-1333`。
- 结论：偏离（2 条）。补注：表达式子树的 `Parent` 被手工改成 `computed`（`:1181`），`Add` 与改 `Parent` 两件事分开做；类里没有字段，所以 R19/R20 在本文件既无落点也无违反。

### typescript/tokens/types/named-tuple-member-shape.xl.md（339B / 1 行；NamedTupleMemberShape）
- 结构：**零字段**的结构节点（`extends ShapeToken`，类体只有一个构造）；TS `NamedTupleMember` 的四个位置（`DotDotDotToken?`/标识符/`QuestionToken?`/类型）全部由 children 承担。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：四个子节点由 `ParseTupleType` 的 `named` 分支现场建、逐个 `Add`，`SpanNode` 收口 — 证据 `named-tuple-member-shape.xl.md:9-18`、`type-builder.xl.md:831-868`（`const member = new NamedTupleMemberShape(inner.Template); … shape.Add(inner.SpanNode(member, elementStart, inner.At - 1));`）。
- 结论：偏离（1 条）。补注：`rest`/`?` 都是「有就 `Add`、没有就不 `Add`」（`:832-834`、`:843-845`），children 数量可变但顺序固定；`[name: D?]` 里 `?` 被并进一个 `OptionalTypeShape`（`:859-864`），不是 `QuestionToken`，与 TS 的 `NamedTupleMember.questionToken` 表示不同。

### typescript/tokens/types/optional-type-shape.xl.md（328B / 1 行；OptionalTypeShape）
- 结构：**零字段**的结构节点（`extends ShapeToken`，类体只有一个构造）；唯一子节点就是被 `?` 修饰的类型。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：子节点由 `ParseTupleType` 现场建、`Add` 后交给 `SpanNode` 收口（区间扩到 `?`） — 证据 `optional-type-shape.xl.md:9-18`、`type-builder.xl.md:883-885`（`const optional = new OptionalTypeShape(inner.Template); optional.Add(elementType); shape.Add(inner.SpanNode(optional, elementStart, inner.At - 1));`）、`:862-864`（命名元组成员里的同型用法）。
- 结论：偏离（1 条）。补注：`?` 本身不进 `Data`，只体现在区间里；这与 TS `OptionalTypeNode` 只有 `type` 一个孩子的结构一致，所以树上没有多余节点。

### typescript/tokens/types/rest-type-shape.xl.md（328B / 1 行；RestTypeShape）
- 结构：**零字段**的结构节点（`extends ShapeToken`，类体只有一个构造）；唯一子节点是 `...` 之后的元素类型。
- 偏离：
  - `[S4]` ○ 本类不建 AST、无 `ParseFromShape`：`...` 先被造成 `DotDotDotTokenShape` 但**不挂进本节点**，元素类型 `Add` 后 `SpanNode` 收口 — 证据 `rest-type-shape.xl.md:9-18`、`type-builder.xl.md:871-876`（`const rest = new RestTypeShape(inner.Template); rest.Add(inner.ParseType()); shape.Add(inner.SpanNode(rest, elementStart, inner.At - 1));`）。
- 结论：偏离（1 条）。补注：`restToken` 在 `rest` 分支被造出来后没有使用（`:817-820` 造、`:871-875` 不用），TS `RestTypeNode.type` 也只有类型一个孩子，所以结果正确但那个 `DotDotDotTokenShape` 是白建的。

## 本批统计

- 文件数：35；有偏离：33；无偏离（符合）：2（`decorator-shape`、`this-type-shape`，都是有 `R31` 静态工厂的那两个）。
- 偏离条目合计 63。

| 编号 | 条数 | 落在哪些文件 |
| --- | --- | --- |
| `S4` | 33 | 5 个成员壳 + 28 个数据壳（全批除 `decorator`/`this-type`） |
| `S3` | 7 | 5 个成员壳；`tuple-type`（`Elements = Data`）；`type-literal`（`Members = Data`） |
| `R1` | 5 | `get-accessor`、`constructor`、`method-declaration`、`set-accessor`、`property-declaration` |
| `R2` | 5 | 同上 |
| `P2` | 5 | 同上 |
| `P1` | 1 | `property-declaration`（唯一缺 `OnBracketCreatedEvent`） |
| `X1` | 4 | `mapped-type`（`MappedNameType` 字段出参）、`type-literal`（type-alias 第二条构造管线）、`array-type`（possible 里跨格建壳）、`computed-property-name`（表达式管线直建） |
| `U1` | 3 | `type-operator` ●（算子关键字两头都没落）、`template-literal-type` ●（`Head`/`Spans` 从未赋值）、`import-type` ○（`typeof import` 路径丢 `TypeArguments`） |

- 形态结论：
  - 28/35 个文件是「只声明字段 + 构造」的数据壳（`代码行` 计 1 行），构造现场一律在 `TypeBuilder`：`new` 形状 → 赋字段 → `Add` 子节点 → `SpanNode`/`SpanLeaf` 里 `TryToClose`。字段填得对不对，只能去 builder 那边核；本批文件自己不承担 `R19`/`R31` 的任何一步。
  - 5 个成员 shape 是唯一带逻辑的一类，而逻辑恰好是 `R33`/`R34` 禁止的两件事（覆盖 `ExitOrPre`、覆盖 `ComputePossibleShapes`），转调对象都是 `MemberShellCatalog`；成员壳的 raw 挂载、整段重建、整段回退已记在 `40-types-builder`，本批只记这些 shape 侧的覆盖与壳化。
  - `R25` 在本批无处落地：35 个文件都不碰 `tokenIndex`、也没有一个 `possible`（唯一的下标访问在 builder 的 `Units[...]`，见 `40-types-builder` 的 `B1`），因此无 `B1`；`ShapeStates` 全批 0 次出现。
  - 本批无 `B2`（无 `try/catch`）、无 `B3`/`B4`（无逐格扫描、无前瞻）、无 `D1`（围栏外无散文，事实表 `prose` 全 0）、无 `C1`/`C2`/`C3`（无循环、无 cache）、无 `X3`（无 tsx/JSX 形状）。
