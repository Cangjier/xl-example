# 40 types builder：类型层「第二条管线」与成员壳目录（审计）

审计对象：`typescript/tokens/types/type-builder.xl.md`、`typescript/tokens/types/member-shell-catalog.xl.md`、`typescript/tokens/types/property-signature-possible-shape.xl.md`。判据见 [01-rules.md](01-rules.md)，行号以 `read` 返回值为准（三个文件都读到了物理末行）。

### typescript/tokens/types/type-builder.xl.md（93597B / 2335 行代码；物理 2750 行；TypeBuilder）

- 结构：**不属于 shape / possible / end 任何一层**——`# class TypeBuilder`（`:98`）是一个 2335 行代码（物理 2750 行）的递归下降类型解析器：入口 `Load`/`LoadFrom`（`:143`、`:149`）吃进 `Array<Token>`（basic token 单元），`ParseType`（`:371`）向下分派出 55 个方法（其中 37 个 `Parse*`），每一步都用 `new XxxShape(...)` + `SpanNode`/`SpanLeaf`（`:280`、`:355`）当场拼树并 `TryToClose`。全仓 `new TypeBuilder(` 共 51 处、跨 20 个文件（`declarations/` 5 文件 18 处、`types/` 10 文件 18 处、`direct/` 2 文件 3 处、`expressions/expression-builder` 8 处、`statements/statement-builder` 3 处、`members/heritage-clause-shape` 1 处），是类型位置唯一的产出通道。**它确实是「从 raw basic token 直接建类型 AST」的第二条管线**：全文 `ParseFromShape` 0 次、`GetRaw` 0 次，`new XxxShape` 89 次，`throw new Error` 54 次，`try/catch` 0 次。
- 偏离：

#### 管线定性：没有 shape / possible / end 三件套

- `[X1]` ● 类型由一个纯解析器类直接建，设计里没有任何对应物：它不是 shape（不继承 `ShapeToken`），不是 possible（没有 `ComputeByIndex`），也不是 end；IMPORTANCE 的三件套之外多出「builder」这一层驱动 — 证据 `type-builder.xl.md:98`（`# class TypeBuilder`）、`:143`（`## method Load:(units:Array<Token>, basePos:int)=>void`）、`:371`（`## method ParseType:()=>Token`），全仓调用点 51 处如 `property-signature-possible-shape.xl.md:822`（`const builder = new TypeBuilder(host.Template, context);`），另由 `expression-builder`（8 处）、`statement-builder`（3 处）、`class-declaration-shape`（6 处）各自再 `new`。
- `[S4]` ● AST 由 builder 直建：每个 `Parse*` 分支都是「判定 → `new` 形状 → 填字段 → `shape.Add(...)` → `SpanNode` 收口」，关闭后的 shape 直接进树，全程没有 `ParseFromShape` — 证据 `:396-405`（`const shape = new ConditionalTypeShape(this.Template); shape.CheckType = checkType; … return this.SpanNode(shape, start, this.At - 1);`）、`:434-439`（`UnionTypeShape` + `for (const member of members) { shape.Add(member); }`）、`:647-658`（负数字面量三层形状手工套）、`:291`（`SpanLeaf` 里 `shape.TryToClose(this.Context);`）；全仓唯一 `ParseFromShape` 仍只抛「未实现」`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`。R21。

#### 从 raw basic token 整段重读（第二个解析入口）

