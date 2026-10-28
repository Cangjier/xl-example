# 41 类型层：possible / shape 与判定器（审计）

审计对象：`typescript/tokens/types/` 下 24 个文件（14 个 `PossibleShape` 候选，含 1 个兜底候选、5 个成员 shape、5 个判定器/工厂/工具）。
判据见 [01-rules.md](01-rules.md)；字节与代码行取自 `_facts/typescript-tokens-types.md`，行号以 `read` 返回值为准。

本批的关键上下文（不在本批但决定了偏离的性质）：
- 候选收敛确实走 `CatalogGuide`（`core/syntax/catalog-guide.xl.md:66-107`），但本批 13 个常规成员候选**谁活谁死**由 `ClassMemberPossibleUtil` / `MemberPossibleUtil` 的「族码表」决定（R26–R30 的形式成立、判据被搬走）。
- 成员块的目录安装点在 `class-declaration-shape.xl.md:112` / `interface-declaration-shape.xl.md:77`（`MemberShellCatalog.InstallBodyCatalog`，第 40 篇的范围），早建壳由 `MemberShellCatalog.Create` 建（`member-shell-catalog.xl.md:230-288`）。
- 5 个成员 shape 的三个钩子（`ExitOrPre` / `ComputePossibleShapes` / `OnBracketCreatedEvent`）全部转发给 `MemberShellCatalog`，本批按 R33/R34 逐处判。

---

### typescript/tokens/types/parameter-list-possible-shape.xl.md（24478B / 617 行；ParameterScan、ParameterListPossibleShape、ParameterPossibleShape）

- 结构：**possible 层，但候选只是一个空壳**。真正的参数表建形状逻辑在 `ParameterListPossibleShape` 的 26 个静态方法里（`Probe`/`Step`/`Finalize`/`Install*`），状态放在设计外的静态 `States:Array<ParameterScan>` 表；`ParameterPossibleShape extends PossibleShape` 的三个方法只负责把控制权交回那张表。
- 偏离：
  - `[P2]` ● `ComputeByIndex` 恒返回 `Uncertain`：既不淘汰也不定案，候选「活着」与被判「就是它」在返回值上不可区分；Accept 判据被搬到静态 `NextActionFor` — 证据 `parameter-list-possible-shape.xl.md:808-812`（`return ShapeStates.Uncertain;`）、`:688-692`（`return ParameterListPossibleShape.Probe(state, bracket.Data, null);`）
  - `[P3]` ● `BuildByIndex` 不产出任何形状：既不 `SignOut` 也不 `TryToClose`、也不设 `host.MountedUnit`，而是就地循环推进宿主括号的 `Data` 后原样返回宿主，R31/R32 两种去向都不成立 — 证据 `parameter-list-possible-shape.xl.md:828-841`（`while (guard < 64 && ParameterListPossibleShape.Step(state, bracket, context)) { guard++; } return host;`）
  - `[P1]` ○ 触发点有两套：`[` 走自造的 `StepAtBracketCreated`（宿主括号自己的格），`(` 走「全局注册一次 + `BracketRoleResolver.Resolve`」，不是「每个 bracket create 时 install catalog possible」 — 证据 `parameter-list-possible-shape.xl.md:89-98`（`if (ParameterListPossibleShape.CatalogRegistered) { return; } … BracketRoleResolver.RegisterCatalog(...)`）、`:780-804`（`StepAtBracketCreated` 与 `BracketCatalogInstaller.Install` 并存）
  - `[B4]` ● 用 `NextChar(unit.SourceRange)` 从当前单元 `EndIndex` 往后读**未 token 化原文**判断「后面是不是终结符」，据此决定本格建名字还是建类型 — 证据 `parameter-list-possible-shape.xl.md:583-584`（`&& (unit.Closed || ParameterListPossibleShape.IsTerminator(ParameterListPossibleShape.NextChar(unit.SourceRange)))`）、`:597-598`、`:385-408`（`NextChar` 从 `last.EndIndex` 扫到文档尾）
  - `[B4]` ● `TextBetween` 从 `bracket.SourceRange.Start + 1` 读原文到 `)`、`DefaultValueEnd` 向 tokenIndex **之后**扫到下一个顶层 `,`、`BuildDefaultValue` 把 `data.slice(at + 1, end)` 整段交给 legacy `ExpressionBuilder` — 证据 `parameter-list-possible-shape.xl.md:174-185`、`:296-309`（`for (let index = at + 1; index < data.length; index++)`）、`:311-323`
  - `[B2]` ● `BuildDefaultValue` 里 `try { builder.ParseAssign(); } catch { return null; }`：解析异常被判成「这个默认值建不出来」，诊断信息整段丢失（R23 明令禁止） — 证据 `parameter-list-possible-shape.xl.md:324-329`
  - `[B1]` ○ 越界用动作码 `0` 表示「本轮不动」，与「没有数据」不可区分；`BuildDefaultValue` 里 `data[at]` 无界检查 — 证据 `parameter-list-possible-shape.xl.md:446-448`（`if (start >= data.length) { return 0; }`）、`:480-482`、`:317`
  - `[C1]` ● 每格都用 `data.indexOf(shell)` 从头定位壳，`FindState` 线性扫静态 `States` 表（`IsBuildable`、`BuildByIndex`、`Finalize` 各扫一次），没有游标可复用 — 证据 `parameter-list-possible-shape.xl.md:472`（`const shellIndex = data.indexOf(shell);`）、`:127-136`（`for (const state of ParameterListPossibleShape.States)`）、`:817`、`:835`、`:715`
  - `[C3]` ● `cache` 形参在三个方法里**一次都没用**：0 处 `GetState`/`SetState`/`GetShare`/`SetShare`；共同状态放在静态 `States` 表里，靠 `DropState` 手动清，等价于一个不受 cache 生命周期管理的 share — 证据 `parameter-list-possible-shape.xl.md:808`、`:814`、`:828`（三个签名都收 `cache:PossibleShapeCache`）、`:70`（`static field States:Array<ParameterScan> = []`）、`:150-158`（`DropState`）
  - `[X1]` ● 设计外挂成建制：7 个指标计数器（`MountCount`/`PromotedNameCount`/`SimpleRejectCount`/`LegacyFallbackCount`/`FinalizeCount`/`BuildActionCount`/`DefaultValueCount`）、`Enabled` 总开关、两处写死的循环上限 `guard < 8` / `guard < 64` — 证据 `parameter-list-possible-shape.xl.md:54-68`、`:114`、`:682-685`、`:725-728`
- 结论：偏离（10 条）。做对的一半：basic token 在 `Probe` 里逐个 `data.splice` 掉、字段在那一刻就取到（`:588` `IdentifierShape.FromBasicToken`、`:588-593`），R19 的动作发生了；0 处 `ExitOrPre`/`ComputePossibleShapes` 覆盖（无 `R1`/`R2`）。但「谁在什么时候建形状」整套被移出候选，候选退化成一张表的前端。

### typescript/tokens/types/class-member-possible-util.xl.md（22623B / 604 行；ClassMemberPossibleScan、ClassMemberItemStartShared、ClassMemberPossibleUtil）

