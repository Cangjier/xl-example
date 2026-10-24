# HANDOFF — impl-wp3-27（WP-3 第二十七波：六条 EOF 尾巴 `;`，修好 5 条）

STATUS: **PARTIAL / 净正（AST +5）**。**6151 → 6156 / 6167**（结构差 16→**11**、位置差 9→**5**、字段差 0、cj-fail 0）。
六条里 **#20 / #22 / #33 / #37 / #126 全绿**，只剩 **#81**。
real-dts 226/226；quick PASS、standard PASS；xl_build 0 error；body-guide `--target=all --all` 全绿。

BRANCH: impl-wp3-27
BASE: impl-wp3-26 @ e484393f（无源码改动）

## 0. 打点结论（wp3-26 §3 要求的那次测量，本波做完了）

打点方式：在 `.xl.md` 里临时加 `console.error("@@…")`，xl_build + tsc，再用自写的 `.probe.mjs`
（`SourceFileRunner.Parse` + `cjAst`，逐条只跑一个用例）看调用序列；**跑完全部用 `git checkout --` 回滚**。

测得的事实（`import x from "m"` ⏎ `a;` 为例，host Data 已 dump）：

1. **`BuildByIndex` / ASI 分支根本没被调用**（`@@BYIDX`/`@@ASI` 一条都没打出来）——尾巴整片由
   `ItemRule.Analyze`（root-item-rule）收口给引擎，`SourceFileTailBuilder` 只在 EOF 兜底。
2. **`;` 在尾巴 builder 之前就已经是形状了**：`BuildTrailingItems` 入口的 `host.Data` 是
   `[…, a(18,19), EmptyStatementShape(19,20)]` —— 也就是说 `;` 已经被**单独 item 建成了
   `EmptyStatementShape`**。这解释了 wp3-26 的实验为何零影响：它的判据是
   `host.Data[semiAt] instanceof Symbol && Is(";")`，而那一格早已不是 `Symbol`。
3. **`;` 单独成 item 的机制**：itemizer 在 `Alive.size === 0` 的分支里走到「收口到上一格」
   （`state.End = codeAt[at-1]`），于是尾巴 item 停在 `a`，`;` 成为下一条 item——而
   `StatementItemScan.Decide` 对首格 `;` 直接 `Complete(0)`（→ `BuildEmpty` → `EmptyStatement`）。
4. **#33/#37 的真实落点不是尾巴**：它们由 `statement-builder.BuildTypeAliasDeclaration` 建，
   那里「ASI 边界」判据排在「`;`」判据**前面**，于是 `A | B // c` ⏎ `;` 在注释处先按 ASI 收口
   （end = `B`），`;` 被留下当 EmptyStatement。TS 的 `parseSemicolon` **不看换行**，`;` 属于声明。
5. **#81 仍未修**：`import x from "m"` ⏎ `type T = A;` 的 itemizer 把 `type T =` 整段 raw、
   `A` 单独建成 `ExpressionStatement`（`@@BLD start=14 end=15 pending=ExpressionStatement@27,29`），
   不是 `;` 归属问题，而是 `type` 起头的 item 在 `=` 后断段（`KindOf` 没落到 8/`type alias`）。
   下一波应从 `root-item-rule.KindOf` 对 `type`（`import` 之后第二行）的分派查起。

## 1. 源码改动（2 个文件，2 处）

### 1.1 `typescript/tokens/statements/statement-builder.xl.md`（#33 / #37）

`BuildTypeAliasDeclaration` 的扫描循环里，把 `;` 判据**提到 ASI 边界判据之前**：

```ts
for (let at = first; at < this.Units.length; at++) {
  const unit = this.Units[at];
  if (unit.IsTriviaToken) { continue; }
  if (this.IsSymbol(unit, ";")) { end = at; break; }   // ← 新增在前
  if (at > first && seenEqual && lastCode >= first && …IsAsiBoundary(…)) { end = lastCode; break; }
  if (this.IsSymbol(unit, "=")) { seenEqual = true; }
  lastCode = at;
}
```

效果：`type T = A | B // c` ⏎ `;` → `TypeAliasDeclaration[0,21]`（ts 同值）；#37 同理 `[0,26]`。

### 1.2 `typescript/tokens/items/root-item-rule.xl.md`（#20 / #22 / #126）