- `[C2]` ● 每遇到一个括号就开一个新的 builder，把**括号里的 raw 单元**整段重新解析：`inner.Load(bracket.Data, base)` 后从 `At=0` 跑完整文法，不继承外层任何已解析结果 — 证据 `:773-798`（`ParseParenthesizedType`：`inner.Load(bracket.Data, base); … const type = inner.ParseType();`）、`:803-808`、`:912-917`（类型字面量成员）、`:1589-1594`（参数表）、`:1740-1745`（索引参数）、`:2522-2527`（映射类型）、`:2637-2642`（映射类型参数）；文件内 `new TypeBuilder` 9 次、`.Load(` 13 次。R06/R07。
- `[U1]` ● 数据没有「在 build 那一刻进 shape 字段」，而是在 AST 阶段回读原文重新提取：import 类型的 attributes 直接遍历 `bracket.Data` 手工分组、再造 `ImportAttributeShape` — 证据 `:2155-2159`（`for (const item of bracket.Data) { if (!item.IsTriviaToken) { code.push(item); } }`）、`:2199-2220`（按 `,` 手工切组、`attributes.Data.push(entry)`）、`:1572-1584`（参数表先扫一遍 `bracket.Data`，只有 `ParameterShape` 才复用，其余标 `residue` 退回重解析）。R17①/R19。
- `[C1]` ○ 每轮重扫同一段前缀：`ParseTypeBounded` / `ParseReturnTypeBounded` 先找边界、再把 `Units` 切成子数组、`At=0` 重跑 `ParseType`，结束后手工还原（`BoundaryCache` 只缓存「边界」，不缓存解析结果）— 证据 `:298-322`（`const boundary = MemberBoundary.FindMemberBoundary(...); … this.Units = savedUnits.slice(startAt, boundary); … this.At = 0; const parsed = this.ParseType();`）、`:325-352`（同构的第二份）。一个成员里同一段前缀被重复解析多次。R08。
- `[B4]` ○ 用 `At` 之后的单元决定当前解析：边界、构造签名、装饰器范围、`?(` 的二义都靠前瞻 — 证据 `:298`、`:328`（`FindMemberBoundary(this.Units, this.At, ...)`）、`:1003-1004`（`const newNextUnit = this.Peek(1); const isConstructSignature = newNextUnit !== null && (this.IsText(newNextUnit, "<") || …)`）、`:1643`（`for (const item of this.Units.slice(this.At))` 扫到 `[` 才停）、`:1394-1396`（`afterParams = this.Peek(2)` 决定 `m?()` 是可选方法还是可选属性）。在 possible 语境下即 R22；此处按 ○ 记（builder 不是 possible）。
- `[C3]` ○ builder 自建三处缓存，既不是 possible 的 `state` 也不是 `share`，且靠 `LoadFrom` 手工失效：`TextCacheUnit`/`TextCacheValue`（单槽文本缓存）、`BoundaryCache`（`Code`/`From`/`Boundary`）、`Positions`/`SourceIndexes` 偏移表 — 证据 `:130-134`（三个字段声明）、`:176-180`（`this.TextCacheUnit = null; … this.BoundaryCache.Boundary = -1;`）、`:240-251`、`:304-321`（bounded 前后成对保存/还原缓存）。R09–R11。

#### 设计外的开关与旁路通道

- `[X1]` ● 一个**静态全局开关** `ConsumeBuiltMembers`（默认 false）决定类型字面量的成员是「消费已建好的成员形状」还是「从 raw 重解析」；唯一写它的调用点还在另一个文件里成对打开/关闭 — 证据 `:902`（`## static field ConsumeBuiltMembers:bool = false`）、`:926-930`（`if (!unit.IsBasicToken && TypeBuilder.ConsumeBuiltMembers) { inner.At++; shape.Add(unit); continue; }`）、调用方 `typescript/tokens/declarations/type-alias-declaration-shape.xl.md:1063`、`:1068`（`TypeBuilder.ConsumeBuiltMembers = true;` … `= false;`）。设计外开关位；且增量路径存在却默认关闭（R12 的增量覆盖被开关挡住）。
- `[X1]` ○ 丢弃 trivia 之后再回读文档原文把换行找回来：`LoadFrom` 里 `if (unit.IsTriviaToken) { continue; }`，而 `HasLineBreakBeforeCurrent` 又用 `SourceRange.Whole(document)` 逐字符扫两 token 之间的原文 — 证据 `:185-187` 对照 `:522-540`（`const whole = SourceRange.Whole(document); for (let at = previousEnd; at < currentStart; at++) { if (LineTerminator.IsLineTerminator(whole.At(at))) { return true; } }`）。R17④ 的四条去向之外自造「回读原文」通道。
- `[X1]` ○ 解析期现场制造 basic token：把 `Temp` 以 `>` 结尾的 `Symbol` 拆成逐字符的 `new Symbol` 再 `SignIn`/`AppendAndSignOut` — 证据 `:189-203`（`for (let index = 0; index < text.length; index++) { const piece = new Symbol(unit.Template); piece.AppendAndSignOut(text[index], pieceIndex); … this.Units.push(piece); }`）。词法层的事在语法层重做（S1 的越权方向），按设计外机制记。
- `[X1]` ○ 嵌套 builder 之间用**字段做出参通道**：内层把 `as` 之后的映射名类型写进自己的 `MappedNameType`，外层再读走 — 证据 `:126`（`## field MappedNameType:Token | null = null`）、`:2652`、`:2666`（`this.MappedNameType = inner.MappedNameType;`）、`:2607`（`shape.NameType = inner.MappedNameType;`）。没有返回值契约的隐式旁路。
- `[X1]` ○ 「体括号」由一张 20 项关键字白名单 + 前一个符号表启发式判定，并被成员壳目录直接复用 — 证据 `:476-506`（`## static method IsBodyBrace`，`:489-490` 符号表 `":" "|" "&" "<" "," "=" "=>" "?" "-" "+"`、`:497-500` 关键字表 `extends keyof readonly unique typeof infer new abstract asserts is in of as satisfies`）、复用点 `member-shell-catalog.xl.md:671`（`if (!TypeBuilder.IsBodyBrace(shell.Data, shell.Data.length - 1)) {`）。

#### 丢弃与越界

