# IMPORTANCE

1. 本文档只能由用户编辑——AI 与其它工具不得改动。**AI 只有在用户消息明确要求修改本文档时才能改，且只改被要求的那一条。**

2. `typescript/tokens/` 下的 `*.xl.md`：禁止散文

   **散文 = 代码围栏之外、标题之外的说明文字**；```txt``` 围栏内的示例与中文注释不算散文。

3. **token / shape / astnode 开发流程规范**：一个语法形态按下面五个阶段开发，顺序固定。

   **3.1 字符由 basic token 承接。**

   basic token 负责承接字符，共 **8 种** basic tokens：
   - 区域注释 `AreaAnnotation`
   - 行注释 `LineAnnotation`
   - 正则 `RegexToken`
   - 字符串 `String`
   - 括号 `Bracket`
   - 空白 `WrapSymbol`
   - 符号 `Symbol`
   - 通用字符块 `Common`
   
   注释与空白是 trivia。

   **basic token 只能由用户发起修改**：`core/syntax/basic-tokens/` 下的代码，AI 不得自行改动，只有用户明确要求时才能改。

   **3.2 basic token 关闭时触发 compute possible。**

   宿主 `Data` 里攒的就是这些 basic token；形状定型之前，`Data` 只是**未定型期间的暂存**。basic token 收尾时（下一个字符的跳转里 `last.TryToClose()`，或在自认结束的字符处），除了把自己标记 `Closed`，还会**只问直接父单元**要不要重算候选：父单元必须实现 `IComputePossibleShapes`（`UnitToken` 已实现），它的 `CatalogGuide` 为空就等于没挂向导、被问到也不做任何事。命中之后父单元调 `CatalogGuide.ComputePossibleShapes(this, context)`——向导自己取 `host.Data.length - 1` 再转调按下标版——这就是 compute possible 的**唯一触发点**：父单元挂了向导时，每个 basic token 关闭一次，目录判一次。例外是空白块 `WrapSymbol` 的 `Close`：trivia 收尾不报告，问了只会在判不出东西的下标上打转；队列里的 `StringGuide` 是 `GuideToken`，它的 `Close` 同样不问。

   重算结果会原样透传：`Built` 变成 `CloseStates.Built`；在 `Transit` 里调 `last.TryToClose` 的分支据此返回 `BranchStates.Reload`，当前字符没有被任何 token 吃掉，由机制插回队列重放——挂载态的新形状（3.3 ②）已经 `host.MountedUnit`，重放时转给它（终结候选建完是例外：宿主已被 `Quit()` 卸载，字符由外层单元接手）。`ExitOrPre` 路径上的关闭结果会被直接丢弃，不产生 `BranchStates.Reload`（个别 token 收尾时会另行插 `ReloadMessage` 重放当前字符）。

   **3.3 compute possible：候选 possible 与终结候选，各类情况。**

   `CatalogGuide` 里有两份东西：`PossibleShapes`（普通候选，可能长成目标形状）和一个单独的 `EndPossible`（终结候选，只回答「这条语句到这里该结束了」）。每次判定 `ComputePossibleShapesByIndex(host, tokenIndex, context)` 按下面的顺序走（即 `CatalogGuide` 的实现）：

   - **形参校验**：`context` 没由形参传进来就直接抛错——消息会经由它挂进上下文，漏了会静默丢掉，宁可当场炸。
   - **越界**：`host.Data[tokenIndex]` 不存在 → 返回 `Nothing`（调用方可能按旧长度遍历）。
   - **淘汰**：逐个还活着的候选调 `ComputeByIndex`；`Reject` 从 `Candidates` 里去掉（`PossibleShapes` 数组一个字都不动），`Accept` 与 `Uncertain` 在这一次判定里同义——都只表示「还活着」。这一步只淘汰，不定案。
   - **终结候选 Accept**：`EndPossible` 非空且判出 `Accept` 时——`Candidates == 0` 就调它的 `BuildByIndex` 结束（签出宿主 `SignOut` → `TryToClose()` → `Quit()`），`Reset` 后返回 `Built`；`Candidates > 0` 则**抛错**（既像结束、又像还能长）。
   - **零候选且不结束**：`EndPossible` 为 `null` → **抛错**（没有候选形状可以构成）；不为 `null` → 返回 `Waiting`，继续等（有终结候选时不因 0 候选抛错）。
   - **多候选**：`Candidates.size > 1` → 返回 `Waiting`。
   - **唯一候选**：先过 `IsBuildable`（只在恰好剩一个候选时问；默认 `true`，候选可以声明「还缺后续单元」，例如 `ImportDeclarationPossibleShape` 要等 `Stage` 走出 0）——`false` 就返回 `Waiting`；`true` 就 `BuildByIndex` 建它，`Reset`，返回 `Built`。

   建出来的形状有两种去向：①**立即关闭**——静态工厂里签范围、取字段、`TryToClose()`，如 `StringLiteralShape`（`FromBasicToken`）与 `ImportAttributesShape`（`FromBracket`）（`IdentifierShape` 这类更内层的子形状由外层工厂直接造，不是候选 `BuildByIndex` 的结果）；②**未关闭 + 挂载**——`host.MountedUnit = shape`，既不 `SignOut` 也不 `TryToClose`，如 `ImportDeclarationShape`，后续字符继续流进它，直到终结候选在「单元到齐」时签名并关闭。所以「只剩一个候选」不是提前构建，而是一次正确的选择：构建得早不早，看的是形状建完之后**是关掉还是挂上**。basic token 转 shape 走 `FromBasicToken` / `FromBracket` / `FromTokens` 这类静态工厂；候选的 `BuildByIndex` 建完把被消费的 token 段从 `Data` 里 `splice` 掉。

   几条硬约束：shape **禁止用 `ExitOrPre` 结束自己**——`ExitOrPre` 判的是「这个字符让不让我退出」，不是「单元是否到齐」（它只拿到当前位置的一个 `Source`，可 `source.Pre()` 回看前一格、也能在自己身上记状态），会接收字符的 shape 必须覆写 `ExitOrPre`，且只允许 `return BranchStates.Undo`；建完即关闭、不再接收字符的 shape 不必覆写（继承的抛错桩不会被调到）；结束由终结候选判定（唯一例外是文件末尾：`SourceFileShape.Close` 对未关闭的子单元直接 `TryToClose`）。**触发结束的那个字符不能直接塞回父级队列，必须走 `Reload`**：一是 shape 不知道父级是什么结构（父级可能还有别的 shape 在等同一个字符），二是直接塞进队列不会让父级的机会重新走一遍判定、触发不了它的 `Close`；统一处理是 `Quit()` 之后由所在跳转把 `CloseStates.Built` 变成 `BranchStates.Reload`，机制把该字符重新投给宿主。**建完必须 `Reset`**：`Candidates` 重新填满，缓存清空，下一条判定从零开始。

   这一套只约束 `PossibleShapes` 里的候选；终结候选走 `EndPossible` 路径——它 `Accept` 且 `Candidates == 0` 时才 Build。

   **3.4 cache 的重要性：possible 与 build 两个阶段都要读同一份。**

   `PossibleShape.Compute` / `ComputeByIndex` **必须使用 `PossibleShapeCache`**（`cache.GetState` / `SetState`），把「已经扫到哪」记进状态（各形状自己立的具名类，如 `StringLiteralScan` 的 `Start` / `Checked`），不得每次从头上全量重扫。

   **case（微基准：同一份 `Data`，逐格调用 n 次）**

   ```text
   不用 cache：500 → 3.80ms / 1000 → 6.92ms / 2000 → 27.85ms / 4000 → 112.73ms   （n 翻倍，耗时 ×4）
   用 cache  ：500 → 0.31ms / 1000 → 0.14ms / 2000 → 0.19ms / 4000 → 0.33ms       （每次只扫新增单元）
   ```

   n=4000 时相差约 **340 倍**，曲线从二次变平。

   **原因**：目录在每个 basic token 关闭时都会被问一次（3.2），而判定的前缀随字符增长（`Data` 在一个建立周期内基本只追加，`Undo` / `Replace` 只是个别回退与换型）；每次全量重扫就是 O(N²)。`CatalogGuide.Reset` 只在建出形状之后清缓存，所以一个建立周期内 `units` 基本只追加、不做下标重排，进度字段（`Checked` / `At` / `Stage` 这类；`Start` 是下界）可以一直往前推——这是这套状态能成立的前提。候选自己要保证：窗口被截短（`Checked > tokenIndex + 1`，或 `At > tokenIndex`）时重置扫描点。

   **`BuildByIndex` 也要复用同一份 cache**：用 `catalog.PossibleShapesComputeCache.GetState` 取到的 `Start` 当扫描下界，不要在建形状时又 `ItemUtil.ItemStart` 重算一遍（缓存为 `null` 时才回退到它）——建与判必须读同一份状态。缓存按形状名分槽、一个 `CatalogGuide` 一份，`Reset` 清空；终结候选也拿到同一份 cache 参数，可以用它记自己的状态。

   **3.5 shape 转 ast node。**

   basic token 的数据必须在 **build 那一刻**就全部提取到 shape 字段上，让 shape 的信息在构建那一刻就完整；basic token 用完即**丢弃**（由 `BuildByIndex` 从 `Data` 移除，或在 `Close` 里过滤掉），`Close` 不得反向从 basic token 提取。形状 `Close` 之后 `Data` 就等价于 AST 的 children——只剩子节点形状。

   AST 节点约定由 `ParseFromShape(shape)` 从关闭后的 shape 产出：`Pos = shape.Pos`、`End = shape.SourceRange.End.Index + 1`，区间口径见第 4 条。

4. **区间口径**：shape 的 `SourceRange` 是**闭区间**（`start` / `end` 都是字符下标，含两端）；AST 节点的 `Pos` / `End` 是**左闭右开**（与 TS 一致）。shape 另有 `Pos` 字段：**含前导 trivia**（= 前一个非 trivia 单元的 `End.Index + 1`），与 TS 的 `pos` 同口径。
   换算只发生在 `ParseFromShape` 里：`Pos = shape.Pos`、`End = shape.SourceRange.End.Index + 1`。
   shape 层不得为了迁就 AST 去改自己的区间。

5. `typescript/cases/*.ts` 的用例规范：每个语句形态必须**先有一条 base**（不含任何干扰信息），
   再基于同一个 base 给出叠加干扰信息的变体（前导空格 / 前导注释 / 词间注释 / 词间多空格 /
   词间换行 / 行尾注释）。一行一个用例；行内 `\n` 由生成器还原成真实换行。