- 结构：**设计外的「族码表 + 增量扫描器」**（既不是 shape 也不是 possible/end）。8 个 `Kind` 常量、`ClassifyHead` 把成员头文本翻成「只剩哪几种候选」，`Scan` 把（起始格、已扫到哪、是否完整、种类集合）记进 cache 的 state 槽；本批 7 个 class 族候选全部只读它。
- 偏离：
  - `[P2]` ● 候选的生死不是候选自己判的：`ClassifyHead` 用一遍文本比较就返回 `OnlyKind(...)`，`Analyze` 把它写进 `state.Kinds`，候选的 `ComputeByIndex` 只做「我的 kind 在不在里面」的翻译；`Complete` 也是这里定的，候选的 Accept 因此完全由外部码表决定 — 证据 `class-member-possible-util.xl.md:317-471`（`ClassifyHead` 的 `return ClassMemberPossibleUtil.OnlyKind(...)` 逐分支各一处，如 `:332`/`:380`/`:383`/`:390`）、`:745-757`（`state.Kinds = kinds; state.Complete = complete && end >= 0;`）
  - `[X1]` ● 码表本身是 IMPORTANCE 没有的机制：`PropertyKind…IndexKind` 8 个整数码 + `AllKinds`/`OnlyKind`/`ImplementedKinds`/`HasKind`，与 interface 族的位掩码码表（`property-signature-possible-shape.xl.md:118-140`）连表示法都不同，跨族不可互换 — 证据 `class-member-possible-util.xl.md:59-120`
  - `[X1]` ● 「早建」判据：`EarlyHeadKind` 在成员头第一格就判出 Property，让 `Analyze` 提前 `complete = true` 并把 `state.Early`/`EarlyKind` 交给候选去建空壳壳 — 证据 `class-member-possible-util.xl.md:616-667`、`:731-743`（`state.Early = true; state.EarlyKind = earlyKind;`）
  - `[B4]` ● 收口与早建都靠读当前单元**之后**的原文：`NextChar(last.SourceRange)` 判定 `}`/`]`/`)`/`>` 收口，早建时又用它判 `:`/`=`/`!`/`?`/`;`/`}` — 证据 `class-member-possible-util.xl.md:720`（`if (!complete && ClassMemberPossibleUtil.IsCompletionBoundary(ClassMemberPossibleUtil.NextChar(last.SourceRange)))`）、`:656`、`:155-196`（`NextChar` 自己从 `last.EndIndex` 扫到 `count`，还替调用方跳过行注释与块注释）
  - `[C1]` ● `Extend` 只把新单元追加进 `Code`（增量，做对的一半），但每格紧接着 `Analyze` → `ClassifyHead(code)` 从 0 把累积的整段 `code` 重扫一遍；`Angle` 与 `Boundary` 都有增量游标，唯独「种类」每格重算 — 证据 `class-member-possible-util.xl.md:481-489`（`for (let at = from; at <= tokenIndex; at++)`）、`:771-775`（`Extend` → `Analyze` → `state.Checked = tokenIndex + 1`）、`:691`（`state.Kinds = ClassMemberPossibleUtil.ClassifyHead(code);`）
  - `[C3]` ○ 共同状态用 `GetState`/`SetState`（R10 要求这类「多个 possible 共用」的东西走 share），键是 `PossibleShape.SlotOf(ClassMemberPossibleScan)` 的单一槽；好处是 `CatalogGuide.Reset` 的 `Clear()` 会一并清掉，坏处是语义上它是 share 却被当 state 用 — 证据 `class-member-possible-util.xl.md:55`（`static field CacheKey:any = PossibleShape.SlotOf(ClassMemberPossibleScan)`）、`:764`、`:769`；对照同文件真正合规的 share 用法 `:559`/`:569`/`:581`
  - `[B1]` ○ `Extend` 没有 `at < units.length` 守卫，`tokenIndex` 越界时直接解引用 `units[at]`；`Scan` 也没有「没有数据」的返回值 — 证据 `class-member-possible-util.xl.md:481-483`（`const unit = units[at]; if (unit.IsTriviaToken)`）、`:760-776`
- 结论：偏离（7 条）。它是本批 7 个 class 族候选的「共同判据单点」：候选文件里看到的 `HasKind(state.Kinds, …)` 全是这里的码表，改动这里等于同时改 7 个候选的语义。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/types/member-boundary.xl.md（19201B / 533 行；MemberBoundaryScan、MemberBoundaryCache、MemberBoundary、MemberHeadKind、MemberHeadPlan、MemberHeadScan）

- 结构：**设计外的「成员判界器」**。`MemberBoundary` 判成员与成员的边界（换行 + 左单元能结束 + 右单元像成员起点），`MemberHeadScan` 判一条成员头是属性/方法/构造器/访问器/索引/静态块哪一种，`MemberHeadKind`+`MemberHeadPlan` 是它的中性码表与产物。
- 偏离：
  - `[X1]` ● 判界器整套是 IMPORTANCE 未定义的层：6 个类、`MemberBoundaryCache` 手工缓存、`MemberHeadPlan` 产物对象；设计里「形状什么时候结束」应由 end 候选 + shape close 回答，这里由一个纯文本扫描器回答 — 证据 `member-boundary.xl.md:14-28`（`MemberBoundaryScan`/`MemberBoundaryCache`/`MemberBoundary`）、`:333-355`（`MemberHeadKind`/`MemberHeadPlan`）、`:357`（`MemberHeadScan`）
  - `[X1]` ● 第二套族码表：`MemberHeadKind` 的 8 个中性值与 `ClassMemberPossibleUtil` 的 8 个 kind 由 `HeadKindOf` 一一映射，两张表必须人工保持一致（例如 `Construct` 在 class 族无对应，靠 `MemberShellCatalog.Create` 里改写成 Method） — 证据 `member-boundary.xl.md:333-349`、`class-member-possible-util.xl.md:589-614`（`HeadKindOf`）、`member-shell-catalog.xl.md:250-253`（`if (family === MemberShellFamily.Class && kind === MemberHeadKind.Construct) { kind = MemberHeadKind.Method; }`）
  - `[B4]` ● `MemberHeadScan.Plan` 从 `unit.SourceRange.EndIndex` 起用原文走完整条成员头：跳过空白与注释、读名字、读到 `:`/`=`/`;`/`}`/`,` 才判属性，读到 `(`/`<` 才判方法，读到 `{` 才判静态块 —— 读到的字符远在当前 tokenIndex 之后 — 证据 `member-boundary.xl.md:526`（`cursor = range.EndIndex`）、`:558-675`（`while (cursor < count)` 整段）、`:510-513`（索引签名 `NextSignificant(whole, range.EndIndex, count)` 看后面是不是 `:`）、`:610-645`（`<` 配平到 `count` 再要求紧跟 `(`）
  - `[B4]` ○ `FindMemberBoundary`/`FindTypeMemberBoundary` 在 `code` 数组上**向后**找边界（`for (let at = from + 1; at < code.length; at++)`），而 `code` 是调用方传进来的整段成员外壳 raw（`member-shell-catalog.xl.md:938`），边界可能落在当前判定格之后 — 证据 `member-boundary.xl.md:75`、`:114`
  - `[C1]` ● 判界每次都从头重扫：`FindMemberBoundary` 的 cache 只在「同一 `code` 实例 + `from` 不比上次更早 + 旧边界仍在前方」时命中，否则 O(n) 重扫；`IsMemberSignatureAwaitingParams` 每次被问都从 0 扫两遍到 `at`；`FindTypeMemberBoundary` 根本没有 cache 参数 — 证据 `member-boundary.xl.md:70-74`、`:75`、`:171-203`、`:111-157`
- 结论：偏离（5 条）。做对的一半：`ScanTypeMemberBoundary` 用 `scan.Checked` 游标做增量（`:36-65`），`LooksLikeMemberStart`/`CanEndTypeUnit`/`CanFollowModifierToken` 一类判据只读 Token 不读原文；0 处 `catch`；下标访问都有界（`:222-224`、`:305-308`、`:240-243`），无 `B1`。

### typescript/tokens/types/type-catalog-factory.xl.md（13846B / 379 行；TypeCatalogFactory）