- `[U4]` ○ 消费掉的 basic token 一个都不丢：全文 `splice` 0 次、`Data.length = 0` 0 次，builder 只是读 `bracket.Data`/`host.Data` 并把责任外推给调用方 — 证据 `:215`（`return consumedCount;`）、`:208-210`（`this.Units.push(unit); …`，只做登记不动作），丢弃真正发生在调用方 `property-signature-possible-shape.xl.md:831`（`host.Data.splice(start, consumedLength, built);`）。R19/R35 在 builder 内部没有落点。
- `[B1]` ○ 有守的只有 `Peek`，多处长下标是裸取：`Peek` 明确返回 null（`:231-233` `if (index < 0 || index >= this.Units.length) { return null; }`），但 `SpanLeaf`/`SpanNode`/`Positions` 等处不设界 — 证据 `:283`（`const unit = this.Units[index];`）、`:358-359`（`const head = this.Units[first]; const tail = this.Units[last];`）、`:1188`（`computed.Pos = this.Positions[this.At];`）、`:1608`（`const initializerPos = inner.Positions[inner.At];`）、`:2348`（`const lastUnit = this.Units[this.At - 1];`）。R25。
- `[S3]` ○ 形状字段与 children 同一引用：`Elements`/`Members` 直接指向 `Data`，此后任何 `Data` 变更都会同时改写「AST 字段」 — 证据 `:890`（`shape.Elements = shape.Data;`）、`:933`（`shape.Members = shape.Data;`）。R18 的同构性靠「此后无人再动 Data」维持。

- `[B2]` ● **符合**：失败一律抛错、异常从不被吞 — 证据 `type-builder.xl.md`（`try`/`catch` 计数 0；54 处 `throw new Error`，如 `:386` `throw new Error("条件类型缺少 ?");`）。
- `[R1]/[R2]` ● **符合**：没有覆盖 `ExitOrPre`，也没有覆盖 `ComputePossibleShapes` — 证据 `type-builder.xl.md`（两串标识符全文件 0 匹配）。
- `[D1]` ● **符合**：围栏外无散文，示例收在 `txt` 围栏里 — 证据 `:100-112`（` ```txt ` … ` ``` `）、事实表 prose 计数 0。

#### 方法分布（起始行 / 正文行数）

| 职责组 | 方法 | 小计 |
| --- | --- | --- |
| 游标与入口 | `LoadFrom`(149/69) `Load`(143/6) `OriginalConsumed`(218/9) `Peek`(227/10) `TextOf`(237/17) `IsText`(254/6) `IsBracket`(260/9) `HasCode`(269/11) `SpanLeaf`(280/15) `SpanNode`(355/16) `constructor`(136/7) | 175 |
| 边界与切片 | `ParseTypeBounded`(295/30) `ParseReturnTypeBounded`(325/30) `HasLineBreakBeforeCurrent`(508/35) `IsBodyBrace`(476/32) | 127 |
| 类型主链 | `ParseType`(371/37) `ParseUnionType`(408/34) `ParseIntersection`(442/34) `ParsePostfixType`(543/81) `ParsePrimaryType`(624/146) `ParseParenthesizedType`(770/30) `ParseTupleType`(800/102) | 464 |
| 对象类型成员 | `ParseTypeMember`(946/536) `ParseTypeLiteral`(904/42) `SpanTypeMember`(1482/12) `ParseOptionalMark`(1494/23) `HasMappedMember`(2479/40) `ParseMappedType`(2519/115) `ParseMappedTypeParameter`(2634/36) | 804 |
| 函数/构造/谓词/类型参数 | `ParseGenericFunctionType`(1517/30) `ParseFunctionType`(1547/20) `ParseConstructorType`(2040/52) `ParseReturnType`(2092/17) `ParseTypePredicate`(2109/42) `ParseTypeParameterList`(2670/27) `ParseTypeParameter`(2697/54) | 242 |
| 参数 | `ParseParameter`(1664/73) `ParseParameterList`(1567/58) `ParseDecorators`(1625/39) `ParseIndexParameter`(1737/15) | 185 |
| 名字/引用/查询 | `ParseName`(1858/14) `ParseEntityName`(2024/16) `MakeQualifiedName`(1872/19) `ParseTypeReference`(1796/35) `ParseTypeArguments`(1831/27) `ParseTypeQuery`(1891/99) `ParseInferType`(1990/34) | 244 |
| 字面量/模板 | `ParseStringLiteralType`(1752/8) `ParseNumericLiteralType`(1760/13) `ParseBooleanOrNullLiteralType`(1773/14) `MakeLiteralType`(1787/9) `IsTemplateToken`(2357/10) `ParseTemplateType`(2367/112) | 166 |
| import 类型 | `ParseImportType`(2280/77) `ParseImportTypeAttributes`(2151/80) `BuildImportTypeAttribute`(2231/49) | 206 |

- 规模：12 个字段 + 1 个构造 + 55 个方法；上表覆盖 2613 行，其余约 137 行为 `# dependencies` 围栏（`:1-94`）、类头示例（`:100-112`）与字段区。单一方法最大的是 `ParseTypeMember`（536 行），它一个人承担对象类型的全部分派（`;`/`,`、`readonly` 修饰词与同名成员、`abstract new` 的 recovery、构造签名、调用签名、索引签名、计算名、get/set 访问器、方法、属性）。
- 结论：偏离（15 条）；另有 3 条标 **符合**（`[B2]`、`[R1]/[R2]`、`[D1]`，不计入）。

