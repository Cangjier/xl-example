# 53 表达式形态：运算符与前后缀候选（审计）

审计对象：`typescript/tokens/expressions/forms/` 下 `operator/`（4）、`prefix/`（3）、`postfix/`（9）共 16 个文件。
判据见 [01-rules.md](01-rules.md)；字节/行数取自 `_facts/typescript-tokens-expressions-forms-{operator,prefix,postfix}.md`（代码行），行号以 `read` 返回值为准。

本批的关键上下文（不在本批但决定了偏离的性质）：

- `ShapeStates` 只有 `Reject` / `Accept` / `Uncertain`（`core/syntax/shape-states.xl.md:3-7`），**没有 `Nothing`**；而 `CloseStates` 里却有 `Nothing`（`core/syntax/shape-token.xl.md:58-63`）。所以 R25 在本批的**候选返回类型上不可表达**，凡「越界返回 `Uncertain`/`Reject`」一律记 `B1` ○。
- 候选收敛确实走 `CatalogGuide` 的五条（`core/syntax/catalog-guide.xl.md:66-107`），但 **`BuildByIndex` 之后 CatalogGuide 既不 `SignOut` 也不 `TryToClose()`、也不 `Quit()`**（`:79`、`:102` 只写 `LastBuildTokenIndex` 与 `Reset`）。「建完谁来关闭」因此被整体下放给每个候选，`P3` 在本批成片出现。
- 15 个候选文件全部 `import { PossibleSource }`（如 `conditional-possible-shape.xl.md:7`）、全部在 `ComputeByIndex` 签名里收 `source:PossibleSource`，**0 处读它**（`member-chain-judge.xl.md` 例外：它不是 possible，没有 `ComputeByIndex`）：`forms/` 下唯一读 `source` 的是 `shared/container-shape-catalog.xl.md:371`（`if (source !== PossibleSource.Close)`）。因此本批没有 R13 的正面证据（`P1` 只在 `call`/`new` 的括号关闭格上另记）。
- legacy 后端：`ExpressionBuilder`（`expression-builder.xl.md:135`，2706 行）的 `Load`+`ParseExpression` 被 5 个文件当建树后端；`ParseExpression` 直接产出 AST 节点（`:284-291`）。
- `ParseFromShape` 全仓只有 1 处且是抛错桩（`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`）。本批的 `S4` 因此按「AST 由 shape 产出还是由 builder 直接建」判，而不是按「有没有 `ParseFromShape`」判。
- 形状类就是 AST 节点类（`BinaryExpressionShape extends ShapeToken`，`binary-expression-shape.xl.md:13`；`NewExpressionShape`/`CallExpressionShape` 同理），所以 `S3` 在本批判「形状树里是否混入 basic token / trivia、parent 链是否与层级一致」。

---

### typescript/tokens/expressions/forms/operator/conditional-possible-shape.xl.md（19412B / 677 行，代码行 533；ConditionalPossibleShape、ConditionalMemberPossibleShape）

- 结构：**possible 层，两段式**。`ConditionalPossibleShape` 在 `?` 那一格把「左操作数 + `?`」原位折成 `ConditionalExpressionShape` 并**挂载**（R32），随后 `ConditionalMemberPossibleShape` 以成员候选身份接管 `中段` / `:` / `右段`，在右段那一格 `TryToClose` + `Quit` 收口。是本批唯一「挂载 → 后续候选关闭」成对成立的组装式候选。
- 偏离：
  - `[B4]` ● 建树判据建立在 `tokenIndex` **之后**的原文与整个 `units` 上：`Family(units)` 每次从 `=` 往后找头单元再看紧跟的两个字符；`UnbuildableBranchHead` 从 `?` 的 `EndIndex` 起把文档扫到文件尾（自己跳过空白/字符串/括号配平）；`IsBuildable` 又靠它否决建树 — 证据 `conditional-possible-shape.xl.md:141`（`if (!ConditionalPossibleShape.Family(units))`）、`:106-117`（`ItemUtil.NextCode(units, equalAt + 1)` 之后 `RawAfter(head, 2)` 判 `?`）、`:272-357`（`while (at < count)`）、`:322-331`（在 `depth === 0` 处数嵌套 `?`）、`:181`（`return !ConditionalPossibleShape.HasLegacyBranch(units);`）
  - `[C1]` ● 同一格内把全段重扫两遍以上且不落 cache：`ComputeByIndex` 先 `Family(units)`（`EqualIndex` + `NextCode` + `RawAfter`），再在 `ContinuationClaim` 里 `Family(units)` 第二遍；`QuestionIndex` 每次从 0 扫到 `units.length`，`HasArrowBranch` 再从 `questionAt + 1` 扫一遍 — 证据 `conditional-possible-shape.xl.md:141`、`:160`、`:184-199`、`:208-213`
  - `[C3]` ● `cache` 只被当作 `ItemStartCached` 的记忆用，0 处 `GetState`/`SetState`/`GetShare`/`SetShare` — 证据 `conditional-possible-shape.xl.md:137`（`const start = ItemUtil.ItemStartCached(units, cache);`）、`:124` 与 `:551`（两处签名收 `cache:PossibleShapeCache`）
  - `[P2]` ○ 「该不该建」被换成文本判定：`IsBuildable` 一旦发现 `?` 之后有 `=>` 或分支头不可建就返回 false，让候选保持 `Waiting` 直到收口格由 legacy 整条建；`Accept` 的条件（`:144-147`）与 `IsBuildable` 的条件（`:181`）是两套互不相关的判据 — 证据 `conditional-possible-shape.xl.md:181`、`:220-227`（`HasLegacyBranch` = `HasArrowBranch` ∨ `UnbuildableBranchHead`）
  - `[X2]` ● 自述的 legacy 旁路：注释写明「箭头分支的三目走『不建树 → 收口格 legacy 整条建』」，`ContinuationClaim` 因此要替整条声明认领 `=>` 与 `:`，否则声明终结候选按 C10 抛错 — 证据 `conditional-possible-shape.xl.md:163-171`（注释 + `if (text === "=>" || text === ":") { return true; }`）
  - `[X1]` ● 两处设计外机制：①`ContinuationClaim`（IMPORTANCE 未定义的「认领格」通道，`possible-shape.xl.md:59-64` 的默认实现只是 `return false`）；②本候选手工 `new QuestionTokenShape` / `new ColonTokenShape` 并自己 `SignIn`/`SignOut`/`Replace`，标点形状不是由标点层产出的 — 证据 `conditional-possible-shape.xl.md:151-173`、`:512-520`、`:663-677`
  - `[B1]` ○ 越界一律返回 `Uncertain`（不能返回 `Nothing`）：`ComputeByIndex` 两处、成员候选一处；成员 `BuildByIndex` 越界直接 `throw` — 证据 `conditional-possible-shape.xl.md:127-129`、`:554-556`、`:593-595`（`return false`）、`:607-609`（`throw new Error("…成员")`）
- 结论：偏离（7 条）。做对的一半：`BuildByIndex` 先把左操作数补关（`:509-511` `if (!leftShape.Closed) { leftShape.TryToClose(context); }`），符号单元被 `Replace` 成形状后立刻 `data.splice` 摘掉（`:520`、`:528-530`），挂载点的 `Data` 只剩子形状 + trivia（`:531-533` `conditional.Parent = host; host.MountedUnit = conditional; conditional.CatalogGuide = …`）——R19/R32 的动作确实发生了；成员段收口时 `TryToClose` + `Quit`（`:645-648`）是本批唯一完整的「R31 收尾」。成员 `BuildByIndex` 还主动把所有 trivia 从形状里摘掉并说明理由（`:610-618`「留在形状里会变成增量树多出来的 basic 行」），这是 R20 的正向证据。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/operator/assignment-possible-shape.xl.md（12162B / 357 行，代码行 244；AssignmentPossibleShape）

