# HANDOFF — impl-wp1（WP-1：enum body 试点）

STATUS: IN PROGRESS
BRANCH: impl-wp1 @ (待填)
BASE: refactor-integration @ 27649320

## 实现计划（先落计划，再实现；完成时本文件改为最终 HANDOFF）

1. **`typescript/tokens/items/enum-member-item-util.xl.md`（新增）**
   把 `EnumMemberPossibleUtil` 的算法逐字搬出（`TextOf / IsSeparator / IsNameToken / NextChar /
   IsCompletionBoundary / BasePos / Analyze`），删除 `CacheKey / Scan / PossibleShapeCache` 三条 possible 协议；
   `Analyze` 改为写 `core/syntax/batch/item-scan-state`，`End` 用 `CodeAt` 映射成宿主下标。
   判据口径不变：顶层逗号收口（逗号不进成员区间）、最后单元后是 `}` / EOF、**不按换行切**。

2. **`typescript/tokens/items/enum-item-rule.xl.md`（新增）**
   - `EnumItemRule implements ItemRule`：`Classify`（跳过前导分隔符后是名字族 → Member）、
     `Extend`（无增量状态，收口判据由 `Analyze` 一次算）、`Analyze` → util、`Build`（逐字复用
     `EnumDeclarationShape.BuildMember`，`catch` → `null` 走 raw 回退）、`IncludesSeparator = false`。
   - `EnumBodyItemHost implements IBatchHost`：包 `ItemListEngine(EnumItemRule)` + `RawFallback`；
     `OnBasicTokens → Engine.Feed`、`CloseBatch → Engine.Flush`。挂在 `Bracket.BatchAdapter`（core 契约未改）。

3. **`typescript/tokens/declarations/enum-declaration-shape.xl.md`**
   - `OnBracketCreatedEvent`：`MountBodyGuide` + 壳 `CatalogGuide` → `body.BatchAdapter = new EnumBodyItemHost(...)`；
     规则表缓存 `CreateBodyItemRulesCache` / `CreateBodyItemRules` 替代 `CreateBodyPossibleShapes*`。
   - 新增 `OnBasicTokenClosed`/`FinishBody`：枚举体括号闭合 → `FlushBatch`（建掉最后一条成员）→
     `BuildFromCode` → `BodyGuideUtil.FinishShell`。取代 `EnumDeclarationEndPossibleShape`。

4. **删除** `typescript/tokens/members/enum-member-possible-shape.xl.md`、
   `typescript/tokens/declarations/enum-declaration-end-possible-shape.xl.md`。

5. **`core/syntax/syntax-context.xl.md`**：`BatchMode` 默认值 `0 → 1`。
   理由：WP-0 的 `UnitToken.OnBasicTokenClosed` 在 `BatchMode===0` 时直接短路走 legacy，
   引擎永远不会被喂；默认改 1 后**只有挂了适配器的宿主**（WP-1 仅枚举体括号）走批次路径，
   其余宿主 `BatchAdapter === null` 仍逐字走旧路径（行为不变，由 AST/XML 门禁证明）。
   这是 WP-0 写范围外的一行改动，已在报告里向 Lead 说明。

6. **`tests/body-guide/harness.mjs`**：只改 enum 候选表条目（`cacheField` + `candidates`），
   否则删除 possible 模块后 `--target=enum` 的候选加载会 `Cannot find module`。

## 兼容约束（Lead 批准 / PLAN 冲突时的保留项）

- `body-guide-util.xl.md` 的 `MountBodyGuide` / `CreateShapesCache` **保留**（interface/class 仍在用，WP-4/5 才迁移）。
  与 PLAN §6.3 WP-1 卡片「body-guide-util 删 MountBodyGuide/CreateShapesCache」冲突，按 Lead 指令保留并在最终报告说明。
- `enum-declaration-possible-shape.xl.md`（语句位置壳）**保留**：它属于 WP-2/WP-3 的语句/根级 possible 层。
