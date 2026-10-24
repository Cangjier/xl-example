# HANDOFF — impl-wp7d-3（WP-7 D-3：body-guide-util 退役收口 + UnitToken 字段清理）

STATUS: **COMPLETE**（本文件单独一个 commit；分支 `impl-wp7d-3`，未 merge、未 push）
BASE: `impl-wp7d-2 @ d0abd7f7`（`refactor-integration @ 2c6e87bd` + D-2）
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7d-3`

## 0. 起点重建验证（d0abd7f7，未改任何文件）
`xl_build(force)` 510 written / 0 error / 1274 warning → tsc exit 0 → AST **6167/6167、0/0/0**
→ `gates.ps1 -Tier standard` **PASS 12.4 s**（tests/gates 1/8 基线已知红）。起点与 wp7d-2 §3 一致，可信。

## 1. 任务书前提的偏差（**关键，接任者必读**）

任务书写「`body-guide-util.xl.md` 已零引用 → 删除」，**实际不成立**：该文件的 5 个静态方法
仍被 5 个壳文件在运行期调用：

| 方法 | 调用方 |
|---|---|
| `IsBodyBracket` | `class-declaration-shape`、`enum-declaration-shape` |
| `MountShell` | `class-declaration-rule`、`enum-declaration-rule` |
| `FinishShell` | `class-declaration-shape`、`enum-declaration-shape`、`interface-declaration-shape` |
| `CollectBodyMembers` | `class-declaration-shape`、`enum-declaration-shape` |
| `BasePos` | 文件内部（`MountShell`） |

只有两处是死码：`MountBodyGuide`（原 `bracket.CatalogGuide = ...` 的唯一写入点）与
`CreateShapesCache`（+ 仅它用的 `BodyShapesFactory`）。因此直接删除会打断编译，不能「零引用后删」。

## 2. 实际做法（与原判据等价，且行为零变化）

1. `git mv typescript/tokens/declarations/body-guide-util.xl.md → declaration-shell-util.xl.md`，
   类 `BodyGuideUtil → DeclarationShellUtil`、类型 `BodyMembersFallback → ShellMembersFallback`。
2. 从新文件删掉 **死码**：`MountBodyGuide`（`bracket.ShapeCatalog = new ShapeCatalog(...)` 的唯一写入点）、
   `CreateShapesCache`、`BodyShapesFactory`，以及不再需要的 `ShapeCatalog` / `ShapeRule` import。
3. 5 个壳 + `items/root-item-rule`（仅注释）里的 import 路径与符号同步改名，函数体一字未动。
4. `core/syntax/unit-token.xl.md`：
   - 删 `field ShapeCatalog:ShapeCatalog | null = null` 整节 + `ShapeCatalog` import；
   - `ComputeItems` / `ComputeItemsByIndex` 保留（`IItemCompute` 契约 + `import-declaration-rule:172` 仍调
     `built.ComputeItems(context)`），实现退化为 `return ItemComputeStates.Nothing;`（字段恒 `null` 时行为完全相同）；
   - 叙述同步（「目录向导已退役」、`legacy 路径` → `没有活动批次`、`OnBracketCreatedEvent` 改为「认出 body 括号」）。

判据结果：`git grep -n 'CatalogGuide' -- '*.xl.md'` = **0**（本来已是 0，本波把**字段**也真正删了）；
`git grep -l 'BodyGuideUtil\|body-guide-util' -- '*.xl.md'` = **0**。

## 3. 任务 2：退役文件审计（逐个查引用后决定）

| 候选 | 结论 | 依据 |
|---|---|---|
| `typescript/tokens/items/member-item-util.xl.md` | **保留** | `interface-item-rule` 运行期 import `MemberItemUtil, MemberPossibleUtil` |
| `typescript/tokens/items/class-member-item-util.xl.md` | **保留** | `class-item-rule` import `ClassMemberItemUtil` 等 |
| `typescript/tokens/items/enum-member-item-util.xl.md` | **保留** | `enum-item-rule` import `EnumMemberItemUtil` |
| `typescript/tokens/item-util.xl.md` | **保留** | `ItemUtil` 被多处引用 |
| `tests/body-guide/` | 已不存在 | wp7e 已删 |
| `*possible*.xl.md` | **0** | `git ls-files '*possible*.xl.md'` = 0 |

即：body-guide 家族只剩 util 一个文件，本波已改名退役；item-util 家族全是活码，**不能删**。

## 4. 收口（干净重建）

`dist/` + `build/` 整目录删除（等效 `xl_orphans prune`：空输出目录无残留可清；改名后旧
`body-guide-util.ts` 不会再生成）→ `xl_build(force)` **510 written / 0 error / 1274 warning**
→ tsc exit 0。

| 项 | 读数 | 判定 |
|---|---|---|
| AST 全量 | **6167/6167**，结构 0 / 位置 0 / 字段 0 | 硬门 PASS |
| real-dts | 226 文件：成功 226、崩溃 0、AST 一致 226 | 硬门 PASS |
| item-oracle | 454 前缀全一致 | PASS |
| batch-split | 70 段 / 837 断言 / 0 失败 | PASS |
| stream-proof | PASS 146 / FAIL 0 | PASS |
| `gates.ps1 -Tier standard` | **RESULT: PASS**（12.7 s；tests/gates 1/8 基线已知红） | PASS |
| `gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **RESULT: PASS**（43.8 s） | PASS |
| full 的 WAIVED | buffer xml 4488/16/52err、digest 4384/120/52err；statement-scaling 同规模 1.20–1.33；class-scaling --base XML 21/21 + same-line base=throw/new=null | 与基线读数一致，WAIVED |
| `xl_check` | **510 files / 0 error / 1274 warning** | 硬门 PASS |