- 结构：**possible 层，组装式**。判据是「赋值 `=` 后紧邻的右值格 + 初始化器到此为止」，建树用静态工厂 `BinaryExpressionShape.FromLeftAndOperator` 拼三层，再挂载 + `SealRightOperand` 立即封口。
- 偏离：
  - `[C1]` ● 一格里把 `units` 从 0 扫到 `tokenIndex` 三遍：`LastEqualBefore` → `EqualIndexes`，`IsAssignmentEqualAt` 内部又调一次 `EqualIndexes(units, equalAt)`，`IsBuildable` 里第三次；结论一概不落 cache — 证据 `assignment-possible-shape.xl.md:132-139`（`for (let at = 0; at < tokenIndex && at < units.length; at++)`）、`:152`（`const earlier = AssignmentPossibleShape.EqualIndexes(units, equalAt);`）、`:220`（`LastEqualBefore(units, tokenIndex)`）、`:275`
  - `[B4]` ● 两处读 `tokenIndex` 之后：`RawAfter(unit, 2)` 从当前单元 `EndIndex` 后读两个非空白字符判「后面还有没有赋值 `=`」；`Accept` 要求 `InitializerTailJudge.IsInitializerEnd(units, tokenIndex)`，而它从当前单元 `EndIndex` 一路读文档到 EOF — 证据 `assignment-possible-shape.xl.md:115-126`（`RawAfter` → `pair[0] === "="`）、`:231`（`LooksLikeAssignmentAfter(unit) ? Uncertain : Reject`）、`:240-242`（`if (!InitializerTailJudge.IsInitializerEnd(units, tokenIndex))`）、`shared/initializer-tail-judge.xl.md:32-67`（`while (at < count)`）
  - `[C3]` ● `cache` 只在 `ItemStartCached` 里用过一次，state/share 全空 — 证据 `assignment-possible-shape.xl.md:137`、`:200`（签名）
  - `[P2]` ○ 两个入口判据不一致：`ComputeByIndex` 只在「右值格 ∧ 初始化器已到尾」`Accept`（`:234-243`），`IsBuildable` 只要求「前驱是赋值 `=`」（`:271-275`，不看尾部）。R30 的「唯一候选时问 `IsBuildable`」因此可能在一格判「可建」，而该格 `ComputeByIndex` 认为还不到 — 证据 `assignment-possible-shape.xl.md:258-276` 对照 `:233-243`
  - `[P3]` ○ 挂载被当成「已收口」的开关位：先 `host.MountedUnit = binary`，紧接着 `SealRightOperand` 里 `TryToClose` 后立刻 `Quit` 把 `MountedUnit` 清掉，挂载只存活两行；`binary` 自身从未 `SignOut`（靠 `ShapeToken.TryToClose` 从 `Last()` 补 `End`） — 证据 `assignment-possible-shape.xl.md:353-355`（`binary.Parent = host; host.MountedUnit = binary; binary.SealRightOperand(context);`）、`binary-expression-shape.xl.md:70-77`（`SealRightOperand` = `TryToClose` + `Quit`）、`shape-token.xl.md:28-37`
  - `[X1]` ○ 设计外开关：`BuildByIndex` 多收一个 `bodyMode?:bool`，开了才认「`=>` 之后的 `=` 也算赋值」（`IsBodyAssignmentEqualAt` 专门认「前驱是 `EqualsGreaterThanTokenShape`」） — 证据 `assignment-possible-shape.xl.md:278`（`bodyMode?:bool`）、`:300-303`、`:167-188`
  - `[B1]` ○ 越界返回 `Uncertain`，不能返回 `Nothing`；`BuildByIndex` 里 `data[rightAt]`/`data[equalAt]` 的守卫都以 `throw` 收场 — 证据 `assignment-possible-shape.xl.md:203-205`、`:286-291`、`:296-299`
- 结论：偏离（7 条）。做对的一半：左值/右值的 basic token 当场被 `IdentifierShape.FromBasicToken` / `NumericLiteralPossibleShape.BuildLiteral` 换掉（`:316-319`、`:338-341`、`:332-333`），运算符 `=` 由 `OperatorShapeMap.Create` 换成正牌形状并取了 `Pos`（`:324-329`），三格 `splice` 后形状树就是「左值 / `=` / 右值」（`:346-352`）——R19/R35 的动作发生了；`IsRightAssociative` 先断言再建（`:281-283`）是本批少见的自检。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/operator/binary-operator-possible-shape.xl.md（11011B / 256 行，代码行 177；BinaryOperatorPossibleShape）

- 结构：**possible 层，单格组装**。在运算符格把「左操作数 + 运算符」原位折成 `BinaryExpressionShape`，挂载并把宿主目录换成 `RightOperandPossibleShape.Catalog()`，右操作数由下一次 compute 交给那个目录建。
- 偏离：
  - `[B4]` ● `f<string>()` 的判据从 `<` 的 `EndIndex` 往后读原文找配对 `>` 与 `(`：`ComputeByIndex` 与 `IsBuildable` 各判一次（两处必须人工保持一致） — 证据 `binary-operator-possible-shape.xl.md:69-71`（`if (text === "<" && PrimaryAtomGuard.IsTypeArgumentCallAfter(unit)) { return ShapeStates.Reject; }`）、`:110-113`
  - `[C3]` ● `cache` 形参收了但**一次都没用**（连 `ItemStartCached` 都没有），0 处 `GetState`/`SetState`/`GetShare`/`SetShare` — 证据 `binary-operator-possible-shape.xl.md:41`（签名）、`:88-96`（判据全是 `ItemUtil.PreviousCode` 与文本比较）
  - `[B1]` ○ 越界返回 `Uncertain`；`BuildByIndex` 开头 `host.Data[tokenIndex]` 无任何界检查，越界时 `TextOf(undefined)` 得到 `""` 再抛「二元运算符」 — 证据 `binary-operator-possible-shape.xl.md:44-46`、`:131-135`
  - `[X1]` ○ 运算符写域靠**硬编码文本切分**：本候选把 `*` / `+` 直接判死让给 `ReassociationPossibleShape`，而后者对 `*`/`+` 无条件 `Accept`（见下一节）；两只候选的写域边界由这两个 `if` 维系，IMPORTANCE 里没有这种「按运算符文本分区」的机制 — 证据 `binary-operator-possible-shape.xl.md:72-74`（`if (text === "*" || text === "+") { return ShapeStates.Reject; }`）、`reassociation-possible-shape.xl.md:54-56`
  - `[U4]` ○ 运算符与左操作数之间的 trivia 被**搬进** `binary.Data`（`FromLeftAndOperator(left, op, prec, template, trivia)` + 从宿主 `splice` 掉），而 trivia 不是 AST 子节点，`Close` 之后 `Data` 因此不等于 AST children — 证据 `binary-operator-possible-shape.xl.md:148-152`（`const trivia = ItemUtil.TriviaBetween(host.Data, leftIndex, tokenIndex); … host.Data.splice(leftIndex + 1, trivia.length);`）、`binary-expression-shape.xl.md:44-48`（trivia 逐个 `Add`）
