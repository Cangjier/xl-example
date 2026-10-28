# 52 主表达式候选批次（审计）

审计对象：`typescript/tokens/expressions/forms/primary/` 下 19 个文件（105701B / 2129 代码行）。判据见 [01-rules.md](01-rules.md)，事实表 `docs/importance-1028/_facts/typescript-tokens-expressions-forms-primary.md`。代码行 = 围栏内非空行；证据行号以 `read` 返回值为准。

本批的判据前提：`ShapeStates` 只有 `Reject/Accept/Uncertain` 三值（`core/syntax/shape-states.xl.md:5-7`），因此 R25 的「越界返回 `Nothing`」在候选的返回类型上**不可表达**——凡是 compute 侧越界返回 `Uncertain`/`Reject` 的，记 `B1` ○ 并注明「类型不可表达」；只有在 build 侧越界**抛错**的记 `B1` ●。

---

### typescript/tokens/expressions/forms/primary/arrow-possible-shape.xl.md（21532B / 447 行；ArrowPossibleShape、ArrowBodyPossibleShape、ArrowBodyBinaryPossibleShape、ArrowBodyConditionalPossibleShape、ArrowBodyAssignmentPossibleShape、ArrowBodyEndPossibleShape）

- 结构：**possible 层（箭头形态的候选族）**。`ArrowPossibleShape` 是候选本体（参数格 + `=>` 格），`BuildByIndex` 建出 `ArrowFunctionShape` 并把它挂成 `host.MountedUnit`，再给箭头挂 `CatalogGuide(ArrowBodyPossibleShape.Catalog(), new ArrowBodyEndPossibleShape())`；其余 5 个类是箭头**体**的候选与终结候选。
- 偏离：
  - `[B4]` ● `RawAfter` 从当前单元的 `EndIndex` 起按字符读原文，`ComputeByIndex` / `IsBuildable` 用它回答「`=>` 之后有没有」以及「体的首字符是什么」，候选的存活因此由 `tokenIndex` 之后的原文决定 — 证据 `arrow-possible-shape.xl.md:57-58`（`let at = range.EndIndex;` / `while (at < count && text.length < length) {`）、`:92-93`（`const pair = ArrowPossibleShape.RawAfter(unit, 2); return pair.length >= 2 && pair[0] === "=" && pair[1] === ">";`）、`:137`、`:236`、`:275`
  - `[B4]` ● `BodyNotIncremental` 前瞻 12 个字符并在其中切词、再交给 `StatementScanner.IsReservedWord`，判「体首是前缀运算符 / 字符串 / 保留字 ⇒ 这一格不建」 — 证据 `arrow-possible-shape.xl.md:137`（`const text = ArrowPossibleShape.RawAfter(arrowUnit, 12);`）、`:167`（`return StatementScanner.IsReservedWord(word);`）、`:275`（`return !ArrowPossibleShape.BodyNotIncremental(unit);`）
  - `[B4]` ● `KeepBodyOpen` 用 `DeclarationAsiBoundary.NextCodeChar(unit)` 读 `=>` 之后的下一个字符，据此在 build 里当场 `TryToClose` + `Quit` — 证据 `arrow-possible-shape.xl.md:204`（`const next = DeclarationAsiBoundary.NextCodeChar(unit);`）、`:429-433`
  - `[B4]` ● 两个 `BuildByIndex` 都从 `data.length - 1` 倒扫整份宿主 `Data` 摘 trivia，遍历范围覆盖 `tokenIndex` 之后的全部单元 — 证据 `arrow-possible-shape.xl.md:412-416`（`for (let scan = data.length - 1; scan >= 0; scan--) { if (data[scan].IsTriviaToken) { data.splice(scan, 1); } }`）、`:615-619`
  - `[B1]` ● build 侧越界直接抛 `Error` 而不是 R25 的 `Nothing`；compute 侧越界返回 `Uncertain`（`Nothing` 在返回类型上不可表达） — 证据 `arrow-possible-shape.xl.md:283-285`（`if (arrowAt < 0 || arrowAt >= data.length) { throw new Error("增量变量形状未支持：expression 箭头缺 =>"); }`）、`:405-407`、`:610-612`、`:217-219`（`return ShapeStates.Uncertain;`）
  - `[C1]` ● 判据每格重算且中间结论不落 cache：`IsArrowHead` 一次调用里 `PreviousCode` 走两遍（自己一遍、`IsInitializerHead` 一遍、`IsArrowBodyHead` 又一遍），同一格被 `ComputeByIndex`、`IsBuildable`、`ContinuationClaim` 各调一次；5 个体候选的 `IsBuildable` 一律只判 `!IsTriviaToken` — 证据 `arrow-possible-shape.xl.md:180`（`const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);`）、`:187-188`、`:194`、`:256-257`、`:270`、`:275`、`:391-395`
  - `[C3]` ● `state`/`share` 全未用（本目录 0 处 `GetState`/`SetState`/`GetShare`/`SetShare`），连 `ItemStartCached` 都没用：`cache` 形参在全部 8 个方法体里一次都没被读 — 证据 `arrow-possible-shape.xl.md:214`（`ComputeByIndex:(units, tokenIndex, cache, source)`，方法体内 0 处 `cache`）、`:260`、`:278`
  - `[X1]` ● 覆写 `ContinuationClaim`——设计里没有的第九个候选协议方法（`possible-shape.xl.md:59-64` 才定义它），把「箭头头的识别」再暴露成一条对外判据，供 `ExpressionContinuationCatalog.Claims` 逐候选轮询 — 证据 `arrow-possible-shape.xl.md:253-258`（`return ArrowPossibleShape.IsArrowHead(units, tokenIndex) || ArrowPossibleShape.IsNestedArrowHead(units, tokenIndex);`）
  - `[X1]` ● 终结候选反向驱动父层的候选求值：`ArrowBodyEndPossibleShape.BuildByIndex` 在摘走收口符后手工调父宿主的 `ComputePossibleShapes`，设计里收口由宿主自己的 close 流程触发 — 证据 `arrow-possible-shape.xl.md:638-640`（`if ("ComputePossibleShapes" in parent) { (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close); }`）
  - `[P3]` ○ 箭头的关闭没有显式 `SignOut`：只 `arrow.SignIn`，终点靠 `TryToClose` 从末子节点回填（R27 写的三步是 `SignOut` → `TryToClose()` → `Quit()`） — 证据 `arrow-possible-shape.xl.md:333-336`（`arrow.SignIn(parameter.SourceRange.Start);`，全文无 `arrow.SignOut`）、`:626-630`（`arrow.TryToClose(context); … arrow.Quit();`）
- 结论：偏离（10 条）。合规项：`BuildByIndex` 末尾 `arrow.Parent = host; host.MountedUnit = arrow; arrow.CatalogGuide = new CatalogGuide(...)` 正是 R32 + R04 的「未关闭 + 挂载 + 目录关联」形态（`:348-350`）；体的收口顺序 `TryToClose()` → `MountedUnit === arrow` 判定 → `Quit()` → 收口符交还父层（`:626-641`）与 R27/R17③ 一致；`=>` 与参数、参数与 `=>` 之间的 trivia 按身份从宿主摘除（`:340-347`），符 R19/R35。全文 0 处 `catch`（0 条 `B2`）、0 处 `ExitOrPre`/`ComputePossibleShapes` 覆写（0 条 `R1`/`R2`）、围栏外 0 行散文（0 条 `D1`）。附注：`BodyStartsBracket`（`:96-104`）只被注释引用，是死代码。