### typescript/tokens/types/member-shell-catalog.xl.md（29691B / 742 行代码；物理 1011 行；MemberShellFamily、MemberShellEntry、MemberShellHeadPart、MemberShellCatalog）

- 结构：一个**全局静态壳目录**。四个类里三个是纯数据（`MemberShellFamily` 三个族常量 `:53-59`；`MemberShellEntry` 十一个字段 `:61-79`；`MemberShellHeadPart` 的 `Shape`+`Raw` `:81-85`），第四个 `MemberShellCatalog` 全是 static：`Open` 表（`:89`）、`Enable` 开关（`:91`）、四个计数器（`:93-99`）、`InstallBodyCatalog`（`:176`）、`Create`（`:230`）、`Wrap*`/`HeadKindAt`/`BuildHeadShape`（`:361`/`:424`/`:481`）、收口三件套 `FinalizeShell`/`Finalize`/`Unwrap`（`:883`/`:793`/`:764`）、`BuildMember`（`:718`）、`FinalizeAll`（`:994`）。它既不 install 一次 catalog 就退出，也不产出 shape：它把成员**先做成 raw 壳挂到宿主上**，等边界到了再整段重建成 shape。
- 偏离：

#### 机制本身：壳目录 + 角色判定

- `[X1]` ● 整套「成员壳」机制是设计外挂：一个进程级 `Open` 数组按引用记账，配 `CreatedCount`/`FinalizedCount`/`UnwrappedCount`/`PrunedCount` 四个计数器、`Report()` 拼字符串、`Prune()` 反向自愈 — 证据 `:89`（`## static field Open:Array<MemberShellEntry> = []`）、`:93-99`（四个 static 计数）、`:117-125`（`return "open=" + … + " unwrapped=" + …`）、`:158-173`（`Prune` 按 `shell.Parent`/`Parent.Data.indexOf(shell)` 清扫）、`:1007-1011`（`OpenCount`）。这些接口**全仓零调用**（`MemberShellCatalog.Report`/`Reset`/`OpenCount`/`IsEnabled` 各 0 处），是纯指标残留。
- `[X1]` ● 开关位是死旋钮：`Enable` 只有初值 `true` 与两处读取，从无写入点，两条 `if` 永远为真 — 证据 `:91`（`## static field Enable:bool = true`）、`:233`（`if (!MemberShellCatalog.Enable) { return host; }`）、`:843`（`if (!MemberShellCatalog.Enable) { return; }`）；全仓 `MemberShellCatalog.Enable` 仅 3 处（定义 + 上述两读）。
- `[X1]` ● 体括号的目录走「角色」体系而不是 IMPORTANCE 的 catalog guide：把字符串角色 `"MemberList"` 包成 `BracketRoleCatalog` + `BracketRoleResult.Known` 再交给另一个 installer；参数表的安装同样走 `BracketRole.ParameterList` — 证据 `:176-183`（`const catalog = new BracketRoleCatalog(role, shapes, null); const plan = BracketRoleResult.Known(catalog, null, role, owner, role); const installed = BracketCatalogInstaller.Install(body, plan, context);`）、`:557-559`、调用方 `typescript/tokens/declarations/class-declaration-shape.xl.md:112`（`MemberShellCatalog.InstallBodyCatalog(body, ClassDeclarationShape.CreateBodyPossibleShapes(), "MemberList", this, context);`），同型三处（interface `:77`、enum `:73`、type-alias `:444`）。
- `[P1]` ● 触发点是自造的，不是 R13 的 bracket create：`Create` 有两个入口——① 各成员 possible 的 `BuildByIndex`（`property-signature-possible-shape.xl.md:815`、`method-signature-possible-shape.xl.md:70` 等 12 处）；② **上一条成员收口时顺手预建下一条**（`OpenNextHead`）— 证据 `:868`（`const shell = MemberShellCatalog.Create(host, at, host.Data.length - 1, family, cache, context);`）、`:946`（`MemberShellCatalog.OpenNextHead(host, boundaryUnit, entry.Family, entry.Cache, context);`）、`:840-881`（`OpenNextHead` 自身：`MemberHeadScan.IsModifierWord` 判修饰词、`Plan` 判头、再 `Create`）。R13–R14。
- `[P2]` ● 候选五条在成员层不再发生：成员成不成立由**首单元一次 `MemberHeadScan.Plan`** 定死（`:248-249`），此后只由边界扫描决定何时收口，`HeadCompute` 只回 `Waiting`/`Built` 两个态 — 证据 `:248-249`（`const plan = firstCode === null ? null : MemberHeadScan.Plan(firstCode, family === MemberShellFamily.Interface);`）、`:677-716`（`HeadCompute`：`:708-715` `if (code === 0) { return ComputePossibleShapesStates.Waiting; } … return ComputePossibleShapesStates.Built;`）、`:883-951`（`FinalizeShell` 的边界判据）。R26–R30 的淘汰/终结/零候选/多候选/`IsBuildable` 全部绕过。
- `[X1]` ○ 壳的「关闭派发」只能靠被壳化的 9 个 shape 各自覆盖 `ExitOrPre` 与 `ComputePossibleShapes` 来转调，catalog 提供 `HandOffOnBodyClose`/`HeadCompute`/`OnBracketCreated` 三个钩子 — 证据 `:953-992`（`HandOffOnBodyClose` 返回 bool 让调用方转 `Reload`）、`:647-675`（`OnBracketCreated` 按 `(`/`{` 分派）、被壳化的 shape 侧 `typescript/tokens/types/get-accessor-shape.xl.md:28-46`（`protected method ExitOrPre` 里 `return BranchStates.Reload;`、`ComputePossibleShapes` 里 `return MemberShellCatalog.HeadCompute(this, context);`）。catalog 的三个钩子直接导致了 R33/R34 的移植（`HandleCloseDispatch` 全仓 0 处，R15–R16 无处落地）。