- 结论：偏离（5 条）。做对的一半：判据只看当前格与左邻（`HasLeftOperand`/`NeedsReassociation` 都只用 `PreviousCode`），没有 `C1`；运算符形状由 `OperatorShapeMap.Create` 产出并取 `Pos`（`:142-147`），`token.Replace(operatorShape)` 把 basic token 换掉（R19/R35）；挂载后立刻换目录（`:153-155`）是 R32 的正向写法；`text === "."`/`"?."` 的判死有完整理由（`:75-87` 注释）。注意该注释里「A3 的 postfix 候选尚未并进本目录」已过期：`expression-shape-catalog.xl.md:106-111` 已把 6 个成员链候选装进同一目录。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/operator/reassociation-possible-shape.xl.md（8348B / 219 行，代码行 158；ReassociationPossibleShape）

- 结构：**possible 层 + 设计外的「再结合」重建器**。左邻是 `BinaryExpressionShape` 且新运算符优先级更高时，把已闭合的二元形状手工拆成三格，再用 `ShapeOperatorStack` 重搭两层。
- 偏离：
  - `[S3]` ● 重建后 parent 链与层级不一致：`outer` 被 `splice` 进 `host.Data`（`:178`），而 `inner` 明明在 `outer.Data` 里（`AttachRight` → `MoveInto` → `outer.Add(inner)`，`shape-operator-stack.xl.md:99`、`:329`），却把 `inner.Parent` 直接改成 `host`，并让 `host.MountedUnit = inner`（挂的不是 host 的子单元） — 证据 `reassociation-possible-shape.xl.md:178-189`（`host.Data.splice(hostIndex, 1, outer); … inner.Parent = host; host.MountedUnit = inner;`）
  - `[P3]` ○ 新 `outer` 只被 `FromLeftAndOperator` 签入（`binary-expression-shape.xl.md:31-33`），全流程没有 `SignOut`/`TryToClose`，`End` 留待外人补；`host.MountedUnit` 指向 `inner` 而宿主数组里是 `outer`，R31/R32 两种去向都不成立 — 证据 `reassociation-possible-shape.xl.md:169-189`、`:95-104`（非归约分支同样只 `mount` 不签出）
  - `[P2]` ○ `*` / `+` 无条件 `Accept`（不看左邻是不是二元），把「归约」判据绕过；`BuildByIndex` 里对「左邻不是 `BinaryExpressionShape`」的情况走一条与 `BinaryOperatorPossibleShape.BuildByIndex` 几乎逐行重复的「新建二元」分支 — 证据 `reassociation-possible-shape.xl.md:54-56`（`if (text === "*" || text === "+") { return ShapeStates.Accept; }`）、`:95-104` 对照 `binary-operator-possible-shape.xl.md:142-156`
  - `[X1]` ○ 手工拆一个**已闭合**的形状：`leftBinary.Data.length = 0` 后逐个 `Parent = null`，再 `ShapeOperatorStack` 重搭；IMPORTANCE 里「归约」应由仍活着的候选在 compute 中完成，而不是对成品做外科手术 — 证据 `reassociation-possible-shape.xl.md:148-157`、`:162-170`
  - `[C1]` ● `Reassociate` 用 `for (let index = 0; index < data.length; index++)` 从头找三格代码（并在第四格抛错），`BuildByIndex` 又用 `host.Data.indexOf(left)` 重定位左操作数；两处都不落 cache — 证据 `reassociation-possible-shape.xl.md:121-144`、`:174-177`
  - `[C3]` ● `cache` 完全未使用（连 item-start 记忆都没用） — 证据 `reassociation-possible-shape.xl.md:33`（签名）、`:43-64`（判据全是 `ItemUtil.PreviousCode` 与 `OperatorTable`）
  - `[B1]` ○ 越界返回 `Uncertain`；`BuildByIndex` 的 `host.Data[tokenIndex]` 无界检查 — 证据 `reassociation-possible-shape.xl.md:36-38`、`:70-74`
- 结论：偏离（7 条）。做对的一半：判据只回看左邻（`PreviousCode`），0 处原文前瞻，因此**没有 `B4`**；运算符 basic token 被 `BuildOperator` 换成正牌形状并取 `Pos`（`:193-207`）；拆解时给三个子单元和 trivia 都清了 `Parent`（`:149-157`）——比大多数候选更守形状约定。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/prefix/prefix-unary-possible-shape.xl.md（9635B / 294 行，代码行 199；PrefixUnaryPossibleShape）

- 结构：**possible 层，整段重排式**。判据是「`=` 之后的一串前缀运算符 + 一个操作数」，建树时把宿主 `Data` 整体重建成 `kept` 数组再灌回去。
- 偏离：
  - `[P3]` ● 建完既不挂载也不关闭：`BuildByIndex` 没有 `host.MountedUnit = …`，也没有对最外层节点 `TryToClose()`；`node.SignIn(start)`/`node.SignOut(operandEnd)` 只签了范围，`Closed` 仍为 false — 证据 `prefix-unary-possible-shape.xl.md:246-265`（`node.SignIn(start); node.SignOut(operandEnd); node.Add(inner); inner = node;`）、`:287`（`return inner;`）
  - `[C2]` ● 全量重写宿主：先把 `host.Data.length = 0`，再逐项把 `kept` 灌回并重挂 `Parent`，等于一次性重建宿主的全部单元而不是增量追加 — 证据 `prefix-unary-possible-shape.xl.md:266-286`（`const removed = new Set<number>(); … host.Data.length = 0; for (const item of kept) { item.Parent = host; host.Data.push(item); }`）
  - `[C1]` ● 同一格内 `OperatorRunStart` 被跑三遍：`IsPrefixPosition`（`:128`）、`IsOperandPosition`（`:144`）各一遍，`BuildByIndex` 里第三遍（`:186`）；每遍都从 `before` 往回 `while (at >= 0)` — 证据 `prefix-unary-possible-shape.xl.md:83-97`、`:164-167`、`:186-189`
  - `[C3]` ● `cache` 只用于 `ItemStartCached`，state/share 全空 — 证据 `prefix-unary-possible-shape.xl.md:157`、`:147`（签名）
  - `[X1]` ● 把「前缀串前必须是 `=`」硬编码成唯一入口：`OperatorRunStart` 最后要求 `units[head]` 是 `Symbol("=")`，否则返回 `-1`。于是 `f(-x)`、`a * -b`、语句级 `-x` 都不在本候选的写域里（前驱不是 `=` 就判 `-1`），前缀一元只在声明初始化器首格成立 — 证据 `prefix-unary-possible-shape.xl.md:101-112`（`const head = ItemUtil.PreviousCode(units, at); … if (!(unit as Symbol).Is("=")) { return -1; }`）
  - `[B1]` ○ 越界返回 `Uncertain`（`IsPrefixPosition`/`IsOperandPosition` 则返回 `false`）；`BuildByIndex` 里 `host.Data[operandIndex]`、`host.Data[lastOperator]` 都有前置守卫，但仍以 `throw` 收场 — 证据 `prefix-unary-possible-shape.xl.md:150-152`、`:118-120`、`:182-190`、`:205-209`