### typescript/tokens/expressions/forms/primary/composite-initializer-forms-judge.xl.md（12891B / 315 行；CompositeInitializerFormsJudge）

- 结构：**设计外的判官层**（既不是 shape，也不是 possible/end）。11 个静态方法替「初始化器族」做全部判定与建树：判族 `Family`、可建 `CanBuild`、续接 `ContinuationAllowed`/`OperatorContinuation`、收口 `ClaimsForEndPossible`，最后 `Build` 直接建树。它是同目录「初始化器族判定」这一语义的**第 2 份实现**（另两份见 `composite-initializer-judge.xl.md`、`composite-initializer-tail-judge.xl.md`）。
- 偏离：
  - `[X1]` ● 判官层本身是设计外机制：IMPORTANCE 的语法层只有 shape / possible / end 三件套（R04），这里多出一层静态类，候选侧三个方法只做单行转发（见 `composite-initializer-forms-possible-shape.xl.md:37`、`:52`、`:58`） — 证据 `composite-initializer-forms-judge.xl.md:127-204`（`static method Family`）、`:275-324`（`static method CanBuild`）、`:383-414`（`static method Build`）
  - `[X1]` ● 与 `CompositeInitializerJudge`/`CompositeInitializerTailJudge` 是同一语义的第二份实现：`EqualIndex` → `FirstSignificant` → 判头单元 这条链在三个类里各写一遍，只是把头的种类从 `{`/`(` 换成 `<`/`[`+`as` — 证据 `composite-initializer-forms-judge.xl.md:130-138`（`const equalAt = CompositeInitializerJudge.EqualIndex(units); … const first = CompositeInitializerFormsJudge.FirstSignificant(units, equalAt + 1); const head = units[first];`）对照 `composite-initializer-tail-judge.xl.md:23-31`
  - `[S4]` ● AST 不由关闭后的 shape 产出：`Build` 把 `=` 之后整段 raw 交给 legacy 的 `ExpressionBuilder.Load/ParseExpression`，把解析结果 `splice` 回 `host.Data`，全文 0 处 `ParseFromShape` — 证据 `composite-initializer-forms-judge.xl.md:402-410`（`const builder = new ExpressionBuilder(host.Template, context); builder.Load(raw, …); const expression = builder.ParseExpression(); … host.Data.splice(start, removed, expression);`）
  - `[C2]` ● 能用增量却用全量：判「可不可建」的方式是把整段 raw 重新解析一遍，且每格都解析一次，不是逐 token 收敛 — 证据 `composite-initializer-forms-judge.xl.md:316-323`（`builder.Load(raw, basePos < 0 ? 0 : basePos); try { builder.ParseExpression(); } … return builder.At === builder.Units.length;`）
  - `[B2]` ○ `CanBuild` 里 `try/catch` 把解析异常吞成 `false`；该方法是 `CompositeInitializerFormsPossibleShape.IsBuildable` 的直接被调方，异常本是候选诊断（R23） — 证据 `composite-initializer-forms-judge.xl.md:318-322`（`try { builder.ParseExpression(); } catch (error) { return false; }`）
  - `[B4]` ● 两处按字符读 `EndIndex` 之后的原文：`NextSignificantChar`（跳过空白与两种注释后取一个字符）与 `RawAfter`，用途是判「后面还接不接」与判 `=>` — 证据 `composite-initializer-forms-judge.xl.md:45`（`let at = range.EndIndex;`）、`:46-74`、`:92-101`、`:234`、`:336`、`:366`
  - `[B4]` ● 判族 / 判可建 / 取 raw 一律读整份 `units`（含 `tokenIndex` 之后），没有以 `tokenIndex` 为界 — 证据 `composite-initializer-forms-judge.xl.md:291-296`（`for (let at = equalAt + 1; at < units.length; at++)`）、`:396-401`、`:239-250`
  - `[C1]` ● 同一格内 `Family(units)` 被反复整体重算：`ComputeByIndex` 一次、`CanBuild` 一次、`ContinuationAllowed` 一次、`OperatorContinuation` 一次、`ClaimsForEndPossible` 一次；每次 `Family` 内部又跑 `EqualIndex`（全扫）+ `FirstSignificant`（全扫）+ `HasAssertSuffix`（全扫 + 原文）+ `LastSignificant`（全扫），结论不落 cache — 证据 `composite-initializer-forms-judge.xl.md:278`、`:329`、`:349`、`:373`、`:232`、`:230`、`:239`
  - `[X1]` ● 设计外的开关位决定判族结果：`StatementRouteUtil.EnableArrowParenCatalog` 为假时 `arrowparen` 一支永不可达 — 证据 `composite-initializer-forms-judge.xl.md:173-176`（`if (StatementRouteUtil.EnableArrowParenCatalog && CompositeInitializerFormsJudge.IsArrowParen(units, head as Bracket)) { return "arrowparen"; }`）
- 结论：偏离（9 条）。合规项：`Build` 末尾 `host.MountedUnit = null`（`:412`）避免了 R32 的「已收口却仍挂载」；`:300-305` 对「函数/类/箭头/三元的参数带类型注解」明确放弃认领（让位给 A5），判据只有一处实现；0 处 `GetState/SetState`（本文件不是候选，`C3` 不适用）；围栏外 0 行散文（`:20-31` 的说明在 ```text``` 围栏内，0 条 `D1`）。

### typescript/tokens/expressions/forms/primary/template-primary-possible-shape.xl.md（10568B / 212 行；TemplatePrimaryPossibleShape）

- 结构：**possible 层（模板字面量候选）**。`ComputeByIndex` 判「这一格是不是模板串」，`IsBuildable` 再叠一道「孤立原子」闸门，`BuildByIndex` 把 `String` basic token 展开成 `NoSubstitutionTemplateLiteralShape` 或 `TemplateExpressionShape`+`TemplateSpanShape` 树，并（被 `tagged-template` 复用）作为 `BuildTemplateNode` 的公共建树入口。
- 偏离：
  - `[B4]` ○ `IsBuildable` 的「这一格是不是孤立原子」整体交 `PrimaryAtomGuard.IsLoneAtom`，被调方按字符读 `EndIndex` 之后的原文，本文件自身不读 — 证据 `template-primary-possible-shape.xl.md:101`（`return PrimaryAtomGuard.IsLoneAtom(units, tokenIndex, context, false);`）；被调方证据 `primary-atom-guard.xl.md:144`、`:177-191`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（R25 的 `Nothing` 在 `ShapeStates` 上不可表达）；`BuildByIndex` 对「不是 `String` / 非内插串」直接抛 `Error` — 证据 `template-primary-possible-shape.xl.md:58-60`、`:107-113`（`throw new Error("增量变量形状未支持：expression 模板字面量（非内插串）");`）
  - `[C1]` ○ 每格重跑一遍原子判定（`IsInitializerStart` 回走 + `IsTerminalAfter` 按字符前扫），结论不入 cache；`ItemStartCached` 只缓存了 item 起点这一项 — 证据 `template-primary-possible-shape.xl.md:65`（`const start = ItemUtil.ItemStartCached(units, cache);`）、`:101`
  - `[C3]` ○ 只用到 `GetItemStart/SetItemStart` 这一项缓存，`state`/`share` 全未用（本目录 0 处 `GetState/SetState/GetShare/SetShare`） — 证据 `template-primary-possible-shape.xl.md:65`（全文唯一一处 `cache` 使用）