#### 壳的建立：raw 进壳、壳进宿主

- `[P3]` ● build 产物既不关闭也不挂成形状，而是「raw 容器挂载」：`Create` 把 `host.Data[start..end]` 整段 `slice` 出来 `shell.Add(unit)`，再 `host.Data.splice(start, …, shell)` 并把 `MountedUnit` 指向壳 — 证据 `:240`（`const consumed:Array<Token> = host.Data.slice(start, end + 1);`）、`:269-275`（`for (const unit of consumed) { shell.Add(unit); } … host.Data.splice(start, consumed.length, shell); host.MountedUnit = shell;`）。R27 的 `SignOut`→`TryToClose()`→`Quit()` 在壳上没有对应动作，R31/R32 也都不成立（挂的是装 raw 的容器）。
- `[U4]` ● basic token 被有意保留并**放回**：壳里装的就是 raw 单元，`Restore` 把 `RawData` 写回 `shell.Data`，`Unwrap` 再把它们逐个 `splice` 回宿主 — 证据 `:301-320`（`RawData`：按 `entry.Parts` 把已成形头部换回原文）、`:322-339`（`Restore`：`shell.Data = restored; entry.Parts = [];`）、`:780-785`（`const units:Array<Token> = shell.Data.slice(0); host.Data.splice(at, 1); for (…) host.Data.splice(at + index, 0, units[index]);`）。R19/R20/R35：壳关闭后 `Data` 就是 raw 列表，不是 AST children。

#### 收口：整段 raw 重建

- `[C2]` ● 壳收口时把 raw 整段交给别的 shape 重新解析：造一个假 `Bracket`（`view.Data = data`）当成员视图，调 `ClassDeclarationShape.BuildMembers` / `InterfaceDeclarationShape.BuildMembers` / `EnumDeclarationShape.BuildMembers` 全量重建，再用「条数=1 + 尾端相等 + `Pos` 相等」三重校验认领 — 证据 `:734-735`（`const view = new Bracket(host.Template); view.Data = data;`）、`:742`、`:744`、`:746`、`:751-760`（`if (members.length !== 1) { return null; } … if (built.SourceRange.End !== tail) { return null; } if ((built as ShapeToken).Pos !== basePos) { return null; }`）、`:801-802`（`const data = shell.Data.slice(0, cutData + 1); const tail = shell.Data.slice(tailStart);`）。R06/R07。
- `[X2]` ● 重建失败即回退旁路：`Finalize` 在 `built === null` 时直接 `Unwrap` 回 raw 并 `return shell`，宿主里继续留生 raw 单元 — 证据 `:804-806`（`if (built === null) { MemberShellCatalog.Unwrap(host, entry); return shell; }`）、`:764-791`（`Unwrap`：`Drop` + `Restore` + 逐单元插回 + `MountedUnit = null`）。
- `[B2]` ● `BuildMember` 把重建异常整块吞掉返回 `null`，构建诊断不进消息通道 — 证据 `:740-750`（`try { … members = ClassDeclarationShape.BuildMembers(host, view, context); … } catch (error) { return null; }`）。R23。
- `[U2]` ○ 失败路径回挂了 parent（`shell.Parent = host; :777`、`:811`、`:826`）却不 `Reclose`：全仓 `Reclose` 只有声明、0 处调用 — 证据 `:777`（`shell.Parent = host;`）、`core/syntax/token.xl.md:75`（`## method Reclose:(context:SyntaxContext)=>CloseStates`，无调用点）。R17③。

#### 收口判定：每轮全表重扫

