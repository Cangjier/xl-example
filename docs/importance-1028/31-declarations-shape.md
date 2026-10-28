# 31 declarations 四个声明 shape（审计）

审计对象：`typescript/tokens/declarations/type-alias-declaration-shape.xl.md`、`module-block-shape.xl.md`、`function-declaration-shape.xl.md`、`variable-declaration-shape.xl.md`。判据见 [01-rules.md](01-rules.md)，行号以 `read` 返回值为准（四个文件都读到了结尾：1604 / 789 / 755 / 605 物理行）。字节与代码行取 `_facts/typescript-tokens-declarations.md` 的机械读数。

> 四个文件都是「形状」层，不是 possible。因此本节的主线只有三条：① `Close` 那一刻 basic token 是否已经变成 shape 字段并被丢弃（R19/R20）；② 是否覆盖了 `ExitOrPre` / `ComputePossibleShapes`（R33/R34）；③ 是否在 shape 内部手写解析、把子形状的收敛从 possible 手里拿走（R04–R05/R06–R08）。

### typescript/tokens/declarations/type-alias-declaration-shape.xl.md（45726B / 1345 行；TypeAliasDeclarationShape extends ShapeToken）

- 结构：shape 层 + 一个手写的增量解析器。`TypeAliasDeclarationShape` 由 `forms/type-alias-declaration-mount.xl.md:51-57` 在 `type` 关键字关闭格建出（`shell.Incremental = true`），此后**每一格**由本类的 `ComputePossibleShapes` 驱动：建名字 → 建联合 → 收口类型字面量 → 函数类型参数/`=>`/返回类型 → 算结束格 → `FinishAt`。收口方式是把整段 raw 交给静态工厂 `FromUnits` 重建出一条**新的** `TypeAliasDeclarationShape`，再把自己从父 `Data` 里换掉。字段是 `AliasName` / `AliasParameters` / `AliasType` / `BodyBracket` / `Literal` / `UnionShape` / `FunctionType` / `ParamsBracket` + 状态位（`NameBuilt` / `HasParams` / `SeenEqual` / `Finished` / `Incremental`）+ 位置缓存（`TypeBasePos` / `PendingBasePos` / `ArrowEnd`）。本文件不定义 possible/end，也没有 `Close` 覆盖。

#### 覆盖 ExitOrPre（R33）

- `[R1]` ● 覆盖 `ExitOrPre`，并**在它里面结束自己**：父括号的收尾字符到达时先补函数类型返回类型，再 `FinishAt` 就地收口，然后返回 `Reload` 让驱动层重放；其余字符一律 `Undo` — 证据 `type-alias-declaration-shape.xl.md:201`（`## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates`）、`:205-206`（`parent !== null && parent instanceof Bracket && value === (parent as Bracket).EndBracketChar`）、`:208-212`（`this.FlushFunctionReturn(context); const end = this.ComputeEndIndex(true); if (end >= 0) { this.FinishAt(end, context); return BranchStates.Reload; }`）、`:215`（`return BranchStates.Undo;`）。基线实现见 `core/syntax/shape-token.xl.md:65-69`（基类恒 `return BranchStates.Undo;`）。
- `[P3]` ○ 这条收口路径既不走 `SignOut` 也不走 `TryToClose`/`Quit`：`FinishAt` 直接把自己从 `parent.Data` 里 `splice` 成正品、清 `MountedUnit`、手工置 `Closed` — 证据 `:1074`（`parent.Data.splice(at, 1, built);`）、`:1089-1091`（`if (parent.MountedUnit === this) { parent.MountedUnit = null; }`）、`:1105-1107`（`this.MountedUnit = null; this.Closed = true; this.Finished = true;`）。R27/R31–R32。

#### 覆盖 ComputePossibleShapes（R34）

- `[R2]` ● 覆盖 `ComputePossibleShapes`，并在其中**直接驱动建树**：四步构建（`BuildAliasName` / `BuildUnionStep` / `CloseTypeLiteral` / `TryFinalizeFunctionParams` + `TryBuildFunctionStep`）任一成立就 `return ComputePossibleShapesStates.Built`，否则算结束格 `FinishAt`，只有最后才回落 `super` — 证据 `:148`（`## method ComputePossibleShapes`）、`:154-176`（`this.NoteEqualStep(); if (!this.NameBuilt) { if (this.BuildAliasName(context)) return …Built; } else { … BuildUnionStep / CloseTypeLiteral / TryFinalizeFunctionParams / TryBuildFunctionStep … }`）、`:177-182`（`const end = this.ComputeEndIndex(false); if (end >= 0) { this.FinishAt(end, context); return …Built; } return super.ComputePossibleShapes(context, source);`）。它拿这两个方法做的事就是「本 shape 自己就是本 shape 的 possible」。
- `[P1]` ● 触发点自造：`Built` 由 shape 自己判、自己返回；`FinishAt` 还会替父单元补跑一次目录（`parent.ComputePossibleShapesByIndex(parent.Data.length - 1, …, PossibleSource.Close)`），把「下一句在哪个格建壳」也由本 shape 决定 — 证据 `:1101-1103`（`if (movedCode && "ComputePossibleShapesByIndex" in parent) { (parent as any).ComputePossibleShapesByIndex(parent.Data.length - 1, context, PossibleSource.Close); }`）。R13–R14 的「由目录/终结候选触发」在这里被绕过。
- `[P2]` ● 候选收敛语义整体缺席：`Built` 的返回不经过 `Candidates` 淘汰、不判终结候选、不做 `Reset`、也没有「终结候选与其它候选同时成立」这一条断言 — 对照 `core/syntax/catalog-guide.xl.md:66-107`（淘汰 `:66-70`、终结同时成立抛错 `:74-76`、零候选/多候选/唯一候选 `:86-107`）；本文件只在建不出时才 `super`（`:182`）。R26–R30。