- 结论：偏离（4 条，均为 ○）。合规项：`BuildByIndex` 用 `IncrementalItemPosition.AfterPreviousCode` 定位、`token.Replace(shape)` 丢弃 basic token（R35），`BuildTemplateNode` 里 `NoSubstitutionTemplateLiteralShape.FromBasicToken` 承担 R31 的三步（签范围 / 取 `Text` / `TryToClose`，`no-substitution-template-literal-shape.xl.md:26` 起），`TemplateHeadShape`/`TemplateSpanShape`/`TemplateTailShape` 各自 `SignIn`/`SignOut`/`TryToClose`（`:146-211`）；`Text` 在 build 那一刻从 `ConstString` 全部取出（R19）。附注：`BuildInterpolation` 只接受「插值里恰好一个原子」，多单元直接抛错（`:222-237`）——是能力缺口而非判据偏离。

### typescript/tokens/expressions/forms/primary/tagged-template-primary-possible-shape.xl.md（7053B / 122 行；TaggedTemplatePrimaryPossibleShape）

- 结构：**possible 层（带标签模板候选）**。与 `TemplatePrimaryPossibleShape` 互补：模板候选要「前一个单元是 basic token」，本候选要「前一个单元**不是** basic token 且位于初始化器首位」。
- 偏离：
  - `[B4]` ● `MemberFollows` 从 `EndIndex` 起用 `document.GetRaw(at, at + 1)` 逐字符读原文，判「模板之后紧跟 `.` / `[` / `(` 时它不是收口格」，该结论直接进入 `IsBuildable` — 证据 `tagged-template-primary-possible-shape.xl.md:115-128`（`const end = unit.SourceRange.EndIndex; … const ch = document.GetRaw(at, at + 1);`）、`:104-105`（`return PrimaryAtomGuard.IsTerminalAfter(unit, context, true) || TaggedTemplatePrimaryPossibleShape.MemberFollows(unit, context);`）
  - `[B4]` ○ 另两道闸门也由被调方读原文：`IsInitializerStart`（回走找 `=`）与 `IsTerminalAfter`（前扫到 `;`/续接符/词） — 证据 `tagged-template-primary-possible-shape.xl.md:90`、`:104`；被调方 `primary-atom-guard.xl.md:17-37`、`:144-195`
  - `[X1]` ● 设计外的全局身份登记表：build 末尾把「已建好的表达式根」注册进跨形状的静态 `Set`，供 legacy 收口路径 `HasNode` 认领操作数 — 证据 `tagged-template-primary-possible-shape.xl.md:174`（`ExpressionAtomRegistry.RegisterNode(tagged);`）；登记表本体 `forms/shared/expression-atom-registry.xl.md:10-16`、`:18-34`
  - `[P3]` ○ 「该挂载却卸载」的变体：build 把标签与模板从宿主 `Data` 里 `splice` 掉换成新节点，`host.MountedUnit` 仅在「原来挂的正是标签」时改写，其余情形保持指向旧值 — 证据 `tagged-template-primary-possible-shape.xl.md:160-170`（`host.Data.splice(tokenIndex, 1); … if (host.MountedUnit === tag) { host.MountedUnit = tagged; }`）
  - `[B1]` ○ compute 越界返回 `Uncertain`（`Nothing` 不可表达）；build 侧「越界 / 标签是 basic token / 标签不是形状 / 标签不在宿主里」四处直接抛 `Error` — 证据 `tagged-template-primary-possible-shape.xl.md:40-42`、`:140-146`、`:162-164`
  - `[C1]` ○ 同一格判两次原文前瞻（`IsTerminalAfter` + `MemberFollows`），两次都从 `EndIndex` 从头扫字符，结论不入 cache — 证据 `tagged-template-primary-possible-shape.xl.md:104-105`、`:119-128`
  - `[C3]` ○ 只用 `ItemStartCached`（`:47`），`state`/`share` 未用
- 结论：偏离（7 条）。合规项：与模板候选的格位互斥由「前一个单元是否 basic token」一条判据划分（`:67-69` vs `template-primary-possible-shape.xl.md:81-84`），所以两者不会同格同真（R29 的多候选一般不发生）；`BuildTemplateNode` 复用同一建树入口、`TemplatePrimaryPossibleShape.BuildTemplateNode` 内部 `TryToClose` 完成 R31；被消费的 `String` basic token 在 `:160` 从宿主移除（R35）。附注：`:93-103` 的长注释在代码围栏内，不计 `D1`。

### typescript/tokens/expressions/forms/primary/primary-atom-guard.xl.md（6018B / 167 行；PrimaryAtomGuard）

- 结构：**设计外的判官层**（纯静态判据类，无形状数据、无 build）。被 7 个原子候选（`identifier` / `keyword-literal` / `string-literal` / `big-int` / `regex` / `this` / `template`）+ `tagged-template` + `BinaryOperatorPossibleShape` 共用。它回答的「这个原子后面还接不接」正是 legacy 收口路径判的同一件事，因此是**同一判据的第二份实现**。
- 偏离：
  - `[X1]` ● 判官层设计外，且是第二份实现：候选的 `IsBuildable` 一律退化为「问这张表」，候选自身不再持有任何判定 — 证据 `primary-atom-guard.xl.md:198-212`（`IsLoneAtom`）、`:132-196`（`IsTerminalAfter`）；调用点 `identifier-primary-possible-shape.xl.md:87`、`keyword-literal-primary-possible-shape.xl.md:73`、`string-literal-primary-possible-shape.xl.md:70`、`this-primary-possible-shape.xl.md:67`、`big-int-literal-primary-possible-shape.xl.md:67`、`regex-literal-primary-possible-shape.xl.md:64`、`template-primary-possible-shape.xl.md:101`
  - `[B4]` ● 全部 5 个判据都按字符读当前单元 `EndIndex` 之后的原文：`IsDivisionAfter`、`IsTypeArgumentCallAt`、`IsTypeArgumentCallAfter`、`IsTerminalAfter` 四个都是 `while (at < count) { document.GetRaw(at, at + 1) … }` — 证据 `primary-atom-guard.xl.md:47-62`、`:72-105`、`:117-128`、`:140-195`
  - `[C1]` ● `IsInitializerStart` 每格从 `tokenIndex - 1` 回走且不查任何缓存；`IsTerminalAfter` 每格从 `EndIndex` 重新逐字符扫，两个结论都不落 cache，而它们在一次 compute + 一次 build 里各被调一遍 — 证据 `primary-atom-guard.xl.md:20-28`（`let at = tokenIndex - 1; while (at >= 0) { … }`）、`:144`（`while (at < count) {`）
  - `[X1]` ○ 续接集合是硬编码字符表 + 两个词表，再叠加 `=`/`!`/`?` 的双字符特判；同一份「二元运算符集合」在 `OperatorTable` 里还有一份，两处必须人工保持一致 — 证据 `primary-atom-guard.xl.md:13`（`static field ContinuationChars:string = "+-*%<>&|^"`）、`:15`（`["in", "instanceof"]`）、`:168-176`、`:177-191`
