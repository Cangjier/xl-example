# HANDOFF — impl-wp7c-3（WP-7 C/D 组第三波，只做 2 个壳）

STATUS: **COMPLETE** —— export-declaration-shape / import-declaration-shape 两壳已切、各一个 commit、两段全绿
BRANCH: `impl-wp7c-3`
BASE: `impl-wp7c-2 @ 410f8654`（= `impl-wp7c-1 @ 153e0ff7` 代码 + HANDOFF）
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7c-3`
未 merge、未 push。

## 0. 起点重建验证（本轮第一步，实测）

清 `dist`/`build` → `xl_build(force)` 520 written / 0 error → `tsc` exit 0 / 520 js
→ `gates.ps1 -Tier standard` **PASS**：AST 6167/6167 0/0/0、real-dts 226/226、item-oracle 454、batch-split 70/837/0、stream-proof 146/0。
（与 `HANDOFF.wp7c-2.md` §0 的「必须自己验一次」一致，基线确认绿后才动手。）

## 1. 做了什么（两壳，各一 commit）

### commit `baa802aa` — export-declaration-shape

`typescript/tokens/declarations/export-declaration-shape.xl.md`：
- 删构造器里的 `this.CatalogGuide = new CatalogGuide(ExportDeclarationShape.CreatePossibleShapes(), new ExportDeclarationEndPossibleShape());`（构造器只剩 `super(template);`）
- 删 `private static CreatePossibleShapesCache` 字段 + `static CreatePossibleShapes()`
- 删 6 行随之零引用的 import：`CatalogGuide`、`PossibleShape`、`ExportDeclarationEndPossibleShape`、`ImportAttributesPossibleShape`、`NamedExportsPossibleShape`、`NamespaceExportPossibleShape`、`StringLiteralPossibleShape`
- **删除 3 个 possible 文件**（删后全仓 `*.xl.md` 非注释、非自身文件命中 = 0，逐类名验证）：
  - `declarations/export-declaration-end-possible-shape.xl.md`
  - `declarations/named-exports-possible-shape.xl.md`
  - `declarations/namespace-export-possible-shape.xl.md`
- 手工删对应 `dist/ts/**.ts` 与 `build/ts/**.js` 残留（xl_build 不删已删源文件的产物）

### commit `e680455b` — import-declaration-shape

`typescript/tokens/declarations/import-declaration-shape.xl.md`：同上四步——
- 删构造器 CatalogGuide 行（只剩 `super(template);`）、删 `CreatePossibleShapesCache` + `CreatePossibleShapes()`
- 删 5 行 import：`CatalogGuide`、`PossibleShape`、`ImportDeclarationEndPossibleShape`、`ImportAttributesPossibleShape`、`StringLiteralPossibleShape`
- **保留** `ImportClausePossibleShape` 的 import：壳体 `IsTypePhaseModifier(code[index])` 仍在用它
- **删除 3 个 possible 文件**：
  - `declarations/import-declaration-end-possible-shape.xl.md`
  - `declarations/import-attributes-possible-shape.xl.md`
  - `literals/string-literal-possible-shape.xl.md`

## 2. 门禁读数（每壳 commit 前实测，清 dist 后 force 重建）

| 项 | baa802aa（第 1 壳后） | e680455b（第 2 壳后） | 判定 |
|---|---|---|---|
| `xl_build` force | 517 written / 0 error | 514 written / 0 error | PASS |
| `tsc` | exit 0 | exit 0 | PASS |
| AST 全量 | **6167/6167；结构 0 / 位置 0 / 字段 0** | **6167/6167；0 / 0 / 0** | PASS |
| real-dts | **226/226，崩溃 0** | **226/226，崩溃 0** | PASS |
| item-oracle | 454 前缀 | 454 前缀 | PASS |
| batch-split | 70 段 / 837 断言 / 0 失败 | 70 / 837 / 0 | PASS |
| stream-proof | 146 / 0 | 146 / 0 | PASS |
| `gates.ps1 -Tier standard` | **RESULT: PASS** | **RESULT: PASS** | PASS |

收口读数（`e680455b`）：
- `git ls-files '*possible*.xl.md'` = **30 → 24**（本轮删 6）
- `git ls-files '*.xl.md'` = **515**（起点 521，减 6）
- `git grep -lE 'PossibleShape|ComputePossibleShapes|CatalogGuide|LegacyBatchAdapter|ShadowCompare' -- '*.xl.md'` = **61 个文件**（wp7c-2 记 67）
- `git grep -l 'CatalogGuide' -- '*.xl.md'` = **47 个文件**，其中 `export-declaration-shape` / `import-declaration-shape` 只剩文档注释里的「不依赖 BuildByIndex / MountShell / CatalogGuide」这句话（不是代码引用）

## 3. 决定性发现（对下一棒最有用）

1. **两个壳的 `CatalogGuide` 是「挂壳路径」的残留，不是根路径在用。**
   `root-item-rule.BuildByKind` 对 export/import 声明走 `ExportDeclarationShape.FromUnits` / `ImportDeclarationShape.FromUnits`（直接建），
   只有 `ExportDeclarationPossibleShape.BuildByIndex` kind 0 会 `host.MountedUnit = built0`（`export-declaration-possible-shape.xl.md:592`），
   而 root 的新 `Analyze` 循环只调 `ComputeByIndex`（判据）+ `BuildByKind`（建造），**从不调 `CatalogGuide.Build`/`BuildByIndex`**。
   → 所以把壳的 CatalogGuide 摘掉，对 6167 + 226 是**行为中性**的（实测两段全绿）。这解释了为什么 `HANDOFF.wp7c-2.md` 说的「接线题」成立。
2. **`BuildDirect` 至今仍未被 root 采用**（`root-item-rule.xl.md:1095` 留着实测记录：切 BuildDirect 红 254 条）。
   本轮**没有**去动 root 的 kind 2/kind 1 分支（在写范围之外），壳只是不再挂 CatalogGuide。
   → 「用 BuildDirect 接线替换」这件事在本轮的口径是：**壳不再给子单元配向导，建造全部落到 `FromUnits`/`FromCode`/`BuildDirect` 三个直接入口**；root 侧换不换入口是 D-1 的事。
3. **`import-clause-possible-shape` 不能随 import-declaration 壳一起删**：壳体的
   `ImportClausePossibleShape.IsTypePhaseModifier(...)` 是活引用。下一棒切 `import-clause-shape` 时要先决定这个静态助手搬去哪。
4. `string-literal-possible-shape` / `import-attributes-possible-shape` 只被这两个壳的 `CreatePossibleShapes()` 引用，
   两壳都切掉后即零引用 → 本轮一并删除（这属于任务书的「子句 possible 零引用后删」）。

## 4. 未完成项（下一棒的精确入口）

- **③ `import-clause-shape`**（`import-clause-shape.xl.md:37` 的 `new CatalogGuide([NamedImportsPossibleShape, NamespaceImportPossibleShape], new ImportClauseEndPossibleShape())`）：
  前置已由 `HANDOFF.wp7c-2.md` §1.1 说清——`NamedImportsShape.FromBracket` 第一路已经是 `ClauseItemDrive.Drive`，
  要动的是「判何时调 FromBracket」的判据侧。切完可删 `named-imports-possible-shape` / `namespace-import-possible-shape` /
  `import-clause-end-possible-shape`（三者届时零引用），`import-clause-possible-shape` 需先处理 `IsTypePhaseModifier` 的归属。
- **D-1**：根 `items/root-item-rule.xl.md` 仍是 `Guide: CatalogGuide` + 逐候选 `ComputeByIndex`，14 个声明级 possible 仍吊在这条链上。
- **D-2**：core 5 个协议文件 + `UnitToken.CatalogGuide` 字段 + `token.xl.md:128-130` 兜底 + 9 个 basic token 的两行 import + `BatchMode` 0/2 + `LegacyBatchAdapter`/`ShadowCompare`。
- 白名单 3 个 `class-*` possible 未动（按任务书保留）。

## 5. 下一棒的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp7c-4 -From impl-wp7c-3 -Base impl-wp7c-3
cd impl-wp7c-4
# 第一步重建验证（必须自己做，别信本文件读数）：
#   删掉 dist\ build\ -> xl_build(cwd=..., paths=["core","typescript"], targets=["ts"], out="dist", force)
#   node .\node_modules\typescript\bin\tsc -p tsconfig.json
#   ..\tools\gates.ps1 -Tier standard           # 期望 PASS / 6167 / 226
# 然后：改 import-clause-shape -> xl_build -> tsc -> ast-json-diff -> real-dts -> gates standard -> commit
```

## 6. 踩过的坑（本轮新增，务必先读）

1. **`.xl.md` 绝不能用 PowerShell 的 `[IO.File]::ReadAllText/WriteAllText` + 相对路径**：
   PowerShell 的 `cd` 只改「位置」，**不改进程当前目录**，.NET 的相对路径按**进程 CWD（= 会话工作目录，即源仓库 `xl-example`）**解析。
   本轮因此**误写了只读源仓库**的 `typescript/tokens/declarations/export-declaration-shape.xl.md`，
   已立即 `git -C C:\Users\Admin\Documents\GitHub\xl-example checkout -- <该文件>` 还原，复核 **`worktree clean`、HEAD 仍 `3eb86b72`**（源仓库未留下任何改动）。
   → 正确做法：**只用 `edit`/`write` 工具改 `*.xl.md`**；若必须用 pwsh，用**绝对路径**并 `[IO.File]::WriteAllText($abs,$t,[Text.UTF8Encoding]::new($false))` + `-replace "\r\n","`n"`。
2. **删了 possible 源文件后忘记删 `build/ts` 产物会假绿**：本轮两次都先删 `dist/ts/**.ts` + `build/ts/**.js` 再 force 构建。
3. **`tsc` 失败时 `ast-json` 仍可能 PASS、`real-dts` 才报红**（第一版 import 壳漏了 `ImportClausePossibleShape` 的 import，tsc exit=2，
   build/ts 里留下未解析符号 → real-dts 3 个文件 structural 差）。**看到 real-dts 红先查 tsc exit code**。
4. 判死引用要按类名 + 排除注释行 + 排除自身文件：`git grep -n "\b$cls\b" -- '*.xl.md' | ? { $_ -notmatch ':\s*//' -and $_ -notmatch "<自身文件名>" }`。
5. `xl_build` 输出 17–18 万字节，一条 pwsh 里只 `Select-Object -Last N` 或 `Select-String`。