#### 手写解析：四个语义步骤都在 shape 里

- `[S2]` ● 名字、联合成员、类型字面量收口、函数类型（参数表 / `=>` / 返回类型）四类子结构全由本 shape 逐格手写，子形状不是由各自的 possible 收敛出来的（`BuildUnionStep` 甚至是空实现）— 证据 `:267-348`（`BuildAliasName`：`TempToString()` 认 `=`/`<`、回扫 `type` 关键字、`IdentifierShape.FromBasicToken`、`data.splice(nameAt, 1, name)`）、`:350-354`（`BuildUnionStep:()=>bool { return false; }`）、`:410-465`（`CloseTypeLiteral`）、`:554-579`（`TryFinalizeFunctionParams`）、`:581-595`（`TryBuildFunctionStep`）、`:597-654`（`ConsumeFunctionArrow`）、`:656-712`（`TryBuildFunctionReturn`）。
- `[X1]` ● 设计外挂三件：直接 `new TypeLiteralShape` / `new FunctionTypeShape` 并 `Data.splice` 挂到自己身上（跳过 build 产物通道）；`TypeBuilder.ConsumeBuiltMembers` 这个**全局开关位**；`IncrementalBuiltCount` 指标计数器 — 证据 `:133-140`（`const literal = new TypeLiteralShape(this.Template); … this.Data.splice(at, 0, literal); literal.Parent = this;`）、`:540-548`（`const shape = new FunctionTypeShape(this.Template); … this.Data.splice(at, 0, shape);`）、`:1063-1068`（`TypeBuilder.ConsumeBuiltMembers = true; … finally { TypeBuilder.ConsumeBuiltMembers = false; }`）、`:86`（`## static field IncrementalBuiltCount:int = 0`）、`:1108`（`TypeAliasDeclarationShape.IncrementalBuiltCount += 1;`）。
- `[C1]` ● 每格都从 `Data` 头/尾重扫，寻找结果不入 cache：`NoteEqualStep` 从 0 累 `<>` 深度、`BuildAliasName` 从 0 找关键字与名字格、`ComputeEndIndex` 从尾回扫、`TryBuildFunctionReturn`/`FlushFunctionReturn` 用 `data.indexOf(shape)` 重找、`FinishAt` 再全扫一遍 `Data` 清参数表状态 — 证据 `:221-235`、`:270-287`、`:882-890`、`:663-664`、`:755-758`、`:1055-1058`（`for (const unit of this.Data) { if (unit instanceof Bracket && …) ParameterListPossibleShape.DropState(…) }`）。R08。

#### 收口 = 整段 raw 重建

- `[C2]` ● 每条别名收口都是「把 0..endIndex 的原始单元整段交给 `FromUnits` 重建一条新的别名」（`FromUnits` 再从头收 `code`、`FindTypeParameterClose`、`TypeBuilder.ParseType`/`ParseTypeParameterList`），而不是复用逐格建好的结果 — 证据 `:1060`、`:1066`（`built = TypeAliasDeclarationShape.FromUnits(this, 0, endIndex, context, this.Pos);`）、`:1370-1391`（`const code:Array<Token> = []; for (let at = start; at <= tokenIndex; at++) { … code.push(unit); }`）、`:1479`、`:1524-1529`。R06–R07。
- `[X2]` ● 上面这条就是「壳自弃、legacy 整段重建」的旁路：`FinishAt` 把 `built` 换进父 `Data` 后自身变成垃圾；同一文件还留着一条永不执行的旧联合分支（`UnionShape` 全文件没有赋值点，`BuildUnionStep` 恒 `false`，`FlushUnion` 的 `indexOf(this.UnionShape)` 因此恒 `-1`）— 证据 `:1074`、`:353`、`:359`（`if (this.UnionShape === null) { return endIndex; }`）、`:363`。

#### Close 之后 Data 与 basic token