- 结论：偏离（4 条）。合规项：所有入口先判界（`:201-203` `if (tokenIndex < 0 || tokenIndex >= units.length) { return false; }`），返回 `bool` 而非 `ShapeStates`，因此 R25 的 `Nothing` 协议不适用（`false` 即空值语义，0 条 `B1`）；`IsTypeArgumentCallAt` 遇 `;`/`}`/`]`/`)` 立即放弃前瞻（`:101-103`），前瞻有上界；0 处 `catch`。

### typescript/tokens/expressions/forms/primary/parenthesized-possible-shape.xl.md（5479B / 124 行；ParenthesizedPossibleShape）

- 结构：**possible 层（括号表达式候选）**。`ComputeByIndex` 只认「已关闭的 `(`」且前一个代码单元是运算符/形状，`IsBuildable` 再问「括号内能不能解析成一个表达式」，`BuildByIndex` 用 `ExpressionBuilder` 解析括号内 raw 并包成 `ParenthesizedExpressionShape`。
- 偏离：
  - `[S4]` ● AST 由 legacy 建造器产出：`BuildByIndex` 把括号内 raw 交给 `ExpressionBuilder.Load/ParseExpression`，本候选只负责包一层壳，全文 0 处 `ParseFromShape` — 证据 `parenthesized-possible-shape.xl.md:158-163`（`const builder = new ExpressionBuilder(host.Template, context); builder.Load(raw, basePos); const inner = builder.ParseExpression();`）、`:169`（`shape.Add(inner);`）
  - `[C2]` ● 全量重建：每次 build 都把括号内所有非 trivia 单元整段重新解析，而不是逐 token 增量收敛 — 证据 `parenthesized-possible-shape.xl.md:144-150`（收集 raw 的整段循环）、`:158-161`
  - `[B2]` ○ `CanParseInside` 里 `try/catch` 把解析异常吞成 `false`；该方法是 `IsBuildable` 的直接被调方（`:110`），异常本是候选诊断（R23） — 证据 `parenthesized-possible-shape.xl.md:129-133`（`try { builder.ParseExpression(); } catch (error) { return false; }`）
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（`Nothing` 不可表达）；`BuildByIndex` 对「括号内 0 单元 / 未读完」直接抛 `Error` — 证据 `parenthesized-possible-shape.xl.md:47-49`、`:151-153`、`:161-163`
  - `[C1]` ● 同一格重复求值：`ComputeByIndex` 与 `ContinuationClaim` 各算一遍 `IsOperatorBefore`，`IsBuildable` 还要再整段解析一次；`ItemStartCached` 之外没有任何结论落 cache — 证据 `parenthesized-possible-shape.xl.md:54`、`:67-71`、`:90-94`、`:110`
  - `[C3]` ○ 只用 `ItemStartCached`（`:54`），`state`/`share` 未用
  - `[P3]` ○ 关闭绕过 `TryToClose`：`shape.Closed = true;` 直接置位，`TryToClose` 只在 `SourceRange.End < 0` 时才调 — 证据 `parenthesized-possible-shape.xl.md:173-176`（`if (shape.SourceRange.End < 0) { shape.TryToClose(context); } shape.Closed = true;`）
  - `[X1]` ○ 覆写 `ContinuationClaim`（设计外的第九个协议方法），把「运算符之前的 `(`」再暴露成一条对外判据 — 证据 `parenthesized-possible-shape.xl.md:74-95`
- 结论：偏离（8 条）。合规项：候选装填与收敛本身走 `AppendTo` + `CatalogGuide`（`expression-shape-catalog.xl.md:102`），R26/R29/R30 的语义在 guide 一侧成立；`(bracket as Bracket).Replace(shape)`（`:177`）替换掉 basic token（R35）；`IsOperatorBefore` 用 `unit.constructor.name.endsWith("TokenShape")` 做形状判定（`:34-36`）——属脆弱的类型分派，但不落在任何单条判据上，不另计偏离。

### typescript/tokens/expressions/forms/primary/arrow-params-catalog.xl.md（5225B / 96 行；ArrowParamsCatalog）

- 结构：**设计外的「括号角色目录 + 重放绑定」层**（不是 shape，也不是 possible/end）。它不是候选族：`Shapes()` 只是转发 `ParameterListPossibleShape.Shapes()`，`EnsureRegistered` 把它注册成 `BracketRole.ArrowParams` 的角色目录，真正的动作用 `BindArrowParen` 直接按类名绑定并驱动参数表收敛。
- 偏离：
  - `[X1]` ● 6 个静态计数器 + 1 个总开关 + 一份 `Report` 字符串，是 IMPORTANCE 没有的指标层，且计数器参与「是否走了降级路径」的判断 — 证据 `arrow-params-catalog.xl.md:19-31`（`Enabled`、`MountCount`、`BindCount`、`ReplayedCount`、`RejectCount`、`HalfBuildCount`、`BuiltParameterCount`）、`:140-153`、`:157-165`
  - `[X1]` ● 设计外的括号角色体系：`BracketRole.ArrowParams` + `BracketRoleCatalog` + `BracketRoleResolver.RegisterCatalog` + `DeferredBracketCatalog.Find/Bind`。箭头形参括号不是「bracket create 时装自己的 possible、由 data 收敛」（R13/R14），而是先登记角色、挂账、之后重放 — 证据 `arrow-params-catalog.xl.md:53-54`（`BracketRoleResolver.RegisterCatalog(new BracketRoleCatalog(BracketRole.ArrowParams, ArrowParamsCatalog.Shapes(), null));`）、`:86-92`、`:137-147`
  - `[P4]` ● bracket 晋升整条被换掉：`BindArrowParen` 用 `DeferredBracketCatalog.Bind("ArrowFunctionShape", shape)` 按**类名**绑定，再靠 `FinalizeBracket` 手工驱动 `ParameterListPossibleShape.Step`；设计里这一步是 `bracket.HandleCloseDispatch`（R15/R16），本文件 0 处 `HandleCloseDispatch` — 证据 `arrow-params-catalog.xl.md:142`（`const bound = DeferredBracketCatalog.Bind("ArrowFunctionShape", shape);`）、`:147`（`ArrowParamsCatalog.FinalizeBracket(shape, context);`）、`:96-113`
  - `[C1]` ● `FinalizeBracket` 用 `while (guard < 64 && Step(state, bracket, context))` 反复驱动同一 Step 直到不前进（每轮重扫括号），而进入前 `FindState(bracket.Data)` 又是按 `Data` 数组身份线性找一次 — 证据 `arrow-params-catalog.xl.md:99`（`const state = ParameterListPossibleShape.FindState(bracket.Data);`）、`:104-107`（`while (guard < 64 && ParameterListPossibleShape.Step(state, bracket, context)) { guard++; }`）
  - `[B1]` ○ 本文件没有 `tokenIndex` 形参，不读 `Data[tokenIndex]`，因此 R25 的越界协议无处落地；`FindState` 返回 `null` 时以 `false` 收场，`Nothing` 概念不存在 — 证据 `arrow-params-catalog.xl.md:96-113`（`FinalizeBracket:(bracket:Bracket, context:SyntaxContext)=>bool`）
  - `[X1]` ○ 候选的存活依赖旁表：`IsPendingArrowParen` 通过 `DeferredBracketCatalog.Find` 的挂账表反查「这只括号是不是在等 `=>`」，而不是看形状自身的关闭状态 — 证据 `arrow-params-catalog.xl.md:86-93`