- `[C1]` ● 收口判定每次都从零重建视图并全表遍历，收口结果不进任何 cache：`FinalizeShell` 每次 `RawData` + `codeAt` 两遍扫（`:897-908`）、`FinalizeAll` 遍历整个 `body.Data`（`:997-1004`）、`WrapAll` 全长度循环（`:521-523`）、`HeadKindAt` 从 0 数到 `at`（`:374-385`）、`IsHeadParameterBracket` 先向前找第一个 `(` 再向后找前驱（`:612-644`）、`Prune` 全表扫（`:161-173`）、`Find`/`Drop` 都是线性查（`:130-135`、`:150-155`）、`HeadCompute` 每格还要再数一遍 code 单元（`:702-707`）。R08。
- `[C3]` ○ 壳的生命周期状态存在静态数组里而不是 possible cache：`entry.Cache` 只是从 possible 借来的引用（`:69`、`:280`），`Reset()` 只清 `Open` 与四个计数器（`:107-115`），`Enable` 永不复位；壳的 `Parts`/`BodyBlock`/`Parent` 是第二套「cache」 — 证据 `:69`（`## field Cache:PossibleShapeCache | null = null`）、`:107-115`、`:828-835`（收口时反过来改写 possible 的 share：`ClassMemberPossibleUtil.UpdateItemStartAfterBuild(entry.Cache, host, at);`）。R09–R11。

- `[B1]` ● **符合**：取下标前有显式边界守卫，越界返回 `host` 而不是解引用 — 证据 `member-shell-catalog.xl.md:236-238`（`if (start < 0 || end < start || end >= host.Data.length) { return host; }`）、`:488-490`（`if (at < 0 || at >= shell.Data.length) { return; }`）。
- 结论：偏离（14 条）；另有 1 条标 **符合**（`[B1]`，不计入）。`S2` 不判——它替换的正是 possible 的位置，而不是「只有 shape 没有 possible」；`D1` 成立——围栏外无散文（prose 0）。

### typescript/tokens/types/property-signature-possible-shape.xl.md（25240B / 578 行代码；物理 836 行；MemberPossibleScan、MemberItemStartShared、MemberScanShared、MemberPossibleUtil、PropertySignaturePossibleShape）

- 结构：一个 possible + 一个族级扫描器 + 三个共享数据类。`MemberPossibleScan` 是 12 字段的可变游标（`Start/Checked/End/Kinds/HeadKinds/CodeAt/Code/Angle/BoundaryScan/Early/EarlyKind` + `Complete/HeadSettled`，`:26-52`）；`MemberPossibleUtil` 是族级工具箱：位掩码 kind（`:80-94`）、`Extend`/`ScanBoundary`/`Analyze` 增量推进（`:604`/`:622`/`:517`）、cache 存取（`ItemStartOf`/`ReuseScan`/`Scan`，`:652`/`:685`/`:714`）；`PropertySignaturePossibleShape` 只有三个方法：`ComputeByIndex`（`:774`）、`IsBuildable`（`:790`）、`BuildByIndex`（`:801`）。接口族七个候选（property/method/index/call/construct/get/set 签名）全部经由本文件的 `MemberPossibleUtil.Scan`，共用同一个 `CacheKey`。
- 偏离：

#### 扫描器与它自带的判定语义

- `[X1]` ● 一个 possible 里塞进「12 字段扫描状态 + kind 位掩码 + Pending 开关位 + 族级工具类」：`PendingBit = 128` 是一个设计外的「结论未定」标记，`Pending`/`IsPending`/`WithoutPending` 三个函数只服务它 — 证据 `:26-52`（`MemberPossibleScan` 全字段）、`:74-78`（`CacheKey`/`ItemStartKey`/`ScanSharedKey` 三个 `PossibleShape.SlotOf`）、`:94-112`（`## static field PendingBit:int = 128`、`Pending`/`IsPending`/`WithoutPending`）、`:114-116`（static 单槽文本缓存 `TextCacheUnit`/`TextCacheValue`）。IMPORTANCE 的三件套里没有「位掩码 + pending 位 + 静态文本缓存」。
- `[X1]` ○ `OnlyKind:(kind:int)=>int` 是恒等函数（`:130-134` `return kind;`），`HeadKindOf`/`EarlyHeadKind`/`ClassifyHead` 三层映射只是给中性 `MemberHeadKind` 再编码一次 — 证据 `:130-134`、`:270-295`、`:297-333`、`:335-515`。一层没有语义增量的转发。
- `[B4]` ● 读到当前 token **结束位置之后**的文档原文：`NextChar` 从 `last.EndIndex` 起逐字符前进，跳过空白与 `//`、`/* */` 注释，只为看下一个有效字符是什么 — 证据 `:211-252`（`const whole = SourceRange.Whole(document); let at = last.EndIndex; while (at < count) { const ch = whole.At(at); … if (ch === "/" && at + 1 < count) { … } return ch; }`）；调用点在判定链上：`:328`、`:449`、`:491`、`:567`（`MemberPossibleUtil.IsCompletionBoundary(MemberPossibleUtil.NextChar(last.SourceRange))`）。R22，且发生在 `ComputeByIndex` 经 `Scan` 调用的 `Analyze` 里（`:717-729` → `:726`）。
- `[B1]` ○ 越界返回 `Uncertain` 而不是 `Nothing` — 证据 `:777-779`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）。R25。