- 结构：**设计外的「类型面工厂/判定器」**。给 `VariableDeclarationShape` 提供三个问题：类型能不能到此结束（`CanEndType`）、初始化器能不能到此结束（`CanEndInitializer`）、`=` 之后是不是一条带类型的初始化器（`StartsTypedInitializer`），外加两个「把整段单元交给 legacy builder」的入口（`ParseType`/`ParseInitializer`）。
- 偏离：
  - `[X1]` ● 工厂是 IMPORTANCE 没有的层：两个 magic 字符集当判据（`TypeContinuation = ".[<|&?>"`、`InitializerEnd = ";,)]}="`）、一个待追加的 `Annotations` 形状表 — 证据 `type-catalog-factory.xl.md:21-25`、`:487-493`
  - `[P2]` ○ 「类型是否收口」这个本该由 end 候选/候选 `ComputeByIndex` 回答的问题被搬到工厂：调用方据此决定是否 `Accept`/进 `TypeMode`，工厂本身不在任何 `CatalogGuide` 里 — 证据 `type-catalog-factory.xl.md:117-128`（`CanEndType`）、`:185-196`（`CanEndInitializer`）、`:347-415`（`StartsTypedInitializer`）；调用方 `variable-declaration-shape.xl.md:188`、`:280`
  - `[B4]` ● 所有「能不能结束」都在读当前单元**之后**的原文：`NextSignificantText`/`NextSignificantChar`/`NextWord` 从 `unit.SourceRange.EndIndex` 起身读 `document.GetValue`，自己跳过空白与注释 — 证据 `type-catalog-factory.xl.md:79-113`、`:120-127`（`CanEndType` 只看 `NextSignificantChar`）、`:142-182`、`:188-195`
  - `[B2]` ● 三处 `try/catch` 把整段解析的异常吃成 `null`：`builder.ParseType()`、`builder.ParseExpression()`、`builder.ParseExpressionFrom()` 抛出的诊断全部消失，调用方只看到「建不出来」 — 证据 `type-catalog-factory.xl.md:210-220`、`:236-246`、`:262-273`
  - `[X2]` ● legacy 整段重建：`ParseType`/`ParseInitializer`/`ParseInitializerFrom` 先把 `units` 滤成 `code`，再整段 `builder.Load(code, basePos)` 交给 `TypeBuilder`/`ExpressionBuilder` 递归下降重建，形状树不参与 — 证据 `type-catalog-factory.xl.md:201-213`、`:226-240`、`:252-266`
  - `[C1]` ● 每个判据函数每次调用都整段扫 `units`（`AnnotationColon`/`FirstEqual`/`HasTypeAssert`/`HasTypeArgumentCall`/`HasParameterType`），`StartsTypedInitializer` 一次调用能串起 3~4 次全扫，中间结论一概不落 cache — 证据 `type-catalog-factory.xl.md:280-299`、`:305-315`、`:320-344`、`:420-461`、`:468-484`、`:350`+`:360`+`:391`
- 结论：偏离（6 条）。做对的一半：`FirstSignificant`/`LastSignificant` 的返回 `-1`、`StartsTypedInitializer` 对 `first < 0`/`next < 0` 的守卫都是干净的越界协议（`:350-353`、`:375-379`）；0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/types/angle-judge.xl.md（12740B / 399 行；AngleJudge）

- 结构：**设计外的「尖括号判定器」**。回答「这个 `<` 是类型实参/类型参数表的开始，还是小于号」——用单元序列配平（`FindClose`/`FindPair`）加一个 4096 字符的原文窗口（`FindCloseAhead`），再由后继单元白名单（`FollowerAllows`）定案。
- 偏离：
  - `[X1]` ● 判定器本身是设计外机制：`<` 的歧义在 TS 里是解析上下文问题，这里用「向后找配对 + 后继 token 白名单 + 换行规则」做出来，白名单里 `!`/`?.`/`as`/`satisfies`/`instanceof`/`in`/`extends` 逐条枚举 — 证据 `angle-judge.xl.md:206-267`（`FollowerAllows`）、`:269-325`（`IsInstantiationClose`）、`:15`（`static field FindCloseAheadLimit:int = 4096`）
  - `[B4]` ● `FindClose`/`FindPair` 从 `index` 一路扫到 `units.length`；`IsInstantiationClose` 向前找 opener 时对每个前置 `<` 调 `FindClose`、再向后跳 trivia 找 follower；`CanStart` 直接靠 `FindClose` 看完整段 — 证据 `angle-judge.xl.md:130`（`for (let at = index; at < units.length; at++)`）、`:175`、`:284-294`、`:311-324`、`:339-343`
  - `[B4]` ● `FindCloseAhead` 用 `range.GetRawRange(from, limit)` 取当前 `<` 之后最多 4096 字符的**未 token 化原文**，自己跳过行注释/块注释/单双引号串/模板串，再按字符 `<>` 配平 — 证据 `angle-judge.xl.md:364-365`（`const limit = from + AngleJudge.FindCloseAheadLimit; const content = range.GetRawRange(from, limit < count ? limit : count);`）、`:368-442`
  - `[C1]` ● 完全无 cache，且是 O(n²)~O(n²·4096)：`IsInstantiationClose` 对每个前置 `<` 重跑一遍 `FindClose`；`IsOpenAt` 从 0 扫到 `index`、对每个 `<` 再调一次 `FindCloseAhead`（每次都重读 4KB 原文）；`IsGroupMember` 每次都把两者重算 — 证据 `angle-judge.xl.md:289`（`if (AngleJudge.FindClose(units, at) !== index)`）、`:456-467`、`:477-482`
- 结论：偏离（4 条）。做对的一半：三个入口都做了界检查并返回 `-1`/`false`（`:123-125`、`:168-170`、`:272-274`、`:330-332`），无 `B1`；0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/types/construct-signature-possible-shape.xl.md（4181B / 60 行；ConstructSignaturePossibleShape）

- 结构：**possible 层（interface 族构造签名候选）**。三个方法：`ComputeByIndex` 读 interface 族的位掩码码表决定 Reject/Accept、`IsBuildable` 复读 cache 里的同一状态、`BuildByIndex` 先看 `state.Early` 建早建壳、否则交给 legacy `TypeBuilder.ParseTypeMember`。
- 偏离：
  - `[P2]` ● 候选判据是外部码表：`MemberPossibleUtil.Scan` 给出 `Kinds`（位掩码）与 `Complete`，本候选只判「`ConstructKind` 位在不在」 — 证据 `construct-signature-possible-shape.xl.md:36-43`（`if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.ConstructKind)) { return ShapeStates.Reject; } if (state.Complete) { return ShapeStates.Accept; }`）
  - `[X1]` ● 早建分支：`state.Early` 为真时调设计外的 `MemberShellCatalog.Create(...)` 建占位壳并把剩余单元交给它，再顺手更新 share 里的条目起点；`Early` 本身是 (`class-member-possible-util`/`property-signature-possible-shape`) 用原文前瞻算出来的 — 证据 `construct-signature-possible-shape.xl.md:81-87`（`const earlyShell = MemberShellCatalog.Create(host, start, end, MemberShellFamily.Interface, catalog.PossibleShapesComputeCache, context);`）
  - `[X2]` ● 非早建路径的真品由 legacy builder 直建：`TypeBuilder.LoadFrom(host.Data, start, end + 1, basePos)` + `ParseTypeMember()`，形状树只是被喂进去的原料 — 证据 `construct-signature-possible-shape.xl.md:89-91`；产出类型校验失败时直接 `throw`（`:95-98`）
  - `[P3]` ● build 去向不成立：`host.Data.splice(start, consumedLength, built)` 之后既不 `SignOut` 也不 `TryToClose`、也不设 `host.MountedUnit`（该 shape 由 `TypeBuilder` 内部关过，但候选自己没有 R31 的关动作）；另一条路 `MemberParsedWhole` 失败就 `return host`，build 什么都没做却已被 `CatalogGuide` 记成 `Built` — 证据 `construct-signature-possible-shape.xl.md:99-102`、`:92-94`
  - `[B1]` ○ 越界返回 `Uncertain`（不是 `Nothing`）；状态缺失/越界则 `throw new Error("…判定状态缺失")`，把「没有数据」当异常 — 证据 `construct-signature-possible-shape.xl.md:33-35`、`:60-62`
  - `[C1]` ○ 每个字符格都进一次 `Scan` → `Analyze` → `ClassifyHead` 全扫累积 `code`（重扫在被调方），候选自身没有 for — 证据 `construct-signature-possible-shape.xl.md:36`；被调方 `property-signature-possible-shape.xl.md:723-727`、`:541`
  - `[C3]` ○ 状态从 `catalog.PossibleShapesComputeCache` 的共用 state 槽读（键由 `MemberPossibleUtil.CacheKey` 给），interface 族的 `MemberScanShared` 又把同一个对象塞进 share，state/share 语义混用 — 证据 `construct-signature-possible-shape.xl.md:49`、`:60`；`property-signature-possible-shape.xl.md:688-721`