- 结论：偏离（6 条）。合规项：`IsArrowable` 把「能不能当箭头形参表」交给 `ParameterListPossibleShape.IsSimpleList/IsSimpleArrowList`（`:67-70`），判据不新造；`ReplayCount > 0` 时不重复记 `RejectCount`（`:124-126`）——对「一次性」的自觉；本文件不建 AST、不写 `Data`。注意 `Enabled` 默认为 `true`（`:19`），而 `CompositeInitializerFormsJudge` 用到的 `StatementRouteUtil.EnableArrowParenCatalog` 默认为 `false`（`statement-route-util.xl.md:1053`），两个开关管的是同一件事的两端，属开关位扩散。

### typescript/tokens/expressions/forms/primary/identifier-incomplete-guard.xl.md（4156B / 117 行；IdentifierIncompleteGuard）

- 结构：**设计外的判官层**（纯静态判据 + 手工码点表）。回答「这个标识符还在不在逐字符增长」，与 basic token 层 `Common` 的增长语义是同一件事的第二份实现。
- 偏离：
  - `[X1]` ● 设计外的判官层 + 第二份实现：`IsComplete`/`IsIdentifierPartText`/`FirstCodePoint`/`IsIdentifierPartCodePoint`/`IsWideNonIdentifier` 五个静态方法把「标识符字符集」在语法层重写一遍（含全角/宽标点的黑名单），basic token 层已有一份 — 证据 `identifier-incomplete-guard.xl.md:12-60`（`IsComplete`）、`:88-110`（码点白名单）、`:112-151`（宽标点黑名单）
  - `[B4]` ● 为取「下一个字符」，用 `SourceRange.Whole(document)` + `whole.At(end)` 读当前单元 `EndIndex` 之外的原文（注释自陈 `range.At` 会抛 `SourceRangeIndexOutOfRange`） — 证据 `identifier-incomplete-guard.xl.md:50-59`（`const whole = SourceRange.Whole(document); if (!whole.Has(end)) { return true; } const following = whole.At(end); … return !IdentifierIncompleteGuard.IsIdentifierPartText(following);`）
  - `[C1]` ○ 每格都重建一份 `SourceRange.Whole(document)` 视图再取一个字符，结论不落 cache — 证据 `identifier-incomplete-guard.xl.md:50`（`const whole = SourceRange.Whole(document);`）
- 结论：偏离（3 条）。合规项：入口先判界并以 `false` 收场（`:15-17`），返回 `bool` 而非 `ShapeStates`，R25 的 `Nothing` 不适用（0 条 `B1`）；`:26-33` 先看「后面还有没有代码单元」再看文档字符，顺序正确（有代码单元就一定已长完）；0 处 `catch`、0 处 `ExitOrPre`。

### typescript/tokens/expressions/forms/primary/composite-initializer-tail-judge.xl.md（3961B / 90 行；CompositeInitializerTailJudge）

- 结构：**设计外的判官层**，是「初始化器族判定」这一语义的**第 3 份实现**：`Family` 只认 `=` 之后是 `<`（角度形）或 `[`+`as`/`satisfies`（断言形），`CanBuild` 整段重解析，`Build` 直接建树。
- 偏离：
  - `[X1]` ● 判官层 + 第 3 份族判定：`Family` 与 `CompositeInitializerFormsJudge.Family` 同形（同样的 `EqualIndex` → `FirstSignificant` → 判头单元），只换了接受的形态，两个类各实现一遍 — 证据 `composite-initializer-tail-judge.xl.md:23-31`（`const equalAt = CompositeInitializerJudge.EqualIndex(units); … const first = CompositeInitializerFormsJudge.FirstSignificant(units, equalAt + 1); const head = units[first];`）对照 `composite-initializer-forms-judge.xl.md:130-138`
  - `[S4]` ● AST 由 legacy 建造器产出：`Build` 用 `ExpressionBuilder.Load/ParseExpression` 整段解析后 `splice` 回 `host.Data`，0 处 `ParseFromShape` — 证据 `composite-initializer-tail-judge.xl.md:116-127`（`builder.Load(raw, …); const expression = builder.ParseExpression(); … host.Data.splice(start, removed, expression);`）
  - `[C2]` ● 全量重建且重复一次：`CanBuild` 每格整段解析一遍判「可建」，`Build` 再整段解析一遍 — 证据 `composite-initializer-tail-judge.xl.md:87-94`、`:116-121`
  - `[B2]` ○ `CanBuild` 的 `try/catch` 把解析异常吞成 `false`（被 `IsBuildable` 直接调用） — 证据 `composite-initializer-tail-judge.xl.md:89-93`（`try { builder.ParseExpression(); } catch (error) { return false; }`）
  - `[B4]` ● 判族 / 取 raw 都读整份 `units`（含 `tokenIndex` 之后），且 `InitializerTailJudge.IsInitializerEnd` 从 `last` 的 `EndIndex` 起按字符读原文判「之后只剩输入结束」 — 证据 `composite-initializer-tail-judge.xl.md:68-73`（`for (let at = equalAt + 1; at < units.length; at++)`）、`:79`、`:110-115`
  - `[C1]` ● `Family` 在 `CanWait`、`CanBuild`、被调方 `ComputeByIndex` 各算一次，每次都全扫（`EqualIndex` + `FirstSignificant` + `HasAssertSuffix` 三段全扫），结论不落 cache — 证据 `composite-initializer-tail-judge.xl.md:50`、`:56`、`:41`
- 结论：偏离（6 条）。合规项：`Build` 末尾 `host.MountedUnit = null`（`:126`）避免「已收口仍挂载」；族判定只复用 `CompositeInitializerFormsJudge.HasAssertSuffix` 而不再写一份 `as`/`satisfies` 识别（`:41`）——相对 `Family` 的重复，这里是收敛的。

### typescript/tokens/expressions/forms/primary/identifier-primary-possible-shape.xl.md（3862B / 62 行；IdentifierPrimaryPossibleShape）

- 结构：**possible 层（标识符原子候选）**。`ComputeByIndex` 判「这一格是不是普通标识符」（排除数字/bigint/关键字/上下文关键字），`IsBuildable` 再叠「孤立原子」，`BuildByIndex` 用 `IdentifierShape.FromBasicToken` 建节点并 `Replace`。
- 偏离：
  - `[B4]` ○ `IsBuildable` 交 `PrimaryAtomGuard.IsLoneAtom`，由被调方按字符读 `EndIndex` 之后原文 — 证据 `identifier-primary-possible-shape.xl.md:87`（`return PrimaryAtomGuard.IsLoneAtom(units, tokenIndex, context, true);`）；被调方 `primary-atom-guard.xl.md:144-195`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（`Nothing` 不可表达）；`BuildByIndex` 对「不是 `Common` / 数字 / 关键字 / 上下文关键字」直接抛 `Error` — 证据 `identifier-primary-possible-shape.xl.md:31-33`、`:95-103`
  - `[C3]` ○ 只用 `ItemStartCached`（`:38`），`state`/`share` 未用
  - `[C1]` ○ 每格重跑 `IsLoneAtom`（回走找 `=` + 按字符前扫），不落 cache — 证据 `identifier-primary-possible-shape.xl.md:38`、`:87`