- `[U4]` ● `FinishAt` 只 `splice` 掉尾巴，0..endIndex 的 raw basic 单元**原样留在 `Data` 里**，随后手工置 `Closed = true`（`Close` 从未被调用，也就没有任何过滤）——R19 允许的两条通道「`BuildByIndex` 从 `Data` 移除」「`Close` 里过滤」都没走，走的是「整只壳连 raw Data 一起丢」 — 证据 `:1060`（`const tail = this.Data.splice(endIndex + 1);`）、`:1066`、`:1105-1107`。R19–R20/R35。
- `[U1]` ● 收口判定回读源码原文：`IsFunctionReturnTerminator` 从 `range.EndIndex` 起逐字符 `SourceRange.Whole(document).At(at)`（含跳过空格与两种注释）、`NextCodeText` 同样按字符扫下一段代码词、`PeekMappedHead` 从 `{` 之后逐字符找 `[` — 证据 `:801-849`（`const whole = SourceRange.Whole(document); let at = range.EndIndex; while (at < count) { const ch = whole.At(at); … }`）、`:907`、`:924`、`:1237-1296`、`:958-1022`。R19（build/收口阶段应只用已提取的字段，不回读原文）。
- `[B4]` ● 上述三个判据读的都是「当前末单元**之后**」的字符：`ComputeEndIndex` 用 `NextCodeText(unit.SourceRange)` 决定要不要在这一格结束、`MountFunctionType` 用 `BracketRoleResolver.HasFunctionArrowAfterParen(bracket)` 决定要不要建函数类型壳 — 证据 `:907-911`、`:924-928`、`:513-515`、`:810-845`、`:996`（`let at = skipSpace(range.StartIndex + 1);`）。R22。
- `[B1]` ○ `FromUnits(host, start, tokenIndex, …)` 无 `tokenIndex >= host.Data.length` 保护，越界时是 `host.Data[at]` 解引用后 `.IsTriviaToken` 抛 `TypeError`，不是返回 `Nothing` — 证据 `:1371-1373`（`const unit = host.Data[at]; if (unit.IsTriviaToken) { continue; }`）。R25。
- `[S4]` ○ 本文件止于 `shape.TryToClose(context)` 返回 shape，没有任何 shape→AST 出口 — 证据 `:1601-1603`（`shape.Pos = pos; shape.TryToClose(context); return shape;`）；全仓唯一 `ParseFromShape` 直接抛「未实现」（`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`）。R21。

#### 符合项

- `[R19]` ● **符合（字段侧）**：名字 / 类型参数 / 类型 / 位置在 build 那一刻就落进 `AliasName` / `AliasParameters` / `AliasType` / `Pos`，basic token 被就地换成 shape（`data.splice(nameAt, 1, name)`），不是留到 AST 阶段再取 — 证据 `:335-337`、`:1545-1547`（`shape.AliasName = name; shape.AliasParameters = parameters; shape.AliasType = type;`）、`:1504-1509`（早建 `IdentifierShape` 直接收下，不重建）。
- 结论：偏离（15 条）；另有 1 条标 **符合**（`[R19]` 字段侧，不计入）。本文件是四个里唯一同时踩 `R33` 与 `R34` 的；`D1` 成立（围栏外无散文，事实表 prose 计数 0），`B2` 成立（全文无 `catch`，只有 `:1065-1069` 的 `try/finally`）。

### typescript/tokens/declarations/module-block-shape.xl.md（37497B / 718 行；ModuleBlockShape extends ShapeToken）

- 结构：shape 层 + 一个全量的成员分派器。`FromBracket` 在模块体括号关闭后被 `module-declaration-shape.xl.md:198` 调用一次，一把把整个体建完：体内**已有语句形状**时走 `StatementBuilder.CollectBodyStatements` 收集（`:68-73`），否则从 `bracket.Data` 逐成员 `BuildMember` 手写分派（`:74-84`）。分派依据是首词的 `TempToString()`：`export` / `default` / `declare` / `abstract` / `const enum` / `import`（含 `import =`）/ `export =` / `export default` / `type` / `as` / `class` / `interface` / `enum` / `namespace|module|global` / `function` / 变量族 / 其余交 `StatementBuilder`。本文件没有 possible / end / `Close` / `ExitOrPre` / `ComputePossibleShapes`。

#### 结构与分派