- 结论：偏离（7 条）。本文件 0 处 `catch`（`TypeBuilder` 以抛错报诊断，符合 R23）；0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/types/property-declaration-possible-shape.xl.md（3717B / 48 行；PropertyDeclarationPossibleShape）

- 结构：**possible 层（class 族属性声明候选）**。同一副三方法骨架，码表换成 `ClassMemberPossibleUtil` 的 `Array<int>`，真品由 `ClassDeclarationShape.BuildMemberFromCode` 直建。
- 偏离：
  - `[P2]` ● 判据同样在外部码表：`ClassMemberPossibleUtil.Scan` 的 `Kinds`/`Complete` 决定 Reject/Accept，候选只做 `PropertyKind` 的成员测试 — 证据 `property-declaration-possible-shape.xl.md:36-43`
  - `[X1]` ● 早建分支 + `MemberShellCatalog.Create(host, start, end, MemberShellFamily.Class, …)`（注释直言「先建外壳，余下的单元由外壳吃掉，到边界再交给 legacy builder 建正品」） — 证据 `property-declaration-possible-shape.xl.md:69-76`
  - `[X2]` ● 非早建路径把 `consumed` 整段交给 legacy `ClassDeclarationShape.BuildMemberFromCode`（内部 `BuildMembers` 递归下降），形状树不参与建树 — 证据 `property-declaration-possible-shape.xl.md:77-79`
  - `[B2]` ○ 本文件无 `catch`，但唯一的建树入口内部有：`BuildMemberFromCode` 把 `BuildMembers` 的异常 `catch` 成 `null`（`class-declaration-shape.xl.md:436-440`），候选随后 `return host`，诊断消失 — 证据 `property-declaration-possible-shape.xl.md:80-82`（`if (built === null) { return host; }`）
  - `[P3]` ● build 产物既不关闭也不挂载：`host.Data.splice(start, consumed.length, built)` 后就 `built.Parent = host; return built;`，0 处 `SignOut`/`TryToClose`/`MountedUnit` — 证据 `property-declaration-possible-shape.xl.md:86-90`
  - `[B1]` ○ 越界 → `Uncertain`；`state` 缺失/越界 → `throw` — 证据 `property-declaration-possible-shape.xl.md:33-35`、`:60-62`
  - `[C1]` ○ 每格 `Scan` → `Analyze` → `ClassifyHead` 全扫（在被调方） — 证据 `property-declaration-possible-shape.xl.md:36`；`class-member-possible-util.xl.md:691`
  - `[C3]` ○ 共用 state 槽而非 share（`ClassMemberPossibleUtil.CacheKey`） — 证据 `property-declaration-possible-shape.xl.md:49`、`:60`；`class-member-possible-util.xl.md:55`
- 结论：偏离（8 条）。0 处 `ExitOrPre`/`ComputePossibleShapes`；`UpdateItemStartAfterBuild` 确实在 build 之后推进 share 的条目起点（`:88`），这一处 cache 用法是对的。

### typescript/tokens/types/method-declaration-possible-shape.xl.md（3657B / 47 行；MethodDeclarationPossibleShape）

- 结构：**possible 层（class 族方法声明候选）**，与属性声明候选同构，只是 kind 换成 `MethodKind`、结果类型校验换成 `MethodDeclarationShape`。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `ClassMemberPossibleUtil` 的码表决定 — 证据 `method-declaration-possible-shape.xl.md:38-45`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Class, ...)` — 证据 `method-declaration-possible-shape.xl.md:71-77`
  - `[X2]` ● 真品由 legacy `ClassDeclarationShape.BuildMemberFromCode` 直建 — 证据 `method-declaration-possible-shape.xl.md:78-80`
  - `[B2]` ○ 建树入口内部 `catch`（`class-declaration-shape.xl.md:436-440`），本候选把 `null` 当「建不出来」 — 证据 `method-declaration-possible-shape.xl.md:81-83`
  - `[P3]` ● splice 之后不 `SignOut`/`TryToClose`/`MountedUnit` — 证据 `method-declaration-possible-shape.xl.md:87-91`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `method-declaration-possible-shape.xl.md:35-37`、`:62-64`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `method-declaration-possible-shape.xl.md:38`；`class-member-possible-util.xl.md:691`
  - `[C3]` ○ 共用 state 槽而非 share — 证据 `method-declaration-possible-shape.xl.md:51`、`:62`
- 结论：偏离（8 条）。与属性声明候选逐行同构，偏离也同构；0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/types/class-static-block-declaration-possible-shape.xl.md（3589B / 47 行；ClassStaticBlockDeclarationPossibleShape）

- 结构：**possible 层（class 族静态块候选）**，同一骨架，kind 为 `StaticBlockKind`，早建壳家族仍是 `MemberShellFamily.Class`。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `ClassMemberPossibleUtil` 码表决定 — 证据 `class-static-block-declaration-possible-shape.xl.md:32-39`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Class, ...)` — 证据 `class-static-block-declaration-possible-shape.xl.md:65-71`
  - `[X2]` ● 真品由 legacy `ClassDeclarationShape.BuildMemberFromCode` 直建 — 证据 `class-static-block-declaration-possible-shape.xl.md:72-74`
  - `[B2]` ○ 建树入口内部 `catch`（`class-declaration-shape.xl.md:436-440`） — 证据 `class-static-block-declaration-possible-shape.xl.md:75-77`
  - `[P3]` ● splice 之后不关闭也不挂载 — 证据 `class-static-block-declaration-possible-shape.xl.md:81-85`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `class-static-block-declaration-possible-shape.xl.md:29-31`、`:56-58`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `class-static-block-declaration-possible-shape.xl.md:32`；`class-member-possible-util.xl.md:691`
  - `[C3]` ○ 共用 state 槽而非 share — 证据 `class-static-block-declaration-possible-shape.xl.md:45`、`:56`
- 结论：偏离（8 条）。静态块是唯一「成员头判据 = `static` + `{`」的候选，判据在 `ClassifyHead` 里（`class-member-possible-util.xl.md:382-384`），本文件只消费结论。

### typescript/tokens/types/class-get-accessor-possible-shape.xl.md（3523B / 47 行；GetAccessorPossibleShape）