`Analyze` 的「收口到上一格」raw 收口处，`code[at]` 是 `;` 时把这一格**留在本条**：

```ts
if (at > 0) {
  state.Complete = true;
  state.End = this.IsSymbolAt(code, at, ";") ? state.CodeAt[at] : state.CodeAt[at - 1];
  this.Winner = -1;
  this.Watermark = at;
  return;
}
```

于是尾巴 raw 区间含 `;`，EOF 的 `BuildStatementSegments` 分段建时 `;` 就是语句右界：
`a;` → `ExpressionStatement[17,20]`、`import type from 'n';` → `ImportDeclaration[20,42]`。

**没动**：`BuildTrailingItems` 的 `at+1` 扩展（wp3-26 已证伪，本波复核同样无效——`;` 已是形状），
`ImportDeclarationShape` / `TypeAliasDeclarationShape` 的 `FromUnits` End（实测输入里根本没有 `;`）。

## 2. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | core+typescript（增量：2 个改动文件） | 0 error | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0 | PASS |
| ast-json 全量 | `ast-json.mjs` | 6167/6167 cj-ok、cj-fail 0 | PASS |
| ast-json-diff 全量 | 先 ast-json 再 diff | **6156 / 6167**；结构 **11** / 位置 **5** / 字段 0 | **+5** |
| 四构造过滤 | `ast-json-diff end-import-export dts-types end-build possible-compute` | 603 / 605（余 #81、#25） | 与全量一致 |
| real-dts | `real-dts-ast.mjs` | 226：成功 226、崩溃 0、一致 226 | PASS |
| body-guide | `--target=all --all` | interface 35/35、class 54/54、enum、util 全绿 | PASS |
| quick | `..\tools\gates.ps1 -Tier quick` | **PASS** 5.8s | PASS |
| standard | `..\tools\gates.ps1 -Tier standard` | **PASS** 10.9s（tests/gates 1/8 = 基线 KNOWN-RED） | PASS |

## 3. 未完成项

- **#81**（`import x from "m"` ⏎ `type T = A;`）：itemizer 在 `=` 后断段，`A` 被建成 ExpressionStatement；
  落点见 §0.5。不在本波的两个判据里。
- buffer / 全量 xl_check 本波**未跑**（轮次超支，收尾时只跑了 ast-json / real-dts / quick / standard）。
- 其余 I 类（模板标签 #13/#15/#61、yield #169/#171/#179、`class<T>` #14/#15、interface #25、#86 BOM）
  未动（其中 #14/#15/#25 属并行成员 impl-wp3-28 的区域）。

## 4. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-28-2 -From impl-wp3-27 -Base impl-wp3-27
cd impl-wp3-28-2
# xl_build(cwd="…\impl-wp3-28-2", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
# #81：给 root-item-rule.KindOf / BuildByKind 打点，看 `import x from "m"` ⏎ `type T = A;` 的
#      item 为什么在 `=` 后断成 raw + ExpressionStatement(A)
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs; git checkout -- typescript/cases
```

## 5. 阻塞点

无。xl_build / tsc / 各门禁全部可用。

## 6. 踩过的坑

1. **打点不要用 PowerShell 改 `dist/**.ts`**（wp3-26 的坑）。本波的做法：在 `.xl.md` 里加
   `console.error("@@…")` → xl_build → tsc → 自写 `.probe.mjs` 只跑单条用例 → **`git checkout --` 三个
   `.xl.md` 回滚** → 再 xl_build 那两个文件（**不重建 dist 会把打点留在产物里**，本波踩到一次：
   quick 门禁的输出里还能看到 `@@BTI`）。
2. `.probe.mjs` 用 `SourceFileRunner.Parse(src,"case.ts")` + `typescript/cases/ast-compare.mjs` 的 `cjAst`，
   比跑全量 6167 条快两个数量级；调试六条尾巴只需几秒。
3. `git checkout -- typescript/cases` 必须在**读 diff 之后**做；committed 快照是全绿的，直接
   diff 会得到假绿（本波复现过：605/605 全绿其实是快照，重跑 ast-json 后才是 603/605）。
4. `.xl.md` 里新增注释如果同一行既有 `//` 又有代码，xl 生成时会把换行吃掉（`if` 被注释吞掉）。
   多行注释块与 `if` 之间务必留空行/单独成行。