- `[S2]` ● 模块体成员不经过任何 possible 收敛：一个 640 余行的 `BuildMember` 用字符串比较决定成员种类，再直接调对应声明族的静态工厂或 `StatementBuilder`（`R04–R05` 的「一个成员一类候选」在模块体层整体不成立）— 证据 `module-block-shape.xl.md:87`（`## static method BuildMember`）、`:102-104`（`keyword = (unit as Common).TempToString();`）、`:147-164`（`declare`/`abstract` 前缀重判）、`:168-199`（`const enum` / `declare function` / `type` 同行判据）、`:202-240`（`export as namespace`）、`:241-359`（`import` / `import =`）、`:360-413`（`export *` / `export {…}`）、`:414-459`（`type` 别名）、`:460-510`（`export =` / `export default`）、`:519-558`（`class|interface|enum|function|namespace|module|global` 找体括号/分号/尾格）、`:566-605`（`FromUnits` 直调）、`:650-704`（其余交 `StatementBuilder.BuildStatement()`）。
- `[X1]` ● 分派靠 `TempToString()` 的字面量串（`"as"` / `"import"` / `"type"` / `"default"` / `"const"` / `"declare"` …），不是形状或候选；`IsMemberStartWord` 再维护一张 15 个关键字的表 — 证据 `:102-104`、`:111`、`:150`、`:171`、`:183`、`:202`、`:241`、`:267`、`:336`、`:360-366`、`:414`、`:460`、`:519-529`、`:751-758`（`return text === "export" || … || text === "abstract";`）。
- `[C1]` ● 每建一个成员都要把 `inner.Units` 从头重扫若干遍找 `;` / `=` / 下一个成员首词；同一件事在 6 个分支里各写一遍 `for (let scan = …)` — 证据 `:204-209`、`:243-252`、`:254-259`、`:264-272`、`:318-323`、`:333-341`、`:373-386`、`:419-424`、`:429-436`、`:463-468`、`:474-482`、`:530-552`、`:667-680`。R08。
- `[C2]` ● 模块体是**全量**建：`FromBracket` 一次调用里 `while (inner.At < inner.Units.length)` 把整块建完，逐字符增量只发生在另一条 `HasBuiltBodyStatements` 分支 — 证据 `:74-84`（`inner.Load(bracket.Data, base); while (inner.At < inner.Units.length) { ModuleBlockShape.BuildMember(inner, bracket, shape, context); } shape.TryToClose(context);`）。R06–R07。
- `[X2]` ● 上述 raw 路径就是注释自认的 legacy 回退：「**全 raw 的模块体（legacy / 开关关闭）逐字节走下面的 `BuildMember` 循环**」 — 证据 `:60-67`、`:74`、`:80-82`。

#### 自造 token 与改写已建形状

- `[X1]` ● 为了让各声明族的 `FromUnits` 收下无分号形态，本类**合成零宽 `;` 插进 `bracket.Data` 再摘掉**（7 处），并为此维护 `DataCursorAt` 游标 — 证据 `:229-235`（`const asSemi = new Symbol(bracket.Template); asSemi.SignIn(asNameEnd); asSemi.AppendValueAndSignOut(";", asNameEnd - 1); bracket.Data.splice(asSemiAt, 0, asSemi); … bracket.Data.splice(asSemiAt, 1);`）、`:287-295`、`:349-356`、`:397-412`、`:445-453`、`:494-509`、`:688-692`。IMPORTANCE 里没有「父层往 bracket.Data 里插合成 basic token」这条机制。
- `[X1]` ● 父层直接改写**已建成员形状**的 `Data`：`export` / `default` 修饰词插到 `member.Data` 最前、`const enum` / `declare function` / `declare|abstract` 的开头修饰词 `Pos` 由本层的 `Positions` 重锚 — 证据 `:301-306`（`for (const child of special.Data) { if (child instanceof ExportKeywordShape) { … } }`）、`:582-591`、`:614-623`、`:637-646`、`:709-719`、`:720-728`（`member.Data.splice(0, 0, modifier); modifier.Parent = member; … member.Data.splice(1, 0, defaultModifier);`）。R18/R20 的同构性全靠这些手插位置正确。
- `[U4]` ○ raw 单元始终留在 `bracket.Data` 里（除合成 `;` 的局部 `splice` 外没有任何消费/移除），体括号整体随调用返回被丢弃，而不是逐个 basic token 消费掉 — 证据 `:79`（`inner.Load(bracket.Data, base);`）、`:81`、`:729`（`block.Add(member);`）。R19–R20/R35 靠「容器整体丢弃」而非「从 Data 移除」达成。
- `[B1]` ○ `DataIndex(...) + 1` 未判 `-1`：`DataIndex` 找不到时返回 `-1`，`-1 + 1 = 0` 会把合成 `;` 插到 `bracket.Data` 最前面（静默错位，而不是 `Nothing`）— 证据 `:228`（`const asSemiAt = block.DataIndex(bracket, asNameUnit) + 1;`）、`:744-748`（`const found = data.indexOf(unit); … return found;`）。R25。
- `[X1]` ○ 一个从不被调用的私有判据 `InAmbientDeclaration`（ambient 判定实际由 `IsMemberStartWord` 与关键字前缀完成），属残留机制 — 证据 `:760-789`。
- `[S4]` ○ 本文件止于 `shape.TryToClose(context); return shape;`，没有 shape→AST 出口 — 证据 `:83-84`；对照 `typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`（全仓唯一 `ParseFromShape` 抛「未实现」）。R21。

#### 符合项

- `[R20]/[R31]/[R08]` ● **符合**：`Data` 只 `Add` 建好的成员形状（括号本身只进 `SourceRange`，不进 `Data`）；静态工厂签范围、取字段、`TryToClose`（R31）；`DataIndex` 带 `DataCursorAt` 游标复用，是 R08 要的「把寻找结果记进 cache」的一个正面样本 — 证据 `:51-84`（`shape.SignIn/SignOut/shape.Pos` 与 `shape.TryToClose(context); return shape;` `:83`）、`:729`、`:732-749`。`R33`/`R34` 未违反（全文无这两个方法），`B2` 成立（无 `catch`），`B4` 不涉及（全部扫描都在已建完的 `bracket.Data` / `inner.Units` 内），`D1` 成立（prose 0）。
- 结论：偏离（11 条）；另有 1 条标 **符合**（`[R20]/[R31]/[R08]`，不计入）。本文件是四个里唯一没有 `Close`/`ExitOrPre`/`ComputePossibleShapes` 覆盖的，问题集中在「成员分派全手写 + 全量建体 + 父层改写子形状」。

