# IMPORTANCE

1. 本文档只能由用户编辑——AI 与其它工具不得改动。**AI 只有在用户消息明确要求修改本文档时才能改，且只改被要求的那一条。**

2. `typescript/tokens/` 下的 `*.xl.md`：禁止散文

   **散文 = 代码围栏之外、标题之外的说明文字**；```txt``` 围栏内的示例与中文注释不算散文。

3. basic token 构建 shape 时：把 shape 需要的数据**全部提取到字段上**，让 shape 的信息在构建那一刻就完整；basic token 用完即**丢弃**，不得留给 `Close` 反向提取。

   `Data` 是**未定型期间的暂存**：形状还没确定时，里面会存在 basic token；形状 `Close` 时，`Data` 就等价于 AST 的 children——只剩子节点形状。

   做法：shape 提供 `FromBasicToken(basicToken)` 之类的入口，在入口里签范围、取字段、关闭；候选形状的 `BuildByIndex` 调它，然后丢掉 token。

4. `PossibleShape.Compute` / `ComputeByIndex` **必须使用 `PossibleShapeCache`**（`cache.GetState` / `SetState`），把「已经扫到哪」记进状态，不得每次从头上全量重扫。

   **case（微基准：同一份 `Data`，逐格调用 n 次）**

   ```text
   不用 cache：500 → 3.80ms / 1000 → 6.92ms / 2000 → 27.85ms / 4000 → 112.73ms   （n 翻倍，耗时 ×4）
   用 cache  ：500 → 0.31ms / 1000 → 0.14ms / 2000 → 0.19ms / 4000 → 0.33ms       （每次只扫新增单元）
   ```

   n=4000 时相差约 **340 倍**，曲线从二次变平。

   **`BuildByIndex` 也要复用同一份 cache**：用 `catalog.PossibleShapesComputeCache.GetState` 取到的
   `Start` 当扫描下界，不要在建形状时又 `ItemUtil.ItemStart` 重算一遍——建与判必须读同一份状态。

   **原因**：目录在每个 basic token 关闭时都会被问一次，而 `Data` 在一条语句内只增不减；每次全量重扫就是 O(N²)。`CatalogGuide.Reset` 只在建出形状之后清缓存，所以一个建立周期内 `units` 只追加、不重排，扫描点（`Checked` / `Start`）可以一直往前推——这是这套状态能成立的前提。候选自己要保证：窗口被截短（`Checked > tokenIndex + 1`）时重置扫描点。

5. **区间口径**：shape 的 `SourceRange` 是**闭区间**（`start` / `end` 都是字符下标，含两端）；AST 节点的 `Pos` / `End` 是**左闭右开**（与 TS 一致）。shape 另有 `Pos` 字段：**含前导 trivia**（= 前一个非 trivia 单元的 `End.Index + 1`），与 TS 的 `pos` 同口径。
   换算只发生在 `ParseFromShape` 里：`Pos = shape.Pos`、`End = shape.SourceRange.End.Index + 1`。
   shape 层不得为了迁就 AST 去改自己的区间。

6. `typescript/cases/*.ts` 的用例规范：每个语句形态必须**先有一条 base**（不含任何干扰信息），
   再基于同一个 base 给出叠加干扰信息的变体（前导空格 / 前导注释 / 词间注释 / 词间多空格 /
   词间换行 / 行尾注释）。一行一个用例；行内 `\n` 由生成器还原成真实换行。

7. shape **禁止用 `ExitOrPre` 结束自己**：`ExitOrPre` 只归 basic token（它认的是字符）。shape 的结束必须由**一个辅助 possible（终结候选）**通过 `CatalogGuide` 判定——候选 Accept 时，它的 `BuildByIndex` 给宿主签名、`TryToClose()`。shape 里的 `ExitOrPre` 只允许 `return BranchStates.Undo`。

   原因：`Source.Value` 是**单个字符**，shape 层拿它去比对一个多字符关键字永远是错的；而「结束」本质上是「哪些单元已经到齐」，那是候选的职责。

   终结候选**不是普通候选**：它放在 `CatalogGuide.EndPossible`（可为 `null`）里单独一份，**不进 `PossibleShapes`、不参与 `Candidates` 的淘汰**。目录每次判定都问它一次：

   - 它 `Accept` 且 `Candidates == 0` → 建它（结束）；
   - 它 `Accept` 且 `Candidates > 0` → **抛错**（既像结束、又像还能长）；
   - 它不 `Accept` 且 `Candidates == 0` → 允许，继续等（有终结候选时不因 0 候选抛错）。

   **触发结束的那个字符不能直接塞回父级队列，必须走 `Reload`。** 两条理由：
   一是 shape 不知道父级是什么结构（父级可能还有别的 shape 在等同一个字符）；
   二是直接塞进队列不会让父级的机会重新走一遍判定，触发不了它的 `Close`。
   统一处理：`Quit()` 之后返回 `BranchStates.Reload`，由机制把该字符重新投给宿主。

8. 候选判出唯一目标，就已经确定了「建的是哪个形状」：`Build` 之后若它还没结束，形状以**「未关闭 + 挂载」**的状态存在——`host.MountedUnit = shape`，既不 `SignOut` 也不 `TryToClose`。后续字符继续流进它，直到**终结候选**在「单元到齐」时签名并关闭。

   所以「只剩一个候选」不是提前构建，而是一次正确的选择。构建得早不早，看的是形状建完之后**是关掉还是挂上**。

   这条只约束 `PossibleShapes` 里的候选；终结候选走第 7 条的 `EndPossible` 路径：它 `Accept` 且 `Candidates == 0` 时才 Build。