- 结论：偏离（4 条，均为 ○）。合规项：「哪些词不归本候选」在 `ComputeByIndex`（`:55`）、`IsBuildable`（`:81-86`）、`BuildByIndex`（`:97-103`）三处用的是同一张条件表，未出现第二个判据来源（`:101` 的注释即此意）；`IdentifierShape.FromBasicToken` 承担 R31 的三步（签范围 / 取 `EscapedText` / `TryToClose`，`identifier-shape.xl.md:27-38`），`token.Replace(shape)`（`:106`）丢弃 basic token（R35）。附注：`:61-65` 的 `static field ContextualExpressionWords` 在围栏里又重复写了一遍 `["yield"]`，字段声明已给初值，属冗余而非偏离。

### typescript/tokens/expressions/forms/primary/composite-initializer-judge.xl.md（3736B / 77 行；CompositeInitializerJudge）

- 结构：**设计外的判官层**，是「初始化器族判定」这一语义的**第 1 份实现**：`EqualIndex` 找 `=`，`SoleCompositeUnit` 认「`=` 之后只剩一个 `{` 括号」，`Claims` 判收口，`Build` 整段重解析建树。三个 `composite-initializer-*-possible` 都转发到它与另两个判官。
- 偏离：
  - `[X1]` ● 判官层：4 个静态方法替候选做全部决定，候选侧三个方法各一行转发（`composite-initializer-possible-shape.xl.md:37`、`:46`、`:59`） — 证据 `composite-initializer-judge.xl.md:23-36`（`EqualIndex`）、`:38-68`（`SoleCompositeUnit`）、`:70-88`（`Claims`）、`:90-118`（`Build`）
  - `[S4]` ● AST 由 legacy 建造器产出：`Build` 把 `=` 之后整段交给 `ExpressionBuilder`，只把 `SoleCompositeUnit` 找到的括号 `Replace` 成解析结果，0 处 `ParseFromShape` — 证据 `composite-initializer-judge.xl.md:102-105`（`const raw:Array<Token> = host.Data.slice(equalAt + 1); … const expression = builder.ParseExpression();`）、`:113`（`const built = (bracket as Token).Replace(expression);`）
  - `[C2]` ● 全量重建：`slice(equalAt + 1)` 取整段 + 一次 `ParseExpression`；同一方法里 `SoleCompositeUnit(host.Data)` 又把整表扫第二遍 — 证据 `composite-initializer-judge.xl.md:102`、`:109`
  - `[B4]` ● `host.Data.slice(equalAt + 1)` 读到 `Data` 末尾，包含 `tokenIndex` 之后的全部单元（含 trivia，未过滤） — 证据 `composite-initializer-judge.xl.md:102`
  - `[B4]` ○ 「初始化器到此为止」交 `InitializerTailJudge.IsInitializerEnd`，被调方从 `last` 的 `EndIndex` 起按字符读原文（跳 trivia 与注释、放行多个 `;`） — 证据 `composite-initializer-judge.xl.md:87`（`return InitializerTailJudge.IsInitializerEnd(units, last);`）；被调方 `forms/shared/initializer-tail-judge.xl.md:28-67`
  - `[B1]` ○ `EqualIndex` 以 `-1` 表示「没有 `=`」（`int` 的空值，不是 `Nothing`）；`Build` 对 `-1` / `null` 直接抛 `Error` — 证据 `composite-initializer-judge.xl.md:35`、`:94-96`、`:110-112`
  - `[P3]` ○ 收口动作整体在 legacy 侧：产物已由 `ExpressionBuilder` 闭合，本方法既不 `SignOut` 也不 `TryToClose`，只把 `host.MountedUnit` 置 `null` — 证据 `composite-initializer-judge.xl.md:113-117`（`built.Parent = host; … host.MountedUnit = null;`）
- 结论：偏离（7 条）。合规项：`SoleCompositeUnit` 明确只接管 `{...}`、把 `[...]` / `[...] as const` 交回（`:59-66`，理由是「`]` 关闭那一格无法区分初始化器结束与后缀」）——是对「提前建树会丢后缀」的自觉；`Build` 末尾不清宿主其余单元（`:115-116` 注释），符 R17③ 的「后续 token 仍属声明层」。

### typescript/tokens/expressions/forms/primary/keyword-literal-primary-possible-shape.xl.md（3616B / 61 行；KeywordLiteralPrimaryPossibleShape）

- 结构：**possible 层（`true`/`false`/`null` 三个关键字字面量候选）**。三个必需方法 + 一个静态建树入口都没有，`BuildByIndex` 里按文本分派 `TrueKeywordShape`/`FalseKeywordShape`/`NullKeywordShape` 并显式做 R31 的三步。
- 偏离：
  - `[B4]` ○ `IsBuildable` 交 `PrimaryAtomGuard.IsLoneAtom`，由被调方按字符读 `EndIndex` 之后原文 — 证据 `keyword-literal-primary-possible-shape.xl.md:73`；被调方 `primary-atom-guard.xl.md:144-195`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（`Nothing` 不可表达）；`BuildByIndex` 对非 `Common` / 非这三个词直接抛 `Error` — 证据 `keyword-literal-primary-possible-shape.xl.md:34-36`、`:80-82`、`:91-93`
  - `[C3]` ○ 只用 `ItemStartCached`（`:41`），`state`/`share` 未用
- 结论：偏离（3 条，均为 ○）。合规项：`BuildByIndex` 里 `SignIn`/`SignOut`/`Pos`/`TryToClose` 四步显式到位（`:94-101`），`token.Replace(shape)`（`:102`）丢弃 basic token —— R31/R35 逐条满足；`IsAny(["true","false","null"])` 与 `BuildByIndex` 的分派用同一张三词表（`:54`、`:70`、`:85-93`），没有第二份判据。

### typescript/tokens/expressions/forms/primary/this-primary-possible-shape.xl.md（3075B / 51 行；ThisPrimaryPossibleShape）

- 结构：**possible 层（`this` 原子候选）**。判据只有 `Common.Is("this")` 一条，`BuildByIndex` 直建 `ThisKeywordShape`。
- 偏离：
  - `[B4]` ○ `IsBuildable` 交 `PrimaryAtomGuard.IsLoneAtom`（被调方读 `EndIndex` 之后原文），本文件自身不读 — 证据 `this-primary-possible-shape.xl.md:67`；被调方 `primary-atom-guard.xl.md:144-195`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（`Nothing` 不可表达）；`BuildByIndex` 两处类型/正文不符直接抛 `Error` — 证据 `this-primary-possible-shape.xl.md:31-33`、`:74-79`
  - `[C3]` ○ 只用 `ItemStartCached`（`:38`），`state`/`share` 未用
- 结论：偏离（3 条，均为 ○）。合规项：`SignIn`/`SignOut`/`TryToClose` 显式三步（`:81-88`）+ `token.Replace`（`:89`），R31/R35 满足；`ComputeByIndex`（`:51`）、`IsBuildable`（`:64`）、`BuildByIndex`（`:77`）三处对「是不是 `this`」用同一个 `Is("this")`，无第二判据。

### typescript/tokens/expressions/forms/primary/string-literal-primary-possible-shape.xl.md（3004B / 47 行；StringLiteralPrimaryPossibleShape）