### typescript/tokens/declarations/function-declaration-shape.xl.md（31060B / 637 行；FunctionDeclarationShape extends ShapeToken）

- 结构：shape 层 + 早建挂载。`OnBracketCreatedEvent` 在 `(` 格把名字就地换成 `IdentifierShape` 并装参数表候选（`:78-80`、`:146-167`），在 `{` 格装 `BlockPossibleShape.MountBodyCatalog` 并把体括号换成 `BlockShape` 壳、双挂 `MountedUnit`（`:82-107`、`:169-199`）。收口由静态工厂 `FromUnits` 从单元切片一次建出（参数优先复用已建 `ParameterShape`，函数体交 `StatementBuilder`），`TryToClose` 里还会自己补一个 EOF 哨兵再直接驱动终结候选。字段 `DeclareKeyword` / `AsteriskToken` / `FunctionName` / `Parameters` / `ReturnType` / `Body`。

#### R33/R34 覆盖情况（与机械事实表对齐）

- 说明：`_facts/typescript-tokens-declarations.md:25` 的方法列里**没有** `ExitOrPre`，本文件正文也没有；在 `typescript/tokens/declarations` 下 `grep ExitOrPre` 只命中三处，其中唯一的**方法定义**是 `type-alias-declaration-shape.xl.md:201`，另两处是注释（`body-guide-util.xl.md:202`、`variable-declaration-possible-shape.xl.md:204`）。本批四个文件里覆盖 `ExitOrPre` 的只有 type-alias 一个，此处以源码为准。
- `[R2]` ● 覆盖 `ComputePossibleShapes`：每格先把参数表候选收口（`ParameterListPossibleShape.Finalize(this, context)`），然后**原样委托** `this.CatalogGuide.ComputePossibleShapes(...)` — 证据 `:201`（`## method ComputePossibleShapes`）、`:204`（`ParameterListPossibleShape.Finalize(this, context);`）、`:205-208`（`if (this.CatalogGuide !== null) { return this.CatalogGuide.ComputePossibleShapes(this, context, source); } return ComputePossibleShapesStates.Nothing;`）。它拿这个方法做的是「在目录前面插一个每格收口钩子」；候选的淘汰/终结/唯一候选仍由 `CatalogGuide` 负责（`core/syntax/catalog-guide.xl.md:66-107`），**没有**取代候选收敛，故此处不加 `P1`/`P2`。
- `[P1]` ○ 真正自造触发点在 `TryToClose` 一侧：close 时若文件已到末尾、`Data` 非空，就自己给末位补一个 EOF 哨兵，然后**直接调用终结候选的 `BuildByIndex`**（不经 `CatalogGuide.ComputePossibleShapesByIndex` 的淘汰与断言）— 证据 `:220`（`if (!StatementRouteUtil.IsIncrementalShapesEnabled() || guide === null || guide.EndPossible === null) { return result; }`）、`:239-246`（`const end = document.GetCount(); … sentinel = new EndOfFileTokenShape(this.Template); sentinel.SignIn(end); sentinel.SignOut(end); this.Add(sentinel);`）、`:248`（`guide.EndPossible.BuildByIndex(this, this.Data.length - 1, guide, context);`）。
- `[X1]` ● 上述「合成 EOF 哨兵 + shape 自己驱动终结候选」是 IMPORTANCE 没有的机制（R31/R32 的 build 产物两种去向都不含它）— 证据 `:234-246`、`:248`。
- `[B2]` ● 上面这次 `BuildByIndex` 外面套 `try { … } catch { … }`：建不出来就把哨兵摘掉、静默 `return result`，possible 的诊断被吃掉 — 证据 `:247-257`（`try { guide.EndPossible.BuildByIndex(…); } catch { if (sentinel !== null) { const at = this.Data.indexOf(sentinel); … this.Data.splice(at, 1); } return result; }`）。R23。
- `[X1]` ● 形状写全局开关：`({` 格判定里读三个开关位，并在 `OpenParameterList` 里把 `EnableBracketRoleCatalog` 直接置 `true` — 证据 `:85`（`if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableFunctionBodyCatalog) { return; }`）、`:92`（`if (!StatementRouteUtil.EnableBlockBodyCatalog) { return; }`）、`:162`（`StatementRouteUtil.EnableBracketRoleCatalog = true;`）、`:220`。开关位本身见 `typescript/tokens/statements/statement-route-util.xl.md:73-185`（30+ 个 `Enable*`）。
- `[X1]` ● `{` 格绕过 bracket 晋升机制，直接 `new BlockShape` 并把体括号塞进它、双挂 `MountedUnit` — 证据 `:172`（`const block = new BlockShape(host.Template);`）、`:186`（`block.Add(body);`）、`:191-196`（`host.Data.splice(at, 1, block); block.Parent = host; host.MountedUnit = block; block.MountedUnit = body;`）。
- `[P4]` ○ 括号创建时只装目录 + 自建壳，**没有 `HandleCloseDispatch`**；`grep HandleCloseDispatch` 全仓 0 命中，R15/R16 的 close 派发机制在本文件里根本不存在（体括号靠 `MountedUnit` 链把字符送进 `BlockShape`）— 证据 `:102`（`BlockPossibleShape.MountBodyCatalog(body);`）、`:106`（`FunctionDeclarationShape.OpenFunctionBody(this, body, context);`）、`:196`。