- 结论：偏离（6 条）。做对的一半：**0 处原文前瞻**（判据只回看单元序列），因此没有 `B4`；操作数 basic token 当场换成 `NumericLiteralShape`/`IdentifierShape` 并取 `Pos`（`:214-229`），关键字操作数明确判死（`:221-224`）；括号操作数交 `ObjectLiteralOperandPossibleShape.BuildInto` 原位顶替并注明「长度不变，下标集合继续有效」（`:233-242`）。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/prefix/update-expression-possible-shape.xl.md（7574B / 266 行，代码行 173；UpdateExpressionPossibleShape）

- 结构：**possible 层，外壳 + legacy 后端**。`Kind` 判这一格是 `++y` 还是 `y++`（族码 `pre`/`post`），`CanBuild` 先试跑一遍 `ExpressionBuilder` 再决定 `IsBuildable`，`BuildByIndex` 把 `=` 之后整段交给 builder 重建。
- 偏离：
  - `[X2]` ● legacy 整段重建：把 `=` 之后所有非 trivia 单元塞进 `raw`，`builder.Load(raw, basePos)` + `builder.ParseExpression()` 一次性产出整棵初始化器表达式，形状树不参与 — 证据 `update-expression-possible-shape.xl.md:228-243`
  - `[S4]` ● AST 由 builder 直接建：`const expression = builder.ParseExpression()` 之后只做 `host.Data.splice(start, removed, expression)` 与 `expression.Parent = host`，没有任何 shape 的关闭产物参与 — 证据 `update-expression-possible-shape.xl.md:240-249`
  - `[B2]` ○ `CanBuild` 里 `try { builder.ParseExpression(); } catch (error) { return false; }`：解析异常被吃成「这一格不可建」，诊断信息消失（R23 的原文只说 compute/build，故标 ○；但 `IsBuildable` 直接调它，等于在候选判定路径里吞诊断） — 证据 `update-expression-possible-shape.xl.md:173-178`、`:213`
  - `[C2]` ● 与 `X2` 同源的全量做法：每次 `CanBuild` 都重跑一遍完整解析（`:171-178`），每次 `BuildByIndex` 再跑一遍（`:238-243`），没有复用任何已有形状 — 证据 `update-expression-possible-shape.xl.md:156-178`、`:228-243`
  - `[C1]` ● `Kind(units)` 每格重算，`CanBuild` 里又重算一次 `Kind` + `EqualIndex` + `LastSignificant` + 一遍全解析；`IsBuildable` 与 `BuildByIndex` 各再算一遍 — 证据 `update-expression-possible-shape.xl.md:140-155`、`:198`、`:213`
  - `[B4]` ● `PostfixPreview` 从链头 `EndIndex` 往后读原文两个字符判 `y++`；`LastSignificant`/`Kind` 扫整个 `units` — 证据 `update-expression-possible-shape.xl.md:67-96`（`while (at < count)`）、`:123-134`、`:148`
  - `[C3]` ● `cache` 只用于 `ItemStartCached` — 证据 `update-expression-possible-shape.xl.md:191`
  - `[P3]` ○ 建完只 `splice` + 显式清空挂载（`host.MountedUnit = null;`），既不 `SignOut` 也不 `TryToClose`，范围完全依赖 builder 产物自带的值 — 证据 `update-expression-possible-shape.xl.md:244-249`
  - `[X1]` ○ `Kind` 把「这一格属于哪种更新表达式」外包给 `MemberChainJudge`，本文件只留 `KindPrefix`/`KindPostfix` 两个字符串码与 `PostfixPreview` 原文预览；另有 `ContinuationClaim` 认领 `++`/`--` 格 — 证据 `update-expression-possible-shape.xl.md:42-44`、`:101-134`、`:252-265`
  - `[B1]` ○ 越界返回 `Uncertain`；`BuildByIndex` 用 `MemberChainJudge.EqualIndex(host.Data)` 全段找 `=`，找不到就 `throw` — 证据 `update-expression-possible-shape.xl.md:184-186`、`:219-222`
- 结论：偏离（10 条）。它是一个**用 legacy 解析器兜住整个初始化器**的候选：判据、建树都不在增量路径上，`++`/`--` 的语义只体现在 `Kind` 的返回值里。0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/prefix/delete-possible-shape.xl.md（6270B / 211 行，代码行 137；DeletePossibleShape）

- 结构：**possible 层，外壳 + legacy 后端**，与 `update-expression` 同一模具：`Kind` 只认链头是 `delete`，`CanBuild` 试跑解析，`BuildByIndex` 整段交给 `ExpressionBuilder`。
- 偏离：
  - `[X2]` ● legacy 整段重建：`=` 之后所有非 trivia 单元 → `builder.Load` + `builder.ParseExpression()` — 证据 `delete-possible-shape.xl.md:166-184`
  - `[S4]` ● AST 由 builder 直接建，shape 层只做 `splice` 与 `expression.Parent = host` — 证据 `delete-possible-shape.xl.md:178-187`
  - `[B2]` ○ `CanBuild` 的 `try { builder.ParseExpression(); } catch (error) { return false; }` 吞掉解析诊断，而 `IsBuildable` 就是它 — 证据 `delete-possible-shape.xl.md:111-116`、`:151`
  - `[C2]` ● 每格 `CanBuild` 全量解析一遍，建树时再全量解析一遍 — 证据 `delete-possible-shape.xl.md:94-116`、`:166-181`
  - `[C1]` ● `Kind` 每次从头 `EqualIndex` + `FirstSignificant`，`CanBuild` 里再来一遍并追加 `LastSignificant`；`BuildByIndex` 第三次 — 证据 `delete-possible-shape.xl.md:54-65`、`:71-89`、`:157`
  - `[B4]` ● `Kind`/`CanBuild` 扫整个 `units` 并读 `LastSignificant` 之后的原文（`InitializerTailJudge.IsInitializerEnd`） — 证据 `delete-possible-shape.xl.md:86-93`、`:136`
  - `[C3]` ● `cache` 只用于 `ItemStartCached` — 证据 `delete-possible-shape.xl.md:129`
  - `[P3]` ○ `host.MountedUnit = null;` 之后直接返回 builder 产物，无 `SignOut`/`TryToClose` — 证据 `delete-possible-shape.xl.md:184-187`
  - `[X1]` ○ `ContinuationClaim` 把 `.`/`?.`/`!`/`[` 四类后缀格全部认领（依赖 `Kind` 的全段判断），是 IMPORTANCE 未定义的认领通道 — 证据 `delete-possible-shape.xl.md:190-211`
  - `[B1]` ○ 越界返回 `Uncertain`；`BuildByIndex` 的 `EqualIndex` 找不到 `=` 即 `throw` — 证据 `delete-possible-shape.xl.md:122-124`、`:157-160`
- 结论：偏离（10 条）。`delete o.p` 的整棵 `DeleteExpressionShape → PropertyAccessExpressionShape` 都由 legacy builder 产出（`:22-30` 的注释即它期望的树），本候选只贡献「这一格该不该建」的一个 `Uncertain`。0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/postfix/new-possible-shape.xl.md（11150B / 344 行，代码行 258；NewPossibleShape）