- 结构：**possible 层（class 族 get 访问器候选）**，kind 为 `GetKind`，真品类型校验为 `GetAccessorShape`。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `ClassMemberPossibleUtil` 码表决定 — 证据 `class-get-accessor-possible-shape.xl.md:33-40`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Class, ...)` — 证据 `class-get-accessor-possible-shape.xl.md:66-72`
  - `[X2]` ● 真品由 legacy `ClassDeclarationShape.BuildMemberFromCode` 直建 — 证据 `class-get-accessor-possible-shape.xl.md:73-75`
  - `[B2]` ○ 建树入口内部 `catch`（`class-declaration-shape.xl.md:436-440`） — 证据 `class-get-accessor-possible-shape.xl.md:76-78`
  - `[P3]` ● splice 之后不关闭也不挂载 — 证据 `class-get-accessor-possible-shape.xl.md:82-86`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `class-get-accessor-possible-shape.xl.md:30-32`、`:57-59`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `class-get-accessor-possible-shape.xl.md:33`；`class-member-possible-util.xl.md:691`
  - `[C3]` ○ 共用 state 槽而非 share — 证据 `class-get-accessor-possible-shape.xl.md:46`、`:57`
- 结论：偏离（8 条）。注意与 interface 族的 `get-accessor-possible-shape`（同名类、不同族）分属两个文件，码表一族用数组一族用位掩码。

### typescript/tokens/types/constructor-possible-shape.xl.md（3519B / 47 行；ConstructorPossibleShape）

- 结构：**possible 层（class 族构造器候选）**，kind 为 `ConstructorKind`，真品类型校验为 `ConstructorShape`。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `ClassMemberPossibleUtil` 码表决定 — 证据 `constructor-possible-shape.xl.md:33-40`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Class, ...)` — 证据 `constructor-possible-shape.xl.md:66-72`
  - `[X2]` ● 真品由 legacy `ClassDeclarationShape.BuildMemberFromCode` 直建 — 证据 `constructor-possible-shape.xl.md:73-75`
  - `[B2]` ○ 建树入口内部 `catch`（`class-declaration-shape.xl.md:436-440`） — 证据 `constructor-possible-shape.xl.md:76-78`
  - `[P3]` ● splice 之后不关闭也不挂载 — 证据 `constructor-possible-shape.xl.md:82-86`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `constructor-possible-shape.xl.md:30-32`、`:57-59`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `constructor-possible-shape.xl.md:33`；`class-member-possible-util.xl.md:691`
  - `[C3]` ○ 共用 state 槽而非 share — 证据 `constructor-possible-shape.xl.md:46`、`:57`
- 结论：偏离（8 条）。`constructor` 的识别（名字是标识符且文本为 `constructor`）在 `ClassifyHead` 里（`class-member-possible-util.xl.md:452-454`），候选自己没有判据。

### typescript/tokens/types/class-index-signature-possible-shape.xl.md（3514B / 47 行；IndexSignaturePossibleShape）

- 结构：**possible 层（class 族索引签名候选）**，kind 为 `IndexKind`，真品类型校验为 `IndexSignatureShape`。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `ClassMemberPossibleUtil` 码表决定（`IndexKind` 只由 `[k: T]` 形态给出） — 证据 `class-index-signature-possible-shape.xl.md:33-40`；`class-member-possible-util.xl.md:388-391`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Class, ...)` — 证据 `class-index-signature-possible-shape.xl.md:66-72`
  - `[X2]` ● 真品由 legacy `ClassDeclarationShape.BuildMemberFromCode` 直建 — 证据 `class-index-signature-possible-shape.xl.md:73-75`
  - `[B2]` ○ 建树入口内部 `catch`（`class-declaration-shape.xl.md:436-440`） — 证据 `class-index-signature-possible-shape.xl.md:76-78`
  - `[P3]` ● splice 之后不关闭也不挂载 — 证据 `class-index-signature-possible-shape.xl.md:82-86`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `class-index-signature-possible-shape.xl.md:30-32`、`:57-59`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `class-index-signature-possible-shape.xl.md:33`；`class-member-possible-util.xl.md:691`
  - `[C3]` ○ 共用 state 槽而非 share — 证据 `class-index-signature-possible-shape.xl.md:46`、`:57`
- 结论：偏离（8 条）。class 族的索引签名与 interface 族同名类（`index-signature-possible-shape`）是两个文件、两套码表，偏离同构。

### typescript/tokens/types/class-set-accessor-possible-shape.xl.md（3490B / 47 行；SetAccessorPossibleShape）

- 结构：**possible 层（class 族 set 访问器候选）**，kind 为 `SetKind`，真品类型校验为 `SetAccessorShape`。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `ClassMemberPossibleUtil` 码表决定 — 证据 `class-set-accessor-possible-shape.xl.md:33-40`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Class, ...)` — 证据 `class-set-accessor-possible-shape.xl.md:66-72`
  - `[X2]` ● 真品由 legacy `ClassDeclarationShape.BuildMemberFromCode` 直建 — 证据 `class-set-accessor-possible-shape.xl.md:73-75`
  - `[B2]` ○ 建树入口内部 `catch`（`class-declaration-shape.xl.md:436-440`） — 证据 `class-set-accessor-possible-shape.xl.md:76-78`
  - `[P3]` ● splice 之后不关闭也不挂载 — 证据 `class-set-accessor-possible-shape.xl.md:82-86`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `class-set-accessor-possible-shape.xl.md:30-32`、`:57-59`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `class-set-accessor-possible-shape.xl.md:33`；`class-member-possible-util.xl.md:691`
  - `[C3]` ○ 共用 state 槽而非 share — 证据 `class-set-accessor-possible-shape.xl.md:46`、`:57`
- 结论：偏离（8 条）。class 族 7 个候选（属性/方法/构造器/get/set/静态块/索引）+ 兜底候选共用同一个 `ClassMemberPossibleScan` 状态与同一张码表，这是「8 个文件同构偏离」的根源。

### typescript/tokens/types/method-signature-possible-shape.xl.md（3470B / 47 行；MethodSignaturePossibleShape）

- 结构：**possible 层（interface 族方法签名候选）**。骨架与 construct-signature 候选相同，kind 为 `MethodKind`（位掩码），真品由 `TypeBuilder.ParseTypeMember` 建。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `MemberPossibleUtil.Scan` 的位掩码 `Kinds`+`Complete` 决定 — 证据 `method-signature-possible-shape.xl.md:36-43`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Interface, ...)` — 证据 `method-signature-possible-shape.xl.md:69-75`
  - `[X2]` ● 真品由 legacy `TypeBuilder.LoadFrom` + `ParseTypeMember()` 直建 — 证据 `method-signature-possible-shape.xl.md:76-79`
  - `[P3]` ● splice 之后不 `SignOut`/`TryToClose`/`MountedUnit`；`MemberParsedWhole` 失败即 `return host`（空 build 被记成 `Built`） — 证据 `method-signature-possible-shape.xl.md:80-89`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `method-signature-possible-shape.xl.md:33-35`、`:60-62`
  - `[C1]` ○ 每格全扫在被调方（`property-signature-possible-shape.xl.md:723-727`） — 证据 `method-signature-possible-shape.xl.md:36`
  - `[C3]` ○ 共用 state 槽 + 同对象入 share（`property-signature-possible-shape.xl.md:688-721`） — 证据 `method-signature-possible-shape.xl.md:49`、`:60`
- 结论：偏离（7 条）。本文件 0 处 `catch`：`TypeBuilder` 以 `throw` 报诊断（`type-builder.xl.md:1093` 等 50 余处），符合 R23。

### typescript/tokens/types/index-signature-possible-shape.xl.md（3431B / 47 行；IndexSignaturePossibleShape）

- 结构：**possible 层（interface 族索引签名候选）**，kind 为 `IndexKind`，真品由 `TypeBuilder.ParseTypeMember` 建。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `MemberPossibleUtil` 位掩码码表决定 — 证据 `index-signature-possible-shape.xl.md:34-41`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Interface, ...)` — 证据 `index-signature-possible-shape.xl.md:67-73`
  - `[X2]` ● 真品由 legacy `TypeBuilder` 直建 — 证据 `index-signature-possible-shape.xl.md:74-77`
  - `[P3]` ● splice 之后不关闭也不挂载 — 证据 `index-signature-possible-shape.xl.md:78-87`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `index-signature-possible-shape.xl.md:31-33`、`:58-60`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `index-signature-possible-shape.xl.md:34`；`property-signature-possible-shape.xl.md:723-727`
  - `[C3]` ○ 共用 state 槽 + 同对象入 share — 证据 `index-signature-possible-shape.xl.md:47`、`:58`
- 结论：偏离（7 条）。`[k: string]` 的形态判定同样在码表里（`property-signature-possible-shape.xl.md:380-382` 调 `IsIndexBracket`，定义在 `:193`），候选只消费结论。