#### 候选判定：永不 Accept 的等待候选

- `[P2]` ● 纯分隔符 / 空条目把 kind 置成 `AllKinds()` 且 `Complete=false`：所有成员候选既不被淘汰也永远不 Accept，等待被容器的 raw 兜底收口 — 证据 `:529-533`（`if (MemberPossibleUtil.IsSeparator(code[0])) { state.Kinds = MemberPossibleUtil.AllKinds(); return; }` 与 `:525-528` 的空 `code` 分支）、`:784-787`（`if (state.Complete) { return ShapeStates.Accept; } return ShapeStates.Uncertain;`）。R27/R28 的终结路径被关掉；兜底在 `MemberShellCatalog.FinalizeAll`（`member-shell-catalog.xl.md:994-1004`）。
- `[P2]` ○ `PendingBit` 让「本次不定案」变成一个可传染的状态位，而真正的定案靠 `EarlyHeadKind` 的前瞻一次完成（`name :` / 名字闭合格 + 下一字符是属性符号），R30 的「唯一候选 + `IsBuildable`」次序被这次前瞻取代 — 证据 `:539-547`（`if (!state.HeadSettled) { const raw = MemberPossibleUtil.ClassifyHead(code); head = MemberPossibleUtil.WithoutPending(raw); if (!MemberPossibleUtil.IsPending(raw)) { state.HeadKinds = head; state.HeadSettled = true; } }`）、`:571-586`（`if (!complete && angle === 0) { const earlyKind = MemberPossibleUtil.EarlyHeadKind(code, code[code.length - 1]); … state.Early = true; }`）、`:790-799`（`IsBuildable` 只读 cache 里的 `Complete`/`Kinds`）。

#### cache：state 与 share 是同一个对象

- `[C3]` ○ 七个接口族候选共用**同一个** `CacheKey` 槽：本文件定义 `MemberPossibleUtil.CacheKey`，而 method/index/call/construct/get/set 六个 possible 全部 `MemberPossibleUtil.Scan(units, tokenIndex, cache)` + `cache.GetState(MemberPossibleUtil.CacheKey)`（如 `method-signature-possible-shape.xl.md:36`、`:49`、`:60`），所以 R11 的「state 面向单个 possible」在族级失效。
- `[C3]` ○ `ReuseScan` 把 **share 里的对象**原地重置后当作 state 返回并 `SetState`，state/share 同一引用；`Reset()` 只清 `Values`（`core/syntax/possible-shape-cache.xl.md:67-73`），被重置过的共享对象却仍挂在 `Share` 上 — 证据 `:685-712`（`let shared = cache.GetShare<MemberScanShared>(...); … const state = shared.Scan; state.Start = start; state.Checked = -1; … return state;`）、`:717-721`（`state = MemberPossibleUtil.ReuseScan(units, start, cache); cache.SetState(MemberPossibleUtil.CacheKey, state);`）。

#### BuildByIndex：raw 重建 + 挂壳

- `[P3]` ● Accept 之后交出来的不是关闭的 shape：`Early` 分支把 `MemberShellCatalog.Create` 的返回值当 build 产物直接 `return`（壳既未 `TryToClose` 也未 `SignOut`；`CatalogGuide` 只把返回值丢弃并 `Reset()`，`Quit` 在该文件里 0 处）— 证据 `:813-820`（`// [B2] name : 已唯一确定属性签名：先建**外壳**… if (state.Early) { const shell = MemberShellCatalog.Create(host, start, end, …); if (shell !== host) { MemberPossibleUtil.UpdateItemStartAfterBuild(…); } return shell; }`），对照 `core/syntax/catalog-guide.xl.md:99-107`（`BuildByIndex` 的返回值被丢弃，随后 `Reset()` 回 `Built`）。R27/R31–R32。
- `[C2]` ○ 非 Early 分支同样从 raw 整段重建：取 `[start, end]` 交给 `TypeBuilder.LoadFrom` + `ParseTypeMember` 重新解析整条成员，再 `splice` 掉原文 — 证据 `:822-831`（`const builder = new TypeBuilder(host.Template, context); const consumedLength = builder.LoadFrom(host.Data, start, end + 1, basePos); const built = builder.ParseTypeMember(); … host.Data.splice(start, consumedLength, built);`）。R06/R07。
- `[X2]` ○ 重建不完整就静默放弃：`MemberParsedWhole` 校验失败直接 `return host`（原文留在宿主里），无诊断、无回退标记 — 证据 `:752-762`（`if (builder.At !== builder.Units.length) { return false; } if (builder.OriginalConsumed() !== consumedLength) { return false; }`）、`:825-827`（`if (!MemberPossibleUtil.MemberParsedWhole(builder, consumedLength)) { return host; }`）、`:810-812`（`if (start < 0 || end < start) { return host; }`）。
- `[S4]` ○ 本文件产出形状的路径全部止于 builder：`:824`（`const built = builder.ParseTypeMember();`）之后只有类型断言与 `splice`，没有 `ParseFromShape` — 全仓唯一实现仍抛「未实现」（`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`）。R21。
- `[C1]` ○ 局部仍有每轮全扫：`HasParameterList` 每次从头扫 `code` 到 `last`（`:172-182`），`BasePos` 每次向前扫 trivia（`:732-750`），`IsIndexBracket` 每次重建 `bracket.Data` 的 code 数组（`:193-209`）、`BuildImportTypeAttribute` 同型 — 这些都在 `Analyze`/`BuildByIndex` 的调用链上。R08。