#### 收口重建与重扫

- `[C1]` ● 每格/每次调用都 `indexOf` + 回扫前一个非 trivia 单元（`Pos` 口径），同一段回扫在 4 个方法里各写一遍 — 证据 `:112-125`（`const at = host.Data.indexOf(bracket); … for (let back = at - 1; back >= 0; back--)`）、`:131-139`、`:173-184`、`:290-298`、`:494-502`。R08。
- `[C2]` ○ 早建好的 `BlockShape` 壳在 `FromUnits` 里被**丢弃**：`last instanceof BlockShape` 时只把它包着的 `{` 括号挖出来，再交给 `StatementBuilder.BuildStatement()` 从括号重走一遍 `BuildBlock`（内部靠 `HasBuiltBodyStatements` 复用已建语句，所以不是整段 raw 重建，但壳这一层白建）— 证据 `:416-429`（`if (last instanceof BlockShape) { for (const unit of last.Data) { … prebuiltBody = unit as Bracket; … } }`）、`:433-439`、`:560-568`（`bodyBuilder.Load([bodyUnit], bodyPos); body = bodyBuilder.BuildStatement();`）。R06/R12 的「已确定不必再建」在这里退让。
- `[X1]` ● 四只指标计数器：`BodyShellOpenCount` / `StatementRouteUtil.FunctionBodyShellCatalogCount` / `ParameterListPossibleShape.PromotedNameCount` / `ParameterListPossibleShape.LegacyFallbackCount` — 证据 `:63`、`:103`、`:143`、`:197`、`:558`。
- `[B1]` ○ `FromUnits` 直接下标取 `host.Data[at]`（`at` 由 `start..tokenIndex` 给出），无越界保护，越界为 `TypeError` 而非 `Nothing` — 证据 `:265-269`（`for (let at = start; at <= tokenIndex; at++) { if (!host.Data[at].IsTriviaToken) { code.push(host.Data[at]); } }`）。R25。
- `[S4]` ○ 本文件止于 `shape.TryToClose(context); return shape;`，没有 shape→AST 出口 — 证据 `:597-599`；对照 `typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`（唯一 `ParseFromShape` 抛「未实现」）。R21。

#### 符合项

- `[R19]/[R20]/[R31]` ● **符合**：`Data` 只装子形状（装饰器 / 修饰词 / 星号 / 名字 / 类型参数 / 参数 / 返回类型 / 函数体），括号与 basic token 一个都不进 `Data`；名字在 `(` 格就 `Host.Data.splice(nameAt, 1, name)` 换成正品，参数优先 `CollectBuiltParameters` 复用已建 `ParameterShape`、返回类型在 build 那格由 `ParseReturnType` 取到、体由 `StatementBuilder` 建出；静态工厂签范围后自己 `TryToClose`，符合 R31 — 证据 `:140-142`、`:555-559`、`:570-588`（`shape.FunctionName = name; shape.Parameters = parameters; shape.ReturnType = returnType; shape.Body = body; … shape.Add(name); … shape.Add(body);`）、`:596-598`。`B4` 不涉及（不读 `document` 原文，只比 `GetCount()` `:228`），`D1` 成立（prose 0）。
- 结论：偏离（12 条）；另有 1 条标 **符合**（`[R19]/[R20]/[R31]`，不计入）。`R33` 未违反（无 `ExitOrPre`）；`B2` 违反 1 处（`:249`），是四个文件里唯一吞异常的。

### typescript/tokens/declarations/variable-declaration-shape.xl.md（30385B / 514 行；VariableDeclarationShape extends ShapeToken）

- 结构：shape 层 + 「类型面接管」。由 `variable-declaration-possible-shape.xl.md:159-175` 建出（`declaration.Incremental = true`，标识符已经 `IdentifierShape.FromBasicToken` 后 `Add`），此后每格 `ComputePossibleShapes` 先走表达式目录，`Close` 拍再自建一个容器候选；`TryToClose` 里先 `FinishIncremental`（提取字段 + 把 `Data` 换成 AST children），再交基类 `Close`。字段 `Incremental` / `TypeMode` / `AnnotationDone` / `InitializerDone` / `TrailingSemicolon` / `ContainerCloseGuide`。

#### R34 覆盖与自建候选