- 结构：**possible 层，工厂式**。`new` 关键字格 / 被构造者格 / 被构造者括号格三处 `Accept`，建树时自己 `SignIn`+`SignOut`+`TryToClose` 造好 `NewExpressionShape`，再把整段 `splice` 成一个单元。
- 偏离：
  - `[P1]` ○ 括号格要等**关闭**才建：`IsBuildable` 要求 `bracket.Closed || bracket.SourceRange.EndIndex >= 0`，`Accept` 在 `Bracket` 格上也只是「括号身份已定」，真正的建树时机是 close 之后那一格；IMPORTANCE 里 bracket create 就该把 possible 装进括号内（R13），本文件的候选不参与那一层 — 证据 `new-possible-shape.xl.md:143-148`、`:184-191`
  - `[X1]` ● 全局登记表：建出的 `NewExpressionShape` 被 `ExpressionAtomRegistry.RegisterNode(shape)` 登记，收口格靠 `HasNode` 认它；这是一条绕过形状树的**旁路身份通道**（登记表每文件 `Reset`，`source-file-shape.xl.md:85`） — 证据 `new-possible-shape.xl.md:271-273`
  - `[X2]` ○ 实参括号整段交 legacy：`builder.ParseBracketArguments(bracket)`（`:253-257`）；`new (E)` 的括号组更彻底——把 `bracket.Data` 滤成 `raw` 后 `builder.Load` + `ParseExpression` 重建 `ParenthesizedExpressionShape`（`:309-343`） — 证据 `new-possible-shape.xl.md:255-257`、`:323-327`
  - `[C2]` ○ 括号内容不是增量收下的，而是关闭后整段重解析（与 `X2` 同一动作）；被构造者 `new (E)` 分支亦然 — 证据 `new-possible-shape.xl.md:253-257`、`:309-325`
  - `[C1]` ● `IsNewItem` 每次都从 0 找 `=`，且在 `ComputeByIndex`、`IsBuildable`、`IsCalleeCell`、`IsCalleeGroup`、`ContinuationClaim` 里各调一次（同一格最多 5 次 `EqualIndex` + `NextCode`），无 cache — 证据 `new-possible-shape.xl.md:34-47`、`:52`、`:100`、`:127`、`:147`、`:171`
  - `[B4]` ● `IsBuildable` 用 `CompositeInitializerFormsJudge.NextSignificantChar(unit)` 读当前单元之后的下一个非空白字符，判「后面只剩 `;` 或没有」；`EqualIndex` 又扫到 `units.length` — 证据 `new-possible-shape.xl.md:197-200`、`:206-207`
  - `[C3]` ● `cache` 完全未使用 — 证据 `new-possible-shape.xl.md:130`（签名）、`:133-155`（判据无 cache）
  - `[B1]` ○ 越界返回 `Uncertain`；`IsCalleeCell`（`:85`）与 `IsCalleeGroup`（`:109`，有守卫）不一致，前者直接 `units[tokenIndex]` — 证据 `new-possible-shape.xl.md:82-101`、`:133-135`
- 结论：偏离（8 条）。**R31 的正向样本**：`shape.Pos`、`SignIn(start)`、`SignOut(endIndex)`、`TryToClose(context)` 齐全，并显式 `host.MountedUnit = null`（`:258-277`），与 `StringLiteralShape.FromBasicToken` 同一去向；被构造者的 basic token 也当场换成 `IdentifierShape`（`:295-298`）。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/postfix/member-chain-judge.xl.md（9023B / 348 行，代码行 270；MemberChainJudge）

- 结构：**设计外的「成员链判界器」**（既不是 shape 也不是 possible/end）。`Kind` 用「链头 + 第一个后缀」把一条初始化器判成 `member`/`optional`/`nonnull`/`element`/`meta`/`super` 六族，`Claims` 判格、`CanBuild` 试跑整段解析、`Build` 用 legacy builder 整条建。
- 偏离：
  - `[X1]` ● 「链式调用该不该继续」在本文件是**第二套判据**：六个候选（member-access / optional-chain / element-access / non-null / super-primary / meta-property）的 `ComputeByIndex` 只做 `Kind(units) === "<族>"` 的翻译，`BuildByIndex` 只 `return MemberChainJudge.Build(host, context)`；族码是 6 个字符串字面量 — 证据 `member-chain-judge.xl.md:188-249`（`Kind` 的六个 `return`）、`:251-272`、`:317-348`；调用方 `member-access-possible-shape.xl.md:40-45`、`:76-80`
  - `[B4]` ● 判据整体建立在 `tokenIndex` **之后**：`Kind` 扫整个 `units`（`EqualIndex` → `FirstSignificant` → `SuffixIndex`），`NextWord`/`ChainFollows`/`PostfixEnd` 都从 `unit.SourceRange.EndIndex` 起读未 token 化原文（跳过空白/行终止符） — 证据 `member-chain-judge.xl.md:23-31`、`:38-43`、`:49-54`、`:82-116`（`while (at < count)`）、`:118-147`、`:149-186`
  - `[X2]` ● legacy 整条重建：`CanBuild` 与 `Build` 都把 `=` 之后所有非 trivia 单元 `builder.Load` 后 `ParseExpression()`，形状树不参与 — 证据 `member-chain-judge.xl.md:292-314`、`:329-341`
  - `[S4]` ● AST 由 builder 直接建：`const expression = builder.ParseExpression()`，随后 `host.Data.splice(start, removed, expression)` + `expression.Parent = host`，没有任何 shape 的 `Close` 产物 — 证据 `member-chain-judge.xl.md:338-347`
  - `[B2]` ● `CanBuild` 里 `try { builder.ParseExpression(); } catch (error) { return false; }`：候选的判定路径（六个候选的 `IsBuildable` 都直接调它）把解析诊断吃成 false — 证据 `member-chain-judge.xl.md:309-313`、`non-null-possible-shape.xl.md:81`
  - `[C1]` ● 每次问「这格算不算」都重算整条链：`CanBuild` → `Kind`（`EqualIndex` + 2×`FirstSignificant`）→ 再来一遍全解析；`Build` 里再算一次 `EqualIndex` — 证据 `member-chain-judge.xl.md:277-291`、`:320-341`
  - `[P3]` ○ `Build` 里只 `host.MountedUnit = null`，不 `SignOut` 不 `TryToClose`，范围依赖 builder 产物 — 证据 `member-chain-judge.xl.md:344-347`
  - `[B1]` ○ `Claims` 有界检查，`Build` 里 `host.Data[equalAt]` 只判了负向（`equalAt < 0`）没判越界 — 证据 `member-chain-judge.xl.md:254-256`、`:320-324`
- 结论：偏离（8 条）。它是本批 6 个 postfix 文件的**共同判据单点**：改这一处等于同时改 6 个候选的语义，`P2` 性质因此在这 6 个文件里只剩「转发」。`PrefixKeywords` 的 39 项关键词黑名单（`:18`）与 `Kind` 的六族字符串码（`:232-246`）都是 IMPORTANCE 未定义的机制。0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/postfix/call-possible-shape.xl.md（7739B / 222 行，代码行 143；CallPossibleShape）