### typescript/tokens/types/set-accessor-possible-shape.xl.md（3391B / 47 行；SetAccessorPossibleShape）

- 结构：**possible 层（interface 族 set 访问器候选）**，kind 为 `SetKind`，真品由 `TypeBuilder.ParseTypeMember` 建。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `MemberPossibleUtil` 位掩码码表决定 — 证据 `set-accessor-possible-shape.xl.md:34-41`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Interface, ...)` — 证据 `set-accessor-possible-shape.xl.md:67-73`
  - `[X2]` ● 真品由 legacy `TypeBuilder` 直建 — 证据 `set-accessor-possible-shape.xl.md:74-77`
  - `[P3]` ● splice 之后不关闭也不挂载 — 证据 `set-accessor-possible-shape.xl.md:78-87`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `set-accessor-possible-shape.xl.md:31-33`、`:58-60`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `set-accessor-possible-shape.xl.md:34`；`property-signature-possible-shape.xl.md:723-727`
  - `[C3]` ○ 共用 state 槽 + 同对象入 share — 证据 `set-accessor-possible-shape.xl.md:47`、`:58`
- 结论：偏离（7 条）。interface 族 5 个候选（属性/方法/索引/调用/构造/两个访问器）共用一张位掩码码表，与 class 族的数组码表互为平行实现。

### typescript/tokens/types/get-accessor-possible-shape.xl.md（3387B / 47 行；GetAccessorPossibleShape）

- 结构：**possible 层（interface 族 get 访问器候选）**，kind 为 `GetKind`，真品由 `TypeBuilder.ParseTypeMember` 建。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `MemberPossibleUtil` 位掩码码表决定（`get` 后面是否真有名字、是否紧跟参数表，也在码表里判，`property-signature-possible-shape.xl.md:421-433`） — 证据 `get-accessor-possible-shape.xl.md:34-41`
  - `[X1]` ● 早建分支走 `MemberShellCatalog.Create(..., MemberShellFamily.Interface, ...)` — 证据 `get-accessor-possible-shape.xl.md:67-73`
  - `[X2]` ● 真品由 legacy `TypeBuilder` 直建 — 证据 `get-accessor-possible-shape.xl.md:74-77`
  - `[P3]` ● splice 之后不关闭也不挂载 — 证据 `get-accessor-possible-shape.xl.md:78-87`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `get-accessor-possible-shape.xl.md:31-33`、`:58-60`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `get-accessor-possible-shape.xl.md:34`；`property-signature-possible-shape.xl.md:723-727`
  - `[C3]` ○ 共用 state 槽 + 同对象入 share — 证据 `get-accessor-possible-shape.xl.md:47`、`:58`
- 结论：偏离（7 条）。`get x` 不带参数表时该判属性还是访问器，判据在 `ClassifyHead` 的 get/set 分支（`property-signature-possible-shape.xl.md:421-467`），候选无从判断。

### typescript/tokens/types/call-signature-possible-shape.xl.md（3020B / 40 行；CallSignaturePossibleShape）

- 结构：**possible 层（interface 族调用签名候选）**，kind 为 `CallKind`（位掩码），真品由 `TypeBuilder.ParseTypeMember` 建。**它是本批唯一没有早建分支的成员候选**（不 import `MemberShellCatalog`）。
- 偏离：
  - `[P2]` ● Reject/Accept 由 `MemberPossibleUtil` 位掩码码表决定 — 证据 `call-signature-possible-shape.xl.md:34-41`
  - `[X1]` ● 与同族候选不一致：没有 `state.Early` 分支，早建与否由码表在 `property-signature-possible-shape` 里算出来却在这里被忽略；收尾判据也来自该文件的 `MemberParsedWhole` — 证据 `call-signature-possible-shape.xl.md:67-73`（直接进 `TypeBuilder`，无 `Early` 判断）、`:71`（`MemberPossibleUtil.MemberParsedWhole(builder, consumedLength)`）
  - `[X2]` ● 真品由 legacy `TypeBuilder.LoadFrom` + `ParseTypeMember()` 直建 — 证据 `call-signature-possible-shape.xl.md:67-70`
  - `[P3]` ● splice 之后不 `SignOut`/`TryToClose`/`MountedUnit`；失败即 `return host` — 证据 `call-signature-possible-shape.xl.md:70-80`
  - `[B1]` ○ 越界 → `Uncertain`、状态缺失 → `throw` — 证据 `call-signature-possible-shape.xl.md:31-33`、`:58-60`
  - `[C1]` ○ 每格全扫在被调方 — 证据 `call-signature-possible-shape.xl.md:34`；`property-signature-possible-shape.xl.md:723-727`
  - `[C3]` ○ 共用 state 槽 + 同对象入 share — 证据 `call-signature-possible-shape.xl.md:47`、`:58`
- 结论：偏离（7 条）。40 行、无 `catch`、无 `ExitOrPre`/`ComputePossibleShapes`；它的「不同」恰恰说明早建是逐候选手工挂的开关，而不是形状层机制。

### typescript/tokens/types/method-signature-shape.xl.md（1817B / 14 行；MethodSignatureShape）

- 结构：**shape 层（interface 成员 shape）**。4 个字段（`SignatureName`/`Parameters`/`ReturnType`/`MemberModifiers`）+ 三个钩子，全部转发给 `MemberShellCatalog`；实例既是「早建外壳」，也可能是 `TypeBuilder` 建出的真品。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre` 并用它结束自己：父括号的闭合格到来时 `MemberShellCatalog.HandOffOnBodyClose` 会 `Restore(entry)`→`Finalize(...)`→把外壳换掉、`host.MountedUnit = null`，然后本 shape 返回 `Reload` 让这一格重来 — 证据 `method-signature-shape.xl.md:37-46`（`if (MemberShellCatalog.HandOffOnBodyClose(this, value, context)) { return BranchStates.Reload; }`）；被调方 `member-shell-catalog.xl.md:967`、`:986`、`:988-990`
  - `[R2]` ● 覆盖 `ComputePossibleShapes`：外壳开着时整段交给 `MemberShellCatalog.HeadCompute`，而它会 `FinalizeShell` → `Finalize`/`Unwrap` 结束外壳并返回 `Built`，即形状自己驱动「建成了」 — 证据 `method-signature-shape.xl.md:48-55`；`member-shell-catalog.xl.md:677-716`（`:690`、`:711-715`）
  - `[X1]` ● 三个钩子都带 `MemberShellCatalog.IsOpen(this)` 门控：shape 的行为取决于一个全局 `Open` 登记表（不是形状自己的状态），表里有没有它决定走转发还是 `super` — 证据 `method-signature-shape.xl.md:40`、`:51`、`:60`；`member-shell-catalog.xl.md:138-142`
  - `[C1]` ○ 每次 `ComputePossibleShapes`/`ExitOrPre` 都调一次 `IsOpen`，而 `IsOpen` 是 `Open` 表的线性查表，代价随打开成员数增长 — 证据 `method-signature-shape.xl.md:51`；`member-shell-catalog.xl.md:130-135`
  - `[U4]` ○ R19/R20 的过滤不在 shape 里：本 shape 不覆写 `Close`，基类 `ShapeToken.Close` 只置 `Closed = true`；basic token 的丢弃与字段填充由外部的 `MemberShellCatalog.WrapAt`（`splice` 换关键字形状）和 `TypeBuilder.SpanTypeMember` 完成，`Close` 后 `Data` 是否等于 AST children 无法由 shape 自证 — 证据 `method-signature-shape.xl.md:16`（`extends ShapeToken`）、`core/syntax/shape-token.xl.md:58-63`
  - `[S3]` ○ 外壳实例不进 AST：`Finalize` 在 `Drop(shell)` + `splice` 之后把 legacy `MemberShellCatalog.BuildMember`（内部 `ClassDeclarationShape.BuildMembers`/`InterfaceDeclarationShape.BuildMembers`）建出的节点放进 `Data`，形状树里留下的是 legacy 产物 — 证据 `member-shell-catalog.xl.md:803`、`:814-817`、`:739-749`