- `[R2]` ● 覆盖 `ComputePossibleShapes`：先 `ComputeByDirectoryShapes`（内部按需 `super`），再在 `source === PossibleSource.Close` 时**自建第二个候选目录**问一次 — 证据 `:48`（`## method ComputePossibleShapes`）、`:51`（`const state = this.ComputeByDirectoryShapes(context, source);`）、`:54-59`（`if (source === PossibleSource.Close) { if (this.ContainerCloseGuide === null) { this.ContainerCloseGuide = new CatalogGuide([new ContainerClosePossibleShape()]); } this.ContainerCloseGuide.ComputePossibleShapes(this, context, source); } return state;`）。它拿这个方法做的是「让声明在 `}` 收口拍多问一个容器候选」，不承担主目录的淘汰/终结。
- `[P1]` ● 触发点自造：shape 里持有一个**自己的** `CatalogGuide`（单候选 `ContainerClosePossibleShape`），在 Close 拍自行触发；这条路径不经过宿主目录，也不受 `CatalogGuide.Reset()` 的 `LastBuildTokenIndex` 去重约束 — 证据 `:46`（`## field ContainerCloseGuide:CatalogGuide | null = null`）、`:56-58`、对照 `core/syntax/catalog-guide.xl.md:56-65`（同格去重）、`:110-118`（`Reset`）。
- `[P2]` ○ 候选判定语义被 shape 代管：`ComputeByDirectoryShapes` 自己决定「要不要问终结候选」——进入类型面后只要不满足 `CanFinishTypedDeclaration` 就 `return ComputePossibleShapesStates.Waiting`（不让基类跑 `Candidates` 淘汰与终结判定），满足才回落 `super` — 证据 `:108-111`（`if (VariableDeclarationShape.CanFinishTypedDeclaration(…)) { return super.ComputePossibleShapes(context, source); } return ComputePossibleShapesStates.Waiting;`）、`:94-96`（块体边界同样走 `super`）。R26–R30。
- `[X1]` ● 用父链位置上溯判宿主类型：`this.Parent.Parent.Parent`，再以 `host.Parent === null` / `host instanceof Bracket && StartBracketChar === "{"` 决定「根声明 or 块体声明」并据此切换建树策略 — 证据 `:77-83`（`const host = this.Parent !== null && this.Parent.Parent !== null ? this.Parent.Parent.Parent : null; const atRoot = host !== null && host.Parent === null; const atBlockHost = …`）。IMPORTANCE 的 possible 判定里没有「按挂载链深度分区」这条机制。

#### 未消费 basic token 的自造通道

- `[X1]` ● 语句分号不进 `Data`，而是被私存到 `TrailingSemicolon` 字段（`Token | null`）交给语句层收口，并在 `FinishIncremental` 里反复「记录、不吞掉」 — 证据 `:40-44`（`## field TrailingSemicolon:Token | null = null` + `null`）、`:339-347`（`if (this.TrailingSemicolon === null) { this.TrailingSemicolon = unit; } continue;`）、`:391-395`、`:594-604`（`TakeTrailingSemicolon`：`this.TrailingSemicolon = unit; this.Data.splice(at, 1);`）。
- `[U3]` ○ 这只 `;` 既没被消费成形状，也没走「回挂 parent + `Reclose`」，也没走 `Reload Message`，而是走上面那条自造通道 — 同上证据 `:594-602`。R17③④。

#### 重扫与降级旁路

- `[C1]` ● 每次单元关闭都重扫 `Data`：`AnnotationColon` / `FirstEqual` / `LastSignificant` / `FirstSignificant`（`TypeCatalogFactory`）与 `CanFinishTypedDeclaration` 各扫一遍，`TryBuildAnnotation` 之后再整表重建 `kept` — 证据 `:84-85`（`TypeCatalogFactory.AnnotationColon(this.Data) >= 0 || TypeCatalogFactory.StartsTypedInitializer(this.Data, TypeCatalogFactory.FirstEqual(this.Data))`）、`:108`、`:150-155`、`:164-172`、`:174-177`、`:192-209`（`this.Data.length = 0; for (const item of kept) { this.Add(item); }`）、`:218-233`、`:251-263`。R08。
- `[C2]` ○ `=` 之后整段 raw 交给 `ExpressionBuilder` 原子重建（`builder.Load(raw, …); builder.ParseExpression()`），容器形态同样整条重走 — 证据 `:491-520`、`:559-577`（`const builder = new ExpressionBuilder(this.Template, context); builder.Load(raw, basePos < 0 ? 0 : basePos); const expression = builder.ParseExpression();`）。R06–R07。
- `[X2]` ● 上面那一支就是注释自认的降级旁路（「WP-C 接管前的降级」），并顺手记一个 `DeclarationInitializerAtomicCount` 指标 — 证据 `:560`（`// WP-C 接管前的降级：用现有 ExpressionBuilder 原子建表达式。`）、`:562-576`、`:568-575`（`if (unit instanceof Bracket) { StatementLegacyMetrics.DeclarationInitializerAtomicCount += 1; }`）。
- `[S4]` ○ 本文件止于 `return super.TryToClose(context)`，没有 shape→AST 出口 — 证据 `:303-306`；对照 `typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`。R21。

#### 符合项（本批唯一在 Close 侧站得住的文件）