- 结构：**possible 层，工厂式**。`(` 格上 `Accept`，关闭后由本候选建 `CallExpressionShape`：被调用者 + `ParseBracketArguments` 出的实参，签范围 + `TryToClose`。
- 偏离：
  - `[P1]` ○ 建树时机在括号**关闭格**：`IsBuildable` 要求 `bracket.Closed || bracket.SourceRange.EndIndex >= 0` 且被调用者已经不是 `new` 的被构造者 — 证据 `call-possible-shape.xl.md:143-147`、`:99-107`
  - `[X1]` ● 全局登记表 `ExpressionAtomRegistry.RegisterNode(shape)`：把「这个调用形状是增量建出来的」写在形状树之外，收口格靠 `HasNode` 认 — 证据 `call-possible-shape.xl.md:182-184`
  - `[X2]` ○ 实参括号整段交 legacy：`builder.ParseBracketArguments(bracket as Bracket)`，括号里已被增量收下的单元被重新解析一遍 — 证据 `call-possible-shape.xl.md:163-169`
  - `[B4]` ● `IsCallHead` 用 `CompositeInitializerFormsJudge.NextSignificantChar(unit)` 读链头之后的下一个字符判「后面是不是 `(`」 — 证据 `call-possible-shape.xl.md:56-67`
  - `[C3]` ● `cache` 完全未使用 — 证据 `call-possible-shape.xl.md:86`（签名）、`:88-111`
  - `[B1]` ○ 越界返回 `Uncertain`；`BuildByIndex` 的 `data[tokenIndex]` 有类型/括号检查但 `Operand` 里 `host.Data[index]` 无界 — 证据 `call-possible-shape.xl.md:89-91`、`:154-161`、`:194-200`
- 结论：偏离（6 条）。**R31 的正向样本**：`SignIn(start)` → `SignOut(bracket.End)` → `TryToClose(context)` 齐全（`:175-181`），并把 `host.MountedUnit = null`（`:187`）；被调用者的 basic token 当场换形状，且专门处理了 `import("m")` 的 `ImportKeyword`（`:205-217`）——R19/R35 的动作发生了。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/postfix/non-null-possible-shape.xl.md（3296B / 110 行，代码行 68；NonNullPossibleShape）

- 结构：**possible 层，薄转发**。`ComputeByIndex` 把「链头格」与「后缀格」分开：链头格只判 `PostfixEnd(unit) >= 0` 后 `Uncertain`；后缀格则完全由 `MemberChainJudge.Kind(units)` 决定。
- 偏离：
  - `[X1]` ● 判据全部在 `MemberChainJudge`：三个方法 `ComputeByIndex`/`IsBuildable`/`BuildByIndex` 分别只做 `Kind !== "nonnull"` 的翻译、`CanBuild` 的转发、`Build` 的转发 — 证据 `non-null-possible-shape.xl.md:39-45`、`:76-82`、`:100-104`
  - `[B4]` ● `Kind(units)` 扫整段，`PostfixEnd(unit)` 从链头 `EndIndex` 起读原文判 `y!` 的 `!` — 证据 `non-null-possible-shape.xl.md:39`、`:60`、`member-chain-judge.xl.md:149-186`
  - `[X2]` ● `BuildByIndex` 直接 `return MemberChainJudge.Build(host, context)`，即 legacy 整条重建 — 证据 `non-null-possible-shape.xl.md:100-104`、`member-chain-judge.xl.md:317-348`
  - `[S4]` ● AST 由 `ExpressionBuilder` 直接建（见 `member-chain-judge.xl.md:338`），本文件没有任何 shape 产出 — 证据 `non-null-possible-shape.xl.md:103`
  - `[B2]` ○ 判定路径会走到 `MemberChainJudge.CanBuild` 的 `try/catch`，解析异常被吃成「不可建」 — 证据 `non-null-possible-shape.xl.md:81`、`member-chain-judge.xl.md:309-313`
  - `[C1]` ● 同一格 `Kind(units)` 至少算两遍（`ComputeByIndex` 一次、`IsBuildable` 一次），`IsBuildable` 里链头格还要再算 `EqualIndex`/`FirstSignificant`；无 cache — 证据 `non-null-possible-shape.xl.md:39`、`:76`、`:86-92`
  - `[C3]` ● `cache` 完全未使用 — 证据 `non-null-possible-shape.xl.md:25`（签名）、`:28-63`（无 cache 读取）
  - `[B1]` ○ 越界返回 `Uncertain`（`IsBuildable` 返回 `false`）；`IsBuildable` 完全忽略 `tokenIndex`，只按 `Kind` 定案 — 证据 `non-null-possible-shape.xl.md:28-30`、`:69-71`
  - `[P3]` ○ `BuildByIndex` 不自己签范围、不 `TryToClose`，一切交给 judge 的 `MountedUnit = null` 分支 — 证据 `non-null-possible-shape.xl.md:100-104`、`member-chain-judge.xl.md:344-347`
- 结论：偏离（9 条）。它是 6 个成员链候选里唯一有「链头格预判」的（`:46-63`），但那也只是把 `PostfixEnd` 的原文前瞻搬到 `Uncertain` 里。0 处 `catch`（catch 在 judge 里）、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/postfix/member-access-possible-shape.xl.md（2835B / 86 行，代码行 44；MemberAccessPossibleShape）

- 结构：**possible 层，薄转发**（86 行里真正的判据只有 `Kind` 比较那一行）。族判定、可建性、建树三件事全部转给 `MemberChainJudge`。
- 偏离：
  - `[X1]` ● 候选只剩「族码翻译」：`if (MemberChainJudge.Kind(units) !== "member") { return ShapeStates.Reject; } return ShapeStates.Accept;` — 证据 `member-access-possible-shape.xl.md:40-46`、`:69-73`、`:76-80`
  - `[B4]` ● `Kind(units)` 与 `ChainFollows(unit)` 都读当前格之后（整段 `units` + 从 `EndIndex` 起的原文） — 证据 `member-access-possible-shape.xl.md:40`、`:61`、`member-chain-judge.xl.md:118-147`
  - `[X2]` ● `BuildByIndex` = `return MemberChainJudge.Build(host, context);`（legacy 整条重建） — 证据 `member-access-possible-shape.xl.md:76-80`
  - `[S4]` ● AST 由 `ExpressionBuilder.ParseExpression` 直接产出，本文件无 shape 关闭产物 — 证据 `member-access-possible-shape.xl.md:79`、`member-chain-judge.xl.md:338`
  - `[B2]` ○ 判定路径经过 `MemberChainJudge.CanBuild` 的 `try/catch` — 证据 `member-access-possible-shape.xl.md:73`、`member-chain-judge.xl.md:309-313`
  - `[C1]` ● 每格 `Kind(units)` 重算（`ComputeByIndex` 一次 + `IsBuildable` 一次），每次都从 0 扫 `units` — 证据 `member-access-possible-shape.xl.md:40`、`:70`
  - `[C3]` ● `cache` 完全未使用 — 证据 `member-access-possible-shape.xl.md:25`（签名）
  - `[B1]` ○ 越界返回 `Uncertain`；`IsBuildable` 不看 `tokenIndex` — 证据 `member-access-possible-shape.xl.md:28-30`、`:69-71`
  - `[P3]` ○ 无 `SignOut`/`TryToClose`，只经 judge 的 `MountedUnit = null` — 证据 `member-access-possible-shape.xl.md:76-80`、`member-chain-judge.xl.md:346`
- 结论：偏离（9 条）。86 行里 `AppendTo` 占 4 行、越界守卫与签名占 11 行，真正属于本文件的判据只有 `Kind` 比较那一行；本文件对「`.b` 该不该建」不提供任何独立信息。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/postfix/optional-chain-possible-shape.xl.md（2751B / 85 行，代码行 43；OptionalChainPossibleShape）