- 结论：偏离（6 条）。R33/R34 在这 5 个成员 shape 上是成建制违反：`ExitOrPre`/`ComputePossibleShapes` 本来要留给基类，这里被改造成「外壳收口入口」。0 处 `catch`。

### typescript/tokens/types/construct-signature-shape.xl.md（1815B / 14 行；ConstructSignatureShape）

- 结构：**shape 层（interface 构造签名 shape）**，3 个字段（`TypeParameters`/`Parameters`/`ReturnType`）+ 同款三个转发钩子。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre` 并用它结束自己（父括号闭合格 → `HandOffOnBodyClose` → `Finalize` → 外壳被换掉 → 返回 `Reload`） — 证据 `construct-signature-shape.xl.md:36-45`；`member-shell-catalog.xl.md:953-991`
  - `[R2]` ● 覆盖 `ComputePossibleShapes` 并转给 `MemberShellCatalog.HeadCompute`（内部 `FinalizeShell` 结束外壳） — 证据 `construct-signature-shape.xl.md:47-54`；`member-shell-catalog.xl.md:677-716`
  - `[X1]` ● `IsOpen(this)` 全局登记表门控 — 证据 `construct-signature-shape.xl.md:39`、`:50`、`:59`
  - `[C1]` ○ 每格 `IsOpen` 线性查表 — 证据 `construct-signature-shape.xl.md:50`；`member-shell-catalog.xl.md:130-135`
  - `[U4]` ○ 无 `Close` 覆写，basic token 的丢弃在 `MemberShellCatalog.WrapAt`/`TypeBuilder` 侧 — 证据 `construct-signature-shape.xl.md:16`、`core/syntax/shape-token.xl.md:58-63`
  - `[S3]` ○ 外壳被 `Drop` 后由 legacy `BuildMember` 的产物替换，本 shape 实例不进 AST — 证据 `member-shell-catalog.xl.md:803`、`:814-817`
- 结论：偏离（6 条）。与 `MethodSignatureShape` 同构，差别只在字段集合（`TypeParameters` 对 `MemberModifiers`）。

### typescript/tokens/types/index-signature-shape.xl.md（1744B / 14 行；IndexSignatureShape）

- 结构：**shape 层（interface 索引签名 shape）**，3 个字段（`Parameter`/`Type`/`MemberModifiers`）+ 同款三个转发钩子。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre` 并用它结束自己 — 证据 `index-signature-shape.xl.md:34-43`；`member-shell-catalog.xl.md:953-991`
  - `[R2]` ● 覆盖 `ComputePossibleShapes` 转给 `HeadCompute`（内部 `FinalizeShell`） — 证据 `index-signature-shape.xl.md:45-52`
  - `[X1]` ● `IsOpen(this)` 全局登记表门控 — 证据 `index-signature-shape.xl.md:37`、`:48`、`:57`
  - `[C1]` ○ 每格 `IsOpen` 线性查表 — 证据 `index-signature-shape.xl.md:48`；`member-shell-catalog.xl.md:130-135`
  - `[U4]` ○ 无 `Close` 覆写，basic token 的丢弃在外部 — 证据 `index-signature-shape.xl.md:16`、`core/syntax/shape-token.xl.md:58-63`
  - `[S3]` ○ 外壳被替换成 legacy 产物 — 证据 `member-shell-catalog.xl.md:803`、`:814-817`
- 结论：偏离（6 条）。同一个 `IndexSignatureShape` 同时服务 class 族与 interface 族候选（`class-index-signature-possible-shape.xl.md:12` 与 `index-signature-possible-shape.xl.md:12` 都 import 它），两族只差 `MemberShellFamily` 参数。

### typescript/tokens/types/class-member-catch-all-possible-shape.xl.md（1738B / 15 行；ClassMemberCatchAllPossibleShape）

- 结构：**possible 层（兜底候选）**。它不建任何东西：`ComputeByIndex` 只在「成员已完整且所有种类都已被别的候选实现」时 `Reject`，否则恒 `Uncertain`；`IsBuildable` 恒 false；`BuildByIndex` 直接 `throw`。
- 偏离：
  - `[P2]` ● 这是个「为了让 `CatalogGuide` 不抛错而存在」的候选：`Candidates == 0` 且没有 `EndPossible` 时 `CatalogGuide` 会抛「没有候选形状可以构成」（`core/syntax/catalog-guide.xl.md:86-90`），本候选靠恒 `Uncertain` 把那个出口堵住 —— 零候选语义被一个假候选改写 — 证据 `class-member-catch-all-possible-shape.xl.md:28-37`
  - `[X1]` ● 兜底候选本身是 IMPORTANCE 没有的角色，且它的判据是 `ImplementedKinds()`（「8 个 kind 是否都有人实现」）而不是任何形状事实 — 证据 `class-member-catch-all-possible-shape.xl.md:32-36`（`for (const kind of state.Kinds) { if (!ClassMemberPossibleUtil.HasKind(ClassMemberPossibleUtil.ImplementedKinds(), kind)) { return ShapeStates.Uncertain; } }`）
  - `[P3]` ○ `BuildByIndex` 没有产物路径，只有一句 `throw`；`IsBuildable` 恒 false 保证它不该被选中 —— 这是「候选表里放了一个永不可建的项」 — 证据 `class-member-catch-all-possible-shape.xl.md:40-49`
  - `[B1]` ○ 越界 → `Uncertain` — 证据 `class-member-catch-all-possible-shape.xl.md:25-27`
  - `[C1]` ○ 每格同样进一次 `ClassMemberPossibleUtil.Scan`（含 `Analyze` 全扫），即兜底候选也付全扫代价 — 证据 `class-member-catch-all-possible-shape.xl.md:28`；`class-member-possible-util.xl.md:691`
- 结论：偏离（5 条）。0 处 `catch`、无 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/types/property-signature-shape.xl.md（1640B / 11 行；PropertySignatureShape）

- 结构：**shape 层（interface 属性签名 shape）**，4 个字段 + **只有两个钩子**（`ExitOrPre`、`ComputePossibleShapes`），没有 `OnBracketCreatedEvent`。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre` 并用它结束自己 — 证据 `property-signature-shape.xl.md:38-47`；`member-shell-catalog.xl.md:953-991`
  - `[R2]` ● 覆盖 `ComputePossibleShapes` 转给 `HeadCompute`（内部 `FinalizeShell`） — 证据 `property-signature-shape.xl.md:49-55`
  - `[X1]` ● `IsOpen(this)` 全局登记表门控 — 证据 `property-signature-shape.xl.md:41`、`:52`
  - `[X1]` ○ 与同族 shape 不一致：缺 `OnBracketCreatedEvent` 转发，外壳里新建的括号（计算名 `[k]`、类型位的对象类型 `{…}`）不会被 `MemberShellCatalog.OnBracketCreated` 处理；同族其它 shape 都有这一转发（如 `method-signature-shape.xl.md:57-62`） — 证据 `property-signature-shape.xl.md:16-56`（全文无该钩子）
  - `[C1]` ○ 每格 `IsOpen` 线性查表 — 证据 `property-signature-shape.xl.md:52`；`member-shell-catalog.xl.md:130-135`
  - `[U4]` ○ 无 `Close` 覆写，basic token 的丢弃在外部 — 证据 `property-signature-shape.xl.md:16`、`core/syntax/shape-token.xl.md:58-63`
  - `[S3]` ○ 外壳被替换成 legacy 产物 — 证据 `member-shell-catalog.xl.md:803`、`:814-817`
- 结论：偏离（7 条）。它是本批 5 个成员 shape 里唯一缺第三个钩子的，值得单独记：外壳与形状层的通知链在属性签名上断了一环。

### typescript/tokens/types/class-static-block-declaration-shape.xl.md（1631B / 14 行；ClassStaticBlockDeclarationShape）

- 结构：**shape 层（class 静态块 shape）**，无字段（静态块的体是 `BlockShape` 子节点）+ 三个转发钩子。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre` 并用它结束自己 — 证据 `class-static-block-declaration-shape.xl.md:28-37`；`member-shell-catalog.xl.md:953-991`
  - `[R2]` ● 覆盖 `ComputePossibleShapes` 转给 `HeadCompute`（内部 `FinalizeShell`） — 证据 `class-static-block-declaration-shape.xl.md:39-46`
  - `[X1]` ● `IsOpen(this)` 全局登记表门控 — 证据 `class-static-block-declaration-shape.xl.md:31`、`:42`、`:51`
  - `[C1]` ○ 每格 `IsOpen` 线性查表 — 证据 `class-static-block-declaration-shape.xl.md:42`；`member-shell-catalog.xl.md:130-135`
  - `[U4]` ○ 无 `Close` 覆写；静态块的体括号是独立 `BlockShape`，字段一个也没有，`Close` 后 `Data` 的内容完全由 `WrapAt`/`OpenMemberBody` 决定 — 证据 `class-static-block-declaration-shape.xl.md:16`、`member-shell-catalog.xl.md:562-607`
  - `[S3]` ○ 外壳被替换成 legacy 产物 — 证据 `member-shell-catalog.xl.md:803`、`:814-817`