- 结构：**possible 层（非内插字符串原子候选）**。与 `template-primary` 按 `String.IsSupportInterpolation` 分格：本候选只接非内插串，`BuildByIndex` 走 `StringLiteralShape.FromBasicToken`。
- 偏离：
  - `[B4]` ○ `IsBuildable` 交 `PrimaryAtomGuard.IsLoneAtom`（被调方读 `EndIndex` 之后原文） — 证据 `string-literal-primary-possible-shape.xl.md:70`；被调方 `primary-atom-guard.xl.md:144-195`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（`Nothing` 不可表达）；`BuildByIndex` 对非 `String` / 内插串直接抛 `Error` — 证据 `string-literal-primary-possible-shape.xl.md:31-33`、`:77-82`
  - `[C3]` ○ 只用 `ItemStartCached`（`:38`），`state`/`share` 未用
- 结论：偏离（3 条，均为 ○）。合规项：这是 R31 的样板路径——`StringLiteralShape.FromBasicToken`（`string-literal-shape.xl.md:30-49`）签范围、把 `ConstString` 全取成 `Text`（R19）、`TryToClose`；`token.Replace(shape)`（`:85`）丢弃 basic token（R35）；`IsBuildable` 的 `IsSupportInterpolation` 判据（`:67`）与 `ComputeByIndex`（`:51`）、`BuildByIndex`（`:80`）同源。

### typescript/tokens/expressions/forms/primary/big-int-literal-primary-possible-shape.xl.md（2932B / 44 行；BigIntLiteralPrimaryPossibleShape）

- 结构：**possible 层（BigInt 字面量原子候选）**。判据是 `Common.IsBigInt()`，建树走 `BigIntLiteralShape.FromBasicToken`。
- 偏离：
  - `[B4]` ○ `IsBuildable` 交 `PrimaryAtomGuard.IsLoneAtom`（被调方读 `EndIndex` 之后原文） — 证据 `big-int-literal-primary-possible-shape.xl.md:67`；被调方 `primary-atom-guard.xl.md:144-195`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（`Nothing` 不可表达）；`BuildByIndex` 对非 `Common` / 非 BigInt 直接抛 `Error` — 证据 `big-int-literal-primary-possible-shape.xl.md:31-33`、`:74-79`
  - `[C3]` ○ 只用 `ItemStartCached`（`:38`），`state`/`share` 未用
- 结论：偏离（3 条，均为 ○）。合规项：`BigIntLiteralShape.FromBasicToken`（`:80`，`big-int-literal-shape.xl.md:27` 起）承担 R31 三步并把字面量数据在 build 时取净（R19）；`token.Replace`（`:82`）丢弃 basic token（R35）。

### typescript/tokens/expressions/forms/primary/regex-literal-primary-possible-shape.xl.md（2747B / 38 行；RegexLiteralPrimaryPossibleShape）

- 结构：**possible 层（正则字面量原子候选）**，本批最小的候选。判据是 `unit instanceof RegexToken`，建树走 `RegularExpressionLiteralShape.FromBasicToken`。
- 偏离：
  - `[B4]` ○ `IsBuildable` 交 `PrimaryAtomGuard.IsLoneAtom`（被调方读 `EndIndex` 之后原文） — 证据 `regex-literal-primary-possible-shape.xl.md:64`；被调方 `primary-atom-guard.xl.md:144-195`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（`Nothing` 不可表达）；`BuildByIndex` 对非 `RegexToken` 直接抛 `Error` — 证据 `regex-literal-primary-possible-shape.xl.md:31-33`、`:71-73`
  - `[C3]` ○ 只用 `ItemStartCached`（`:38`），`state`/`share` 未用
- 结论：偏离（3 条，均为 ○）。合规项：`RegularExpressionLiteralShape.FromBasicToken`（`regular-expression-literal-shape.xl.md:25-38`）签范围、`Text = token.ToText()`、`TryToClose`，R31/R19 满足；`token.Replace(shape)`（`:76`）丢弃 basic token（R35）。正则与除号的分歧在 `BinaryOperatorPossibleShape` 一侧用 `PrimaryAtomGuard.IsDivisionAfter` 处理，本文件不重复判。

### typescript/tokens/expressions/forms/primary/composite-initializer-forms-possible-shape.xl.md（2030B / 18 行；CompositeInitializerFormsPossibleShape）

- 结构：**possible 层的转发壳**。三个方法各一行，全部交给 `CompositeInitializerFormsJudge`；自身不含任何形状字段，也不看 `tokenIndex`。它与 `composite-initializer-possible`、`composite-initializer-tail-possible` 及三个 judge 共同构成「同一语义的三层分工」：三个 `*-possible` 合计 5846B / 59 行代码，其中真正的候选逻辑只有「转发」。
- 偏离：
  - `[X1]` ● 候选退化为判官层的转发壳：`ComputeByIndex`/`IsBuildable`/`BuildByIndex` 各一行转发，候选本身不持有判定 — 证据 `composite-initializer-forms-possible-shape.xl.md:37`（`if (CompositeInitializerFormsJudge.Family(units) === "") { return ShapeStates.Reject; }`）、`:52`（`return CompositeInitializerFormsJudge.CanBuild(units, context.Root.Template, context);`）、`:58`（`return CompositeInitializerFormsJudge.Build(host, context);`）
  - `[X1]` ● 覆写 `ContinuationClaim`（设计外的第九个协议方法），只转 `OperatorContinuation` — 证据 `composite-initializer-forms-possible-shape.xl.md:43-47`
  - `[C3]` ● `cache` 形参 0 处使用，`state`/`share` 全未用 — 证据 `composite-initializer-forms-possible-shape.xl.md:24`（形参 `cache:PossibleShapeCache`）、`:49`
  - `[B4]` ○ 判族与可建全在被调方读原文 / 读整份 `units` — 证据 `:37`、`:52`；被调方 `composite-initializer-forms-judge.xl.md:45`、`:46-74`、`:291-296`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（`Nothing` 在 `ShapeStates` 上不可表达） — 证据 `composite-initializer-forms-possible-shape.xl.md:27-29`
  - `[P2]` ○ `IsBuildable` 不看 `tokenIndex`、不判「本候选这一格能不能建」，而是把整条族判据 + 整段解析再跑一遍；R30 的「唯一候选时先问 IsBuildable」在这里退化为重复判族 — 证据 `composite-initializer-forms-possible-shape.xl.md:49-53`
- 结论：偏离（6 条）。这是「同一语义分层副本」的候选侧证据：同一格被 `Family`（compute）与 `CanBuild`（buildable，内部又含 `Family`）判两遍，两层之间没有结论传递。

### typescript/tokens/expressions/forms/primary/composite-initializer-possible-shape.xl.md（1943B / 24 行；CompositeInitializerPossibleShape）