- 结构：**possible 层，薄转发**，与 `member-access` 逐行同构，只有族码 `"optional"` 不同。
- 偏离：
  - `[X1]` ● 族码翻译即全部判据：`Kind(units) !== "optional" ⇒ Reject`，`BuildByIndex` 直转 `MemberChainJudge.Build` — 证据 `optional-chain-possible-shape.xl.md:39-45`、`:75-79`
  - `[B4]` ● `Kind(units)`/`ChainFollows(unit)` 读当前格之后 — 证据 `optional-chain-possible-shape.xl.md:39`、`:60`
  - `[X2]` ● legacy 整条重建 — 证据 `optional-chain-possible-shape.xl.md:78`、`member-chain-judge.xl.md:317-348`
  - `[S4]` ● AST 由 builder 直接建 — 证据 `optional-chain-possible-shape.xl.md:78`
  - `[B2]` ○ `CanBuild` 的 `try/catch` 在判定路径上 — 证据 `optional-chain-possible-shape.xl.md:72`、`member-chain-judge.xl.md:309-313`
  - `[C1]` ● `Kind(units)` 每格重算两遍 — 证据 `optional-chain-possible-shape.xl.md:39`、`:69`
  - `[C3]` ● `cache` 完全未使用 — 证据 `optional-chain-possible-shape.xl.md:25`
  - `[B1]` ○ 越界返回 `Uncertain`；`IsBuildable` 不看 `tokenIndex` — 证据 `optional-chain-possible-shape.xl.md:28-30`、`:69-71`
  - `[P3]` ○ 无 `SignOut`/`TryToClose` — 证据 `optional-chain-possible-shape.xl.md:75-79`
- 结论：偏离（9 条）。`?.` 的「短路」语义在文件里没有任何落点：判据是 `Kind(units) === "optional"`，建树是 legacy 整条重建。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/postfix/element-access-possible-shape.xl.md（2748B / 85 行，代码行 43；ElementAccessPossibleShape）

- 结构：**possible 层，薄转发**，与上面两个逐行同构，族码 `"element"`。
- 偏离：
  - `[X1]` ● 族码翻译即全部判据（`[` 括号的合法性也由 `Kind` 回答，本文件连 `StartBracketChar` 都不判） — 证据 `element-access-possible-shape.xl.md:39-45`、`:69-72`
  - `[B4]` ● `Kind(units)`/`ChainFollows(unit)` 读当前格之后；`[` 之后的 `]` 是否闭合也由原文前瞻在 judge 里判 — 证据 `element-access-possible-shape.xl.md:39`、`:60`、`member-chain-judge.xl.md:242-247`
  - `[X2]` ● legacy 整条重建 — 证据 `element-access-possible-shape.xl.md:78`
  - `[S4]` ● AST 由 builder 直接建 — 证据 `element-access-possible-shape.xl.md:78`
  - `[B2]` ○ `CanBuild` 的 `try/catch` — 证据 `element-access-possible-shape.xl.md:72`
  - `[C1]` ● `Kind(units)` 每格两遍 — 证据 `element-access-possible-shape.xl.md:39`、`:69`
  - `[C3]` ● `cache` 完全未使用 — 证据 `element-access-possible-shape.xl.md:25`
  - `[B1]` ○ 越界返回 `Uncertain`；`IsBuildable` 不看 `tokenIndex` — 证据 `element-access-possible-shape.xl.md:28-30`、`:69-71`
  - `[P3]` ○ 无 `SignOut`/`TryToClose` — 证据 `element-access-possible-shape.xl.md:75-79`
- 结论：偏离（9 条）。`a[i]` 的索引表达式与括号关闭都不在本候选的视野里，全部由 legacy 重建承担。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/postfix/super-primary-possible-shape.xl.md（2734B / 85 行，代码行 43；SuperPrimaryPossibleShape）

- 结构：**possible 层，薄转发**；链头格额外要求 `unit` 是 `super`（`Is("super")`），后缀格全交 `Kind`。
- 偏离：
  - `[X1]` ● 判据在 `MemberChainJudge.Kind` 的 `super` 分支（`super` 只接 `.`），本文件只做族码翻译 — 证据 `super-primary-possible-shape.xl.md:39-45`、`:57-59`、`member-chain-judge.xl.md:219-225`
  - `[B4]` ● `Kind(units)` + `ChainFollows(unit)` 读当前格之后 — 证据 `super-primary-possible-shape.xl.md:39`、`:60`
  - `[X2]` ● legacy 整条重建 — 证据 `super-primary-possible-shape.xl.md:78`
  - `[S4]` ● AST 由 builder 直接建 — 证据 `super-primary-possible-shape.xl.md:78`
  - `[B2]` ○ `CanBuild` 的 `try/catch` — 证据 `super-primary-possible-shape.xl.md:72`
  - `[C1]` ● `Kind(units)` 每格两遍 — 证据 `super-primary-possible-shape.xl.md:39`、`:69`
  - `[C3]` ● `cache` 完全未使用 — 证据 `super-primary-possible-shape.xl.md:25`
  - `[B1]` ○ 越界返回 `Uncertain`；`IsBuildable` 不看 `tokenIndex` — 证据 `super-primary-possible-shape.xl.md:28-30`、`:69-71`
  - `[P3]` ○ 无 `SignOut`/`TryToClose` — 证据 `super-primary-possible-shape.xl.md:75-79`
- 结论：偏离（9 条）。`super.m` 的 `SuperKeywordShape`（judge 注释里说它是 legacy 主表达式）不在本文件建，本文件只贡献 `"super"` 这个族码。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/expressions/forms/postfix/meta-property-possible-shape.xl.md（2732B / 85 行，代码行 43；MetaPropertyPossibleShape）

- 结构：**possible 层，薄转发**；链头格要求 `unit` 是 `import`，后缀格全交 `Kind`（`Kind` 里再用 `NextWord(suffix) === "meta"` 确认）。
- 偏离：
  - `[X1]` ● 判据在 `MemberChainJudge.Kind` 的 `import` 分支（`import.meta` 唯一合法后缀），本文件只做族码翻译 — 证据 `meta-property-possible-shape.xl.md:39-45`、`:57-59`、`member-chain-judge.xl.md:209-218`
  - `[B4]` ● `Kind(units)`／`ChainFollows(unit)` 读当前格之后；`import.meta` 的 `meta` 靠 `NextWord(suffix)` 从原文读出 — 证据 `meta-property-possible-shape.xl.md:39`、`:60`、`member-chain-judge.xl.md:82-116`、`:214`
  - `[X2]` ● legacy 整条重建 — 证据 `meta-property-possible-shape.xl.md:78`
  - `[S4]` ● AST 由 builder 直接建 — 证据 `meta-property-possible-shape.xl.md:78`
  - `[B2]` ○ `CanBuild` 的 `try/catch` — 证据 `meta-property-possible-shape.xl.md:72`
  - `[C1]` ● `Kind(units)` 每格两遍 — 证据 `meta-property-possible-shape.xl.md:39`、`:69`
  - `[C3]` ● `cache` 完全未使用 — 证据 `meta-property-possible-shape.xl.md:25`
  - `[B1]` ○ 越界返回 `Uncertain`；`IsBuildable` 不看 `tokenIndex` — 证据 `meta-property-possible-shape.xl.md:28-30`、`:69-71`
  - `[P3]` ○ 无 `SignOut`/`TryToClose` — 证据 `meta-property-possible-shape.xl.md:75-79`
- 结论：偏离（9 条）。与其余 4 个成员链候选同模；`import.meta` 的 `MetaPropertyShape` 由 legacy builder 产出，本文件只判「这一格是 meta 族」。0 处 `catch`、0 处 `ExitOrPre`/`ComputePossibleShapes`。

