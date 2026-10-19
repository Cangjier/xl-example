# IMPORTANCE

1. 本文档只能由用户编辑——AI 与其它工具不得改动。**AI 只有在用户消息明确要求修改本文档时才能改，且只改被要求的那一条。**

2. `typescript/tokens/` 下的 `*.xl.md`：禁止散文

   **散文 = 代码围栏之外、标题之外的说明文字**；```txt``` 围栏内的示例与中文注释不算散文。

3. **token / shape / astnode 开发流程规范**：一个语法形态按下面五个阶段开发，顺序固定

   3.1 字符由 basic token 承接

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

   3.2 basic token close 时触发父级 ComputePossibleShapes，从而尝试构建Shape。

   3.3 compute possible：候选 possible 与终结 possible

   `CatalogGuide` 里有两份东西：`PossibleShapes`（普通候选，可能长成目标形状）和一个单独的 `EndPossible`（终结候选，只回答「这条语句到这里该结束了」）。每次判定 `ComputePossibleShapesByIndex(host, tokenIndex, context)` 按下面的顺序走（即 `CatalogGuide` 的实现）：

   - **形参校验**：`context` 没由形参传进来就直接抛错——消息会经由它挂进上下文，漏了会静默丢掉，宁可当场炸。
   - **越界**：`host.Data[tokenIndex]` 不存在 → 返回 `Nothing`（调用方可能按旧长度遍历）。
   - **淘汰**：逐个还活着的候选调 `ComputeByIndex`；`Reject` 从 `Candidates` 里去掉（`PossibleShapes` 数组禁止修改），`Accept` 与 `Uncertain` 在这一次判定里同义——都只表示「还活着」。这一步只淘汰，不定案。
   - **终结候选 Accept**：`EndPossible` 非空且判出 `Accept` 时
      - `Candidates == 0` 就调它的 `BuildByIndex` 结束（签出宿主 `SignOut` → `TryToClose()` → `Quit()`），`Reset` 后返回 `Built`；
      - `Candidates > 0` 则**抛错**（既像结束、又像还能长）。
   - **零候选且不结束**：`EndPossible` 为 `null` 时则进行 **抛错**（没有候选形状可以构成）；不为 `null` 则返回 `Waiting`，继续等（有终结候选时不因 0 候选抛错）。
   - **多候选**：`Candidates.size > 1` → 返回 `Waiting`。
   - **唯一候选**：先过 `IsBuildable`（只在恰好剩一个候选时问；默认 `true`，候选可以声明「还缺后续单元」，例如 `ImportDeclarationPossibleShape` 要等 `Stage` 走出 0）——`false` 就返回 `Waiting`；`true` 就 `BuildByIndex` 建它，`Reset`，返回 `Built`。

   建出来的形状有两种去向。
   - **立即关闭** ：静态工厂里签范围、取字段、`TryToClose()`，如 `StringLiteralShape`（`FromBasicToken`）与 `ImportAttributesShape`（`FromBracket`）（`IdentifierShape` 这类更内层的子形状由外层工厂直接造，不是候选 `BuildByIndex` 的结果）；
   - **未关闭 + 挂载**：`host.MountedUnit = shape`，既不 `SignOut` 也不 `TryToClose`，如 `ImportDeclarationShape`，后续字符继续流进它，直到终结候选在「单元到齐」时签名并关闭。
   
   需要注意的是：
   - shape **禁止用 `ExitOrPre` 结束自己**，禁止覆盖`ExitOrPre`。
   - shape 禁止覆盖 ComputePossibleShapes
   - 被真实消费的baisc tokens一律丢弃，对未真实消费的basic tokens一律走`Reload Message`。basic tokens要么丢弃，要么Reload，禁止其他操作。

   3.4 cache 的重要性：possible 与 build 两个阶段都要读同一份。

   `PossibleShape.Compute` / `ComputeByIndex` **必须使用 `PossibleShapeCache`**（`cache.GetState` / `SetState`），把「已经扫到哪」记进状态（各形状自己立的具名类，如 `StringLiteralScan` 的 `Start` / `Checked`），禁止每次从头上全量重扫。

   **`BuildByIndex` 也要复用同一份 cache**：用 `catalog.PossibleShapesComputeCache.GetState` 取到的 `Start` 当扫描下界，不要在建形状时又 `ItemUtil.ItemStart` 重算一遍（缓存为 `null` 时才回退到它）——建与判必须读同一份状态。缓存按形状名分槽、一个 `CatalogGuide` 一份，`Reset` 清空；终结候选也拿到同一份 cache 参数，可以用它记自己的状态。

   **case（微基准：同一份 `Data`，逐格调用 n 次）**

   ```text
   不用 cache：500 → 3.80ms / 1000 → 6.92ms / 2000 → 27.85ms / 4000 → 112.73ms   （n 翻倍，耗时 ×4）
   用 cache  ：500 → 0.31ms / 1000 → 0.14ms / 2000 → 0.19ms / 4000 → 0.33ms       （每次只扫新增单元）
   ```

   n=4000 时相差约 **340 倍**，曲线从二次变平。

   3.5 shape 转 ast node

   - basic token 的数据必须在 **build 那一刻**就全部提取到 shape 字段上；basic token 用完即**丢弃**（由 `BuildByIndex` 从 `Data` 移除，或在 `Close` 里过滤掉）。
   - 形状 `Close` 之后 `Data` 就等价于 AST 的 children——只剩子节点形状。
   - AST 节点约定由 `ParseFromShape(shape)` 从关闭后的 shape 产出。
   - 区间口径见第 4 条。

4. **区间口径**
   - shape 的 `SourceRange` 是**闭区间**（`start` / `end` 都是字符下标，含两端）；
   - AST 节点的 `Pos` / `End` 是**左闭右开**（与 TS 一致）。
   - shape 另有 `Pos` 字段：**含前导 trivia**（= 前一个非 trivia 单元的 `End.Index + 1`），与 TS 的 `pos` 同口径。
   换算只发生在 `ParseFromShape` 里：`Pos = shape.Pos`、`End = shape.SourceRange.End.Index + 1`。
   shape 层不得为了迁就 AST 去改自己的区间。

5. `typescript/cases/*.ts` 的用例规范：每个语句形态必须**先有一条 base**（不含任何干扰信息），
   再基于同一个 base 给出叠加干扰信息的变体（前导空格 / 前导注释 / 词间注释 / 词间多空格 /
   词间换行 / 行尾注释）。一行一个用例；行内 `\n` 由生成器还原成真实换行。

6. shape 问题分类
   - 缺少possible
   - 缺少end
   - possible compute不对
   - end 不对