- `[R19]/[R20]` ● **符合**：`TryToClose` 里先调 `FinishIncremental` 把字段提取完，再把 `Data` 清空、只放子形状（标识符 / 类型节点 / `!` / 初始化器根），`Close` 看到的 `Data` 已经等价 AST children；`TrimEndToLastCode` 之后连尾随 trivia 也不留 — 证据 `:300-306`（`if (this.Incremental && !this.Closed) { this.FinishIncremental(context); } return super.TryToClose(context);`）、`:579-583`（`this.Data.length = 0; for (const item of kept) { this.Add(item); }`）、`:588`、`:319-332`（`kept.push(unit)` 只收标识符与已建形状）、`:415-429`（唯一表达式根收下，basic 单元不 push）。
- `[B2]` ● **符合**：全文无 `catch`（只有注释里出现 `catch { }` 的用例文本 `:75`、`:90`），异常不会被吞。
- 结论：偏离（10 条）；另有 2 条标 **符合**（`[R19]/[R20]`、`[B2]`，均不计入）。它是四个文件里**唯一**满足 R19/R20 的：basic token 在 `TryToClose` 那一刻被提取并丢弃，`Close` 之后 `Data` 只剩子形状。`R33` 未违反（无 `ExitOrPre`），`B4` 不涉及（判定都基于 `this.Data` 与已建形状的 `SourceRange`），`D1` 成立（prose 0）。

## 本批统计

- 文件数：4；有偏离文件数：4（四个都读到结尾：1604 / 789 / 755 / 605 物理行）。
- 按编号计数（共 48 条偏离；正文里标 **符合** 的 5 条不计入）：`X1` 11（●10/○1）、`C1` 4（●4）、`C2` 4（●2/○2）、`S4` 4（○4）、`R2` 3（●3）、`P1` 3（●2/○1）、`X2` 3（●3）、`B1` 3（○3）、`P2` 2（●1/○1）、`S2` 2（●2）、`U4` 2（●1/○1）、`R1` 1（●）、`P3` 1（○）、`P4` 1（○）、`U1` 1（●）、`U3` 1（○）、`B2` 1（●）、`B4` 1（●）；`B3`/`C3`/`X3`/`D1` 未出现（无跳跃式处理；四个 shape 都不碰 possible cache，`C3` 不适用；无 tsx；事实表 prose 全 0）。
- `R33`/`R34` 逐文件：`type-alias` 同时覆盖 `ExitOrPre` + `ComputePossibleShapes`（`R1`+`R2`，且真正取代了候选收敛 ⇒ 追加 `P1`/`P2`）；`function-declaration` 只覆盖 `ComputePossibleShapes`（`R2`，但原样委托 `CatalogGuide` ⇒ 不追加 `P1`/`P2`，它的 `P1` 来自 `TryToClose` 里直接驱动终结候选）；`variable-declaration` 只覆盖 `ComputePossibleShapes`（`R2`，并自建第二个 `CatalogGuide` ⇒ 追加 `P1`，`P2` 记 ○）；`module-block` 两个都不覆盖（`R33`/`R34` 在本批里唯一干净的文件）。
- `Close` 侧（R19/R20）逐文件：`type-alias` 壳置 `Closed` 却把 0..endIndex 的 raw 单元留在 `Data`（`U4` ●，并回读 `document` 原文 `U1` ●）；`module-block` 靠「整只体括号丢弃」而不是「从 Data 移除」（`U4` ○）；`function-declaration` `Data` 只含子形状、字段在 build 那格取到（符合）；`variable-declaration` 在 `TryToClose` 里先提取再清 `Data`（符合，四者中唯一）。
- 最严重 3 条：
  1. `[R1]+[R2]+[P1]+[P2]` ●（`type-alias-declaration-shape.xl.md`）一个 shape 同时覆盖 `ExitOrPre` 与 `ComputePossibleShapes`：在 `ExitOrPre` 里 `FinishAt` 结束自己并返回 `Reload`（`type-alias-declaration-shape.xl.md:205-212`），在 `ComputePossibleShapes` 里驱动四步建树并直接返回 `Built`（`:154-181`）。`Candidates` 淘汰、终结候选、`Reset`、同格去重全部不经手（`:177-182` 只在建不出时 `super`）——R33/R34 与 R26–R30 同时失守。
  2. `[C2]+[X2]+[U4]+[U1]` ●（`type-alias-declaration-shape.xl.md`）每条别名的收口都是「把自己换成 `FromUnits` 从 raw 整段重建的正品」（`:1060-1074`、`:1370-1391`），壳里的 raw basic 单元不清（`:1105-1107`），并且用 `SourceRange.Whole(document).At(...)` 回读原文决定要不要续接（`:801-849`、`:907`、`:924`）——R06/R19/R22 三条主判据在同一个收口点上一起破。
  3. `[B2]+[X1]` ●（`function-declaration-shape.xl.md`）`TryToClose` 里先补一个合成 EOF 哨兵（`:239-246`），再直接调 `guide.EndPossible.BuildByIndex`（`:248`），外层 `catch {}` 把建不出来的诊断吞掉（`:247-257`）——终结候选的触发点、build 去向与异常可观测性三件事一起偏离，且是本批唯一的 `B2`。