---

## 本批统计

### 逐文件

| # | 文件 | 字节 | 代码行 | 条数 | 编号 |
| --- | --- | --- | --- | --- | --- |
| 1 | operator/conditional-possible-shape | 19412 | 533 | 7 | B4 C1 C3 P2 X2 X1 B1○ |
| 2 | operator/assignment-possible-shape | 12162 | 244 | 7 | C1 B4 C3 P2○ P3○ X1○ B1○ |
| 3 | operator/binary-operator-possible-shape | 11011 | 177 | 5 | B4 C3 X1○ U4○ B1○ |
| 4 | operator/reassociation-possible-shape | 8348 | 158 | 7 | S3 P2○ P3○ X1○ C1 C3 B1○ |
| 5 | prefix/prefix-unary-possible-shape | 9635 | 199 | 6 | P3 C2 C1 C3 X1 B1○ |
| 6 | prefix/update-expression-possible-shape | 7574 | 173 | 10 | X2 S4 B2○ C2 C1 B4 C3 P3○ X1○ B1○ |
| 7 | prefix/delete-possible-shape | 6270 | 137 | 10 | X2 S4 B2○ C2 C1 B4 C3 P3○ X1○ B1○ |
| 8 | postfix/new-possible-shape | 11150 | 258 | 8 | P1○ X1 X2○ C2○ C1 B4 C3 B1○ |
| 9 | postfix/member-chain-judge | 9023 | 270 | 8 | X1 B4 X2 S4 B2 C1 P3○ B1○ |
| 10 | postfix/call-possible-shape | 7739 | 143 | 6 | P1○ X1 X2○ B4 C3 B1○ |
| 11 | postfix/non-null-possible-shape | 3296 | 68 | 9 | X1 B4 X2 S4 B2○ C1 C3 P3○ B1○ |
| 12 | postfix/member-access-possible-shape | 2835 | 44 | 9 | X1 B4 X2 S4 B2○ C1 C3 P3○ B1○ |
| 13 | postfix/optional-chain-possible-shape | 2751 | 43 | 9 | X1 B4 X2 S4 B2○ C1 C3 P3○ B1○ |
| 14 | postfix/element-access-possible-shape | 2748 | 43 | 9 | X1 B4 X2 S4 B2○ C1 C3 P3○ B1○ |
| 15 | postfix/super-primary-possible-shape | 2734 | 43 | 9 | X1 B4 X2 S4 B2○ C1 C3 P3○ B1○ |
| 16 | postfix/meta-property-possible-shape | 2732 | 43 | 9 | X1 B4 X2 S4 B2○ C1 C3 P3○ B1○ |

### 编号汇总（共 128 条）

| 编号 | 条数 | 说明 |
| --- | --- | --- |
| `X1` | 16 | 每个文件都有：成员链第二套判据（judge + 6 个族码）、`ContinuationClaim` 认领格、`ExpressionAtomRegistry` 全局登记表、`bodyMode` 开关、「前置必须是 `=`」硬编码入口 |
| `B1` | 16 | 越界一律 `Uncertain`/`Reject`，`ShapeStates` 无 `Nothing`；`BuildByIndex` 的 `host.Data[tokenIndex]` 多处无界 |
| `C3` | 15 | cache 只当 `ItemStartCached` 用（conditional / assignment / prefix-unary / update / delete 5 个），或完全不用（binary / reassociation / new / call + 6 个成员链） |
| `B4` | 14 | 例外只有 `prefix-unary` 与 `reassociation`（判据纯回看） |
| `C1` | 14 | `Kind`/`EqualIndex`/`QuestionIndex`/`Family` 每格从 0 重扫，无一落 cache |
| `X2` | 12 | legacy `ExpressionBuilder` 整段重建：update/delete/member-chain 及 6 个成员链候选 |
| `P3` | 12 | 缺 `SignOut`/`TryToClose` 或 `MountedUnit` 指向错误 |
| `B2` | 9 | 全部是 `CanBuild` 里的 `try/catch`（update、delete、judge、6 个成员链）；本批 compute 内 0 处 catch |
| `S4` | 9 | AST 由 builder 直接建（update、delete、judge + 6 个成员链） |
| `P2` | 3 | conditional 的文本判定、assignment 的两套入口、reassociation 的无条件 Accept |
| `C2` | 4 | prefix-unary 整表重排、update/delete 全量解析、new 的括号重解析 |
| `P1` | 2 | call/new 的括号关闭格才建树 |
| `S3` | 1 | reassociation 的 `inner.Parent = host` 与层级不一致 |
| `U4` | 1 | binary 把 trivia 搬进 `binary.Data` |
| `U1`/`U2`/`U3` | 0 | — |
| `P4` | 0 | 本批不碰 bracket 晋升（`HandleCloseDispatch` 在 shared/ 层） |
| `R1`/`R2` | 0 | 16 个文件 0 处 `ExitOrPre`、0 处 `ComputePossibleShapes` 覆盖 |
| `D1` | 0 | 围栏外无散文；示例都在 txt/text 围栏内（`assignment:25-36`、`prefix-unary:25-38`、`binary:32-37` 等） |

### 结论要点

1. **本批的偏离是「判据位置」而不是「判据缺失」**：16 个文件全部通过 `AppendFragments` 装进同一个 `CatalogGuide`（`expression-shape-catalog.xl.md:98-119`），R26–R30 的五条在 `catalog-guide.xl.md:66-107` 里逐条成立；但「这一格算不算」被搬进 `MemberChainJudge`、`UpdateExpressionPossibleShape.Kind`、`DeletePossibleShape.Kind`、`ConditionalPossibleShape.Family` 四张**文本族码表**。`X1` 因此 16/16，且 6 个成员链候选（`P1` 组）除族码外没有一行独立判据。
2. **`B4` 是结构性的**：14/16 个文件用「当前单元 `EndIndex` 之后的未 token 化原文」回答「后面还有没有 `?`、`(`、`.`、`;`」，最重的是 `conditional:272-357`（扫到文件尾、自己配平括号、自己数嵌套 `?`）与 `member-chain-judge:82-186`（三个原文前瞻器）。R22 的理由（之后的数据不保证就绪）在这些判据上完全适用：它们读的不是 `Data`，是文档全文。
3. **`S4`/`X2` 集中在「整条初始化器」粒度上**：`update`/`delete`/`member-chain-judge` 及 6 个成员链候选把 `=` 之后所有单元滤成 `raw` 交给 `ExpressionBuilder`，AST 由 builder 直接产出（`member-chain-judge:338`、`update:240`、`delete:178`），形状层只做 `splice` + `Parent`。这条路上 `ParseFromShape` 一次都没出现（全仓唯一实现是抛错桩），R21 的「AST 由关闭后的 shape 产出」在本批无落点。
4. **做对的一半同样成片**：`binary`/`assignment`/`call`/`new` 四个是 R31/R32 的正规写法——运算符/关键字/括号的 basic token 当场 `Replace` 成形状，`SignIn`+`SignOut`+`TryToClose`（`new:268-270`、`call:175-181`）或 `MountedUnit` + 换目录（`binary:153-155`、`conditional:531-533`）二选一，`data.splice` 只留子形状。`conditional` 还额外证明了一件事：trivia 留在形状里会「变成增量树多出来的 basic 行」（`conditional:610-618`），因此 `binary:148-152` 把 trivia 搬进 `binary.Data` 的做法是已知代价而非疏忽。