- 结论：偏离（6 条）。它是本批唯一零字段的成员 shape：所有语义都在 `MemberShellCatalog` 的 entry（`Kind`/`Modifiers`/`BodyBlock`）里，shape 自己只是占位身份。

---

## 本批统计

| # | 文件 | 字节 | 代码行 | 偏离条数 | 编号分布 |
| --- | --- | --- | --- | --- | --- |
| 1 | parameter-list-possible-shape | 24478 | 617 | 10 | P1○ P2 P3 B4×2 B2 B1○ C1 C3 X1 |
| 2 | class-member-possible-util | 22623 | 604 | 7 | P2 X1×2 B4 C1 C3○ B1○ |
| 3 | member-boundary | 19201 | 533 | 5 | X1×2 B4 B4○ C1 |
| 4 | type-catalog-factory | 13846 | 379 | 6 | X1 P2○ B4 B2 X2 C1 |
| 5 | angle-judge | 12740 | 399 | 4 | X1 B4×2 C1 |
| 6 | construct-signature-possible | 4181 | 60 | 7 | P2 X1 X2 P3 B1○ C1○ C3○ |
| 7 | property-declaration-possible | 3717 | 48 | 8 | P2 X1 X2 B2○ P3 B1○ C1○ C3○ |
| 8 | method-declaration-possible | 3657 | 47 | 8 | 同上 |
| 9 | class-static-block-declaration-possible | 3589 | 47 | 8 | 同上 |
| 10 | class-get-accessor-possible | 3523 | 47 | 8 | 同上 |
| 11 | constructor-possible | 3519 | 47 | 8 | 同上 |
| 12 | class-index-signature-possible | 3514 | 47 | 8 | 同上 |
| 13 | class-set-accessor-possible | 3490 | 47 | 8 | 同上 |
| 14 | method-signature-possible | 3470 | 47 | 7 | P2 X1 X2 P3 B1○ C1○ C3○ |
| 15 | index-signature-possible | 3431 | 47 | 7 | 同上 |
| 16 | set-accessor-possible | 3391 | 47 | 7 | 同上 |
| 17 | get-accessor-possible | 3387 | 47 | 7 | 同上 |
| 18 | call-signature-possible | 3020 | 40 | 7 | 同上（无 Early 分支，记为 X1 的不一致） |
| 19 | method-signature-shape | 1817 | 14 | 6 | R1 R2 X1 C1○ U4○ S3○ |
| 20 | construct-signature-shape | 1815 | 14 | 6 | 同上 |
| 21 | index-signature-shape | 1744 | 14 | 6 | 同上 |
| 22 | class-member-catch-all-possible | 1738 | 15 | 5 | P2 X1 P3○ B1○ C1○ |
| 23 | property-signature-shape | 1640 | 11 | 7 | R1 R2 X1 X1○ C1○ U4○ S3○ |
| 24 | class-static-block-declaration-shape | 1631 | 14 | 6 | R1 R2 X1 C1○ U4○ S3○ |

#### 编号汇总（共 166 条）

| 编号 | 条数 | 说明 |
| --- | --- | --- |
| `P1` | 1 | 参数表候选的触发点两套并存 |
| `P2` | 17 | 候选判据被外部族码表接管（13 个成员候选 + `class-member-possible-util` + 参数表候选 + 兜底候选 + 类型工厂） |
| `P3` | 15 | build 后既不 `SignOut`/`TryToClose` 也不 `MountedUnit`；空 build 被记成 `Built` |
| `X1` | 27 | 族码表、早建壳、判界器、角括号判定器、类型工厂、全局 `Open` 表、兜底候选、缺钩子 |
| `X2` | 14 | legacy `TypeBuilder`/`ExpressionBuilder`/`BuildMembers` 整段重建 |
| `B4` | 8 | `NextChar`/`GetRawRange`/`document.GetValue` 读 tokenIndex 之后；族码表前瞻 |
| `B2` | 9 | 参数表默认值解析、类型工厂三入口、class 族 `BuildMemberFromCode` |
| `B1` | 16 | 越界返回 `Uncertain` 而非 `Nothing`；状态缺失直接 `throw` |
| `C1` | 24 | 每格 `Analyze`/`ClassifyHead` 全扫、`indexOf` 找壳、`FindClose` O(n²)、`IsOpen` 查表 |
| `C3` | 15 | 参数表 cache 全未用；13 个候选共用 state 槽而非 share（interface 族还 state/share 混用） |
| `U4` | 5 | shape 无 `Close` 过滤，basic token 的丢弃全在外部 |
| `S3` | 5 | 外壳实例被 `Drop`，形状树里留下 legacy 产物 |
| `R1` | 5 | 覆盖 `ExitOrPre` 并用它结束自己 |
| `R2` | 5 | 覆盖 `ComputePossibleShapes` 并驱动收口 |

#### 结论要点

1. **13 个成员候选是同一台机器的 13 个前端**：判据全在 `class-member-possible-util`（数组码表）与 `property-signature-possible-shape` 的 `MemberPossibleUtil`（位掩码码表）里，候选只做「我的 kind 在不在 `Kinds` 里」。`P2`/`X1` 因此是成片出现的，不是 13 次独立失误。
2. **早建壳（`state.Early` + `MemberShellCatalog.Create`）是本批最重的一处设计外挂**：它在「成员头刚判出」时就 Accept，把「Accept = 形状已可建」改成「Accept = 头已定」，并引入全局 `Open` 登记表、`MountedUnit` 搬运、外壳被 `Drop` 后由 legacy 产物替换。5 个 shape 因此反过来覆盖 `ExitOrPre`/`ComputePossibleShapes`（`R1`/`R2`），这正是 IMPORTANCE:84-85 明令禁止的两件事。
3. **5 个成员 shape 的 `Close` 什么都不做**：R19/R20 要求的「build 那刻提字段、basic token 用完即丢、`Close` 后 `Data` 只剩子形状」在这些文件里没有落点，靠 `MemberShellCatalog.WrapAt`/`Restore`/`Finalize` 与 `TypeBuilder` 在外维持；形状层无法自证同构（`S3`/`U4`）。
4. **三个判定器都不在 `CatalogGuide` 里**（`angle-judge`、`member-boundary`、`type-catalog-factory`）：它们用原文前瞻（`GetRawRange` 4KB、`document.GetValue`、`NextChar`）回答「形状到没到边界 / 类型能不能收口」，`B4` 在这三个文件里是结构性的，而不是某一行写错。