## 5. 最终计数

- xl 文件数：**511**（= 510 可构建 + 根级 `cjcli.xl.md`；本波改名不减数量，未删可构建文件）
- `git ls-files '*possible*.xl.md'`：**0**
- grep 五协议（`*.xl.md` 命中文件数）：`PossibleShape` 0、`ComputePossibleShapes` 0、`CatalogGuide` 0、
  `LegacyBatchAdapter` 0、`ShadowCompare` 0；另 `BodyGuideUtil` 0、`body-guide-util` 0
- `dist/ts`：511 个文件（510 个生成产物 + 1 个非 `.ts` 附属文件）；`build/ts`：510 个 `.js`

## 6. 未做 / 已知遗留（都不影响判据）

1. **docs 仍是历史叙述**：`docs/body-guide-contract.md`、`docs/Final.md`、`docs/share-cache-and-body-guide.md`
   仍指向 `body-guide-util.xl.md` / `BodyGuideUtil` / `MountBodyGuide`（WP-7 E 也选择不改 docs）。
   这些是设计史料，未动。
2. `interface-declaration-shape.xl.md:71` 的叙述仍说「才给括号初始化 `ShapeCatalog`」——**在 wp7c 就已过期**
   （代码早已不挂目录），本波未改。
3. `unit-token.xl.md` 段间有连续空行（纯格式，无影响）。
4. `tests/gates/run.mjs` 1/8 是基线已知红（依赖根级 cjcli 与已删 `dawn/**`），不在范围内。

## 7. 踩坑（新增）

1. **PowerShell 单引号字符串里的 `` `n `` 不是换行**：`-replace '\n{3,}','`n`n'` 会把三个换行换成
   字面量 `` `n``n ``，写进 `.xl.md` 后 xl_build 仍可能 0 error → 一定用 `"[char]10"` 或双引号，
   写完立刻 `grep '`n'` 自查（本波踩到并修掉）。
2. 改 `.xl.md` 一律 `[IO.File]::WriteAllText(path, text, UTF8Encoding($false))`，并在脚本里先把
   `\r\n` 归一成 `\n`；本波所有改动文件实测 `crlf=0 / bom=False`。
3. 任务书的前提（「零引用」）**必须先用 `git grep` 验**：`git grep -n 'BodyGuideUtil\|MountBodyGuide' -- '*.xl.md'`
   一秒就能否掉「直接删」，否则 `xl_build` 会因 import 缺失报错（或更糟：改一半才发现 5 个调用方）。
4. `xl_build` 的 0 error 仍然不等于能编译；每次必须跑 `tsc`。本波所有重建都跑了。