- 结构：**possible 层的转发壳**，指向 `CompositeInitializerJudge`。`ComputeByIndex` 与 `IsBuildable` 用的是同一对判据（`Claims` / `SoleCompositeUnit`），`BuildByIndex` 一行转发。
- 偏离：
  - `[X1]` ● 纯转发壳：三个方法都不持有判定，`BuildByIndex` 只有一行 — 证据 `composite-initializer-possible-shape.xl.md:37`（`if (!CompositeInitializerJudge.Claims(units)) {`）、`:46`（`const target = CompositeInitializerJudge.SoleCompositeUnit(units);`）、`:59`（`return CompositeInitializerJudge.Build(host, context);`）
  - `[C3]` ● `cache` 形参 0 处使用，`state`/`share` 全未用 — 证据 `composite-initializer-possible-shape.xl.md:24`、`:43`
  - `[B4]` ○ 收口判据在被调方读原文：`Claims` → `InitializerTailJudge.IsInitializerEnd` 从 `last` 的 `EndIndex` 起按字符扫 — 证据 `composite-initializer-possible-shape.xl.md:37`；被调方 `composite-initializer-judge.xl.md:87` → `forms/shared/initializer-tail-judge.xl.md:32-67`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`；`IsBuildable` 以 `SoleCompositeUnit` 的 `null` 作空值（不是 `Nothing`） — 证据 `composite-initializer-possible-shape.xl.md:27-29`、`:46-49`
  - `[P2]` ○ `IsBuildable` 与 `ComputeByIndex` 同源：前者再算一遍 `SoleCompositeUnit`，并额外接受「括号未 `Closed` 但已有 `EndIndex`」的状态（`return target.SourceRange.EndIndex >= 0;`），等于在 buildable 一侧放宽了 compute 已通过的语义 — 证据 `composite-initializer-possible-shape.xl.md:46-53`
- 结论：偏离（5 条）。

### typescript/tokens/expressions/forms/primary/composite-initializer-tail-possible-shape.xl.md（1873B / 17 行；CompositeInitializerTailPossibleShape）

- 结构：**possible 层的转发壳**，指向 `CompositeInitializerTailJudge`。本批最小的文件：三个方法 + `AppendTo`，共 17 行代码。
- 偏离：
  - `[X1]` ● 纯转发壳：`ComputeByIndex` 只问 `Family`、`IsBuildable` 只问 `CanBuild`（后者内部又整段解析）、`BuildByIndex` 一行转发 — 证据 `composite-initializer-tail-possible-shape.xl.md:37`（`if (CompositeInitializerTailJudge.Family(units) === "") {`）、`:46`、`:52`
  - `[C3]` ● `cache` 形参 0 处使用，`state`/`share` 全未用 — 证据 `composite-initializer-tail-possible-shape.xl.md:24`、`:43`
  - `[B4]` ○ 判族 / 可建全在被调方读整份 `units` 与 `EndIndex` 之后的原文 — 证据 `composite-initializer-tail-possible-shape.xl.md:37`、`:46`；被调方 `composite-initializer-tail-judge.xl.md:68-73`、`:79`
  - `[B1]` ○ 越界 `ComputeByIndex` 返回 `Uncertain`（`Nothing` 不可表达） — 证据 `composite-initializer-tail-possible-shape.xl.md:27-29`
  - `[P2]` ○ `ComputeByIndex` 判 `Family`、`IsBuildable` 判 `CanBuild`（族 + 尾判 + 整段解析），两处各自从头判一遍，没有把 compute 的结论带过去 — 证据 `composite-initializer-tail-possible-shape.xl.md:37-40`、`:46`
- 结论：偏离（5 条）。

---

## 本批统计

- 文件数 19，字节 105701，代码行 2129；**有偏离的文件 19 / 19**（全部条目均为 ○ 的文件 7 个：`template`、`identifier-primary`、`keyword-literal`、`this`、`string-literal`、`big-int`、`regex`）。
- 偏离条目合计 **99 条**（● 47 / ○ 52）。

| 编号 | 条数 | 条目分布（文件序号见下） |
| --- | --- | --- |
| `B4` 查看 `tokenIndex` 之后 | 23 | 1×4、2×2、3、4×2、5、8、9、10、11×2、12、13、14、15、16、17、18、19 |
| `X1` 设计外机制 | 19 | 1×2、2×3、4、5×2、6、7×3、8、9、11、17×2、18、19 |
| `B1` 越界未返回 `Nothing` | 15 | 1、3、4、6、7、10、11、12、13、14、15、16、17、18、19 |
| `C3` cache 语义偏离 | 13 | 1、3、4、6、10、12、13、14、15、16、17、18、19 |
| `C1` 每轮重扫 | 10 | 1、2、3、4、5、6、7、8、9、10 |
| `C2` 全量替增量 | 4 | 2、6、9、11 |
| `S4` AST 不经 `ParseFromShape` | 4 | 2、6、9、11 |
| `P3` build 去向偏离 | 4 | 1、4、6、11 |
| `P2` 候选判定语义偏离 | 3 | 17、18、19 |
| `B2` compute/build 里 catch | 3 | 2、6、9（均在 `IsBuildable` 路径上的 `CanBuild`/`CanParseInside`，故记 ○） |
| `P4` bracket 晋升偏离 | 1 | 7 |

文件序号：1 `arrow-possible-shape`、2 `composite-initializer-forms-judge`、3 `template-primary-possible-shape`、4 `tagged-template-primary-possible-shape`、5 `primary-atom-guard`、6 `parenthesized-possible-shape`、7 `arrow-params-catalog`、8 `identifier-incomplete-guard`、9 `composite-initializer-tail-judge`、10 `identifier-primary-possible-shape`、11 `composite-initializer-judge`、12 `keyword-literal-primary-possible-shape`、13 `this-primary-possible-shape`、14 `string-literal-primary-possible-shape`、15 `big-int-literal-primary-possible-shape`、16 `regex-literal-primary-possible-shape`、17 `composite-initializer-forms-possible-shape`、18 `composite-initializer-possible-shape`、19 `composite-initializer-tail-possible-shape`。

- 本批 0 条：`S1`、`S2`、`S3`、`U1`–`U4`、`R1`、`R2`、`B3`、`X2`、`X3`、`D1`（全目录围栏外 0 行散文，已逐文件机械核对）、`N`。
- 三条贯穿本批的判断：
  1. **候选侧几乎是合规的，偏离集中在候选之外的层**。8 个原子候选（`identifier`/`keyword`/`string`/`big-int`/`regex`/`this`/`template`/`tagged-template`）的 `ComputeByIndex → IsBuildable → BuildByIndex` 骨架、`Replace` 丢弃 basic token、`FromBasicToken` 的 R31 三步都成立；它们扣分只扣在两处外部依赖上：`IsBuildable` 一律外包给 `PrimaryAtomGuard`（`B4` ○），以及 `state`/`share` 从未使用（`C3` ○）。
  2. **`composite-initializer` 三件套是本批最重的一处结构性重复**：`CompositeInitializerJudge`（第 1 份族判定）、`CompositeInitializerFormsJudge`（第 2 份）、`CompositeInitializerTailJudge`（第 3 份）各自实现「`=` 之后属于哪一族」，三个 `*-possible` 各用 3–4 行把它们转发出去；三个 `*-possible` 合计 5846B / 59 行代码，却对应三份族判据 + 三个转发壳，且每层都在 `IsBuildable` 里把 `Family` + 整段 `ExpressionBuilder` 重解析再跑一遍（`C1`/`C2`）。
  3. **`ExpressionBuilder` 是本批实际上的 AST 生产通道**：凡是「复合」形态（`parenthesized`、`composite-initializer` ×2、`forms-judge`），`BuildByIndex` 都是 `Load(raw) + ParseExpression() + splice`，本目录 0 处 `ParseFromShape`（`S4` 4 条）；也因此这些 build 都读整份 `Data`（`B4` 强制 ●）。相对地，单原子形态走的是真正的增量静态工厂，没有一条 `S4`/`C2`。