- `[R09]/[R10]` ● **符合**：`state` 与 `share` 成对走 `GetState`/`SetState`、`GetShare`/`SetShare` — 证据 `property-signature-possible-shape.xl.md:717-721`、`:688-691`、`:655-671`（`ItemStartOf` 还带 `shared.Host !== units` 有效性校验 `:634-636`）。
- `[C1]` ● **符合（增量侧）**：`Extend` 从 `state.Checked` 继续而不从头扫，`Analyze` 只在 `!state.HeadSettled` 时重分类 — 证据 `:607-619`（`for (let at = from; at <= tokenIndex; at++)`）、`:539-547`、`:553-556`（注释声明与全量重算逐 token 等价）。
- `[U4]` ● **符合**：被消费的 basic 单元在 build 处随 `splice` 一次性丢弃 — 证据 `:831`（`host.Data.splice(start, consumedLength, built);`）。
- `[B2]` ● **符合**：无 `try`/`catch`，`state` 缺失时选择抛错 — 证据 `:805-807`（`throw new Error("PropertySignaturePossibleShape.BuildByIndex: 判定状态缺失");`），全文 `try`/`catch` 计数 0。
- 结论：偏离（13 条）；另有 4 条标 **符合**（`[R09]/[R10]`、`[C1]` 增量侧、`[U4]`、`[B2]`，不计入）。

## 本批统计

- 文件数：3；有偏离文件数：3（三份都读到物理末行：2750 / 1011 / 836 行）。
- 按编号计数（共 42 条偏离；正文里标 **符合** 的 8 条不计入）：`X1` 12（●6/○6）、`C3` 4（○4）、`C2` 3（●2/○1）、`C1` 3（●1/○2）、`P2` 3（●2/○1）、`S4` 2（●1/○1）、`B4` 2（●1/○1）、`B1` 2（○2）、`U4` 2（●1/○1）、`P3` 2（●2）、`X2` 2（●1/○1）、`S3` 1（○）、`U1` 1（●）、`P1` 1（●）、`B2` 1（●）、`U2` 1（○）；`S1`/`S2`/`P4`/`R1`/`R2`/`U3`/`X3`/`D1`/`N` 未出现（三文件均无 `ExitOrPre`/`ComputePossibleShapes` 覆盖、无 tsx、围栏外无散文；`type-builder` 的 `try/catch` 与 `property-signature-possible-shape` 的 `try/catch` 计数均为 0）。
- 三条管线的关系：`type-builder`（2700 行手写类型文法）产出类型形状 → 成员层由 `property-signature-possible-shape` 之类在 `BuildByIndex` 里调它 → 成员壳目录在更外层先挂 raw、收口时再回调 `*DeclarationShape.BuildMembers`（与 `type-builder` 同构的第二个解析器）。`ParseFromShape` 在这三份文件里出现 0 次，全仓唯一实现仍抛「未实现」：整条链上没有一处「关闭后的 shape → AST」。
- 最严重 3 条：
  1. `[X1]`+`[S4]` ●（`type-builder.xl.md`）类型完全由设计外的 builder 从 basic token 直接建形状/建树（89 次 `new XxxShape`、51 个调用点），R19 的「build 那一刻进 shape 字段」与 R21 的 `ParseFromShape(shape)` 在类型层整体不存在——这是继 `statement-builder`/`expression-builder` 之后第三条同类管线，且被 20 个文件依赖。
  2. `[P2]`+`[P3]` ●（`member-shell-catalog.xl.md` + `property-signature-possible-shape.xl.md:813-820`）成员成不成立被「首单元一次 `Plan` + 边界扫描收口」取代，候选五条不参与；Accept 后交出的是一段 raw 壳而不是关闭的 shape，`Finalize` 再整段 raw 重建——R26–R32 在类/接口成员层同时失守。
  3. `[X1]`+`[U4]` ●（`member-shell-catalog.xl.md`）壳目录把 raw basic token 存进 `shell.Data`、`Restore` 放回、`Unwrap` 再插回宿主，配 `Open` 静态表、四个零调用的计数器与一个从无写入的 `Enable`；R19/R20/R35 的「用完即丢弃」与 `Data` = AST children 在这里被明确反着做。
