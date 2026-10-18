# IMPORTANCE

1. 本文档只能由用户编辑——AI 与其它工具不得改动。

2. `typescript/tokens/` 下的 `*.xl.md`：禁止散文

3. basic token 构建 shape 时：把 shape 需要的数据**全部提取到字段上**，让 shape 的信息在构建那一刻就完整；basic token 用完即**丢弃**——不得把它挂进 shape 的 `Data` 留给 `Close` 再反向提取。

   `Data` 只承载**子节点形状**（与 AST 的 children 对齐）；词法 token 不是节点，不进 `Data`。
   做法：shape 提供 `FromBasicToken(basicToken)` 之类的入口，在入口里签范围、取字段、关闭；候选形状的
   `BuildByIndex` 调它，然后丢掉 token。

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

5. **区间口径**：shape 的 `SourceRange` 是**闭区间**（`start` / `end` 都是字符下标，含两端）；AST 节点的 `Pos` / `End` 是**左闭右开**（与 TS 一致）。换算只发生在 `ParseFromShape` 里：`Pos = shape.SourceRange.Start.Index`、`End = shape.SourceRange.End.Index + 1`。shape 层不得为了迁就 AST 去改自己的区间。

6. `typescript/cases/*.ts` 的用例规范：每个语句形态必须**先有一条 base**（不含任何干扰信息），
   再基于同一个 base 给出叠加干扰信息的变体（前导空格 / 前导注释 / 词间注释 / 词间多空格 /
   词间换行 / 行尾注释）。一行一个用例；行内 `\n` 由生成器还原成真实换行。
