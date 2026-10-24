# HANDOFF — impl-wp3-30（WP-3 第三十波：#25 修好，AST 6161→6162）

STATUS: **PARTIAL / 净正（AST +1）**。6161 → **6162 / 6167**（结构差 6→5、位置差 5→4、字段差 0、cj-fail 0）。
本波只修 **#25（interface extends 一次性 FromUnits）**；**#81** 本波做了唯一一次实验并证伪（见 §3.1），
**模板标签 #13/#15/#61** 未动（wp3-29 已证伪三条 root 收口路径，落点仍未确认）。

BRANCH: impl-wp3-30
BASE: impl-wp3-29 @ a0cf03b7

## 0. 读数（本分支实测，2026-10-24）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| 起点复现 | xl_build(全量) + tsc + ast-json + diff | 6161/6167；结构 6 / 位置 5 / 字段 0；cj-fail 0 | 与 wp3-29 逐项相同 |
| 本波终值 | 同上 | **6162/6167**；结构 **5** / 位置 **4** / 字段 0；cj-fail 0（6167/6167） | +1 |
| real-dts | `real-dts-ast.mjs` | 226 成功 / 226 一致 / 崩溃 0 | PASS |
| quick / standard | `gates.ps1 -Tier quick/standard` | PASS | PASS |
| full | `gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | 41.7s；real-dts PASS、parse-perf PASS、class-scaling(measure) PASS；**2 项红**：buffer-equivalence、class-scaling --base | AST 硬门 PASS |
| buffer（base=baseline-build） | 同上 | xml **PASS 4489 / FAIL 15 / ERROR 52**；digest **PASS 4385 / FAIL 119 / ERROR 52** | 比 wp3-29（4488/16/52、4384/120）**各 +1 PASS**，不倒退 |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |

剩余 5 条结构差（位置差 4）：**#86、#81、#13、#15、#61**（#25 已消）。

## 1. 源码改动（1 个文件，1 处）

### `typescript/tokens/declarations/interface-declaration-shape.xl.md` — `BuildFromCode`（#25）

`interface I5 extends { a: 1 } { }`：item 边界停在 heritage 的类型字面量 `{ a: 1 }` 上（`InterfaceDeclaration[0,29]`），
一次性路径 `FromUnits` 于是把 `code` 的最后一格当成接口体：
`heritageUnits = [extends]`（HeritageClause **无 children**）、body = `{ a: 1 }`（PropertySignature + LiteralType），
尾部真正的 `{ }` 掉成顶层 `Block[29,33]`。

修法：`BuildFromCode` 在算出 `bodyUnit` 之后，若 `code[code.length-2]` 是 `extends` / `implements` / `,`，
说明最后一格是 **heritage 里的类型字面量**（与壳的 `IsDefinitelyBodyBracket` 同一条判据），直接 `throw`。
于是 item 层 `Alive` 全灭的 ① 路径（不含这一格建）返回 `null`，落到 ② 路径（含这一格建）：
`code = [interface, I5, extends, {a:1}, { }]` → heritage 用 `ExpressionBuilder` 读成
`ObjectLiteralExpression` + `PropertyAssignment`（正是 TS 的形状），body = `{ }`，`InterfaceDeclaration[0,33]`，
顶层不再有 `Block`。**正向 +1，无回退**（buffer 也 +1 PASS）。

## 2. 未完成项（本波实测，供下一波）

### 2.1 #81 `import x from "m"` ⏎ `type T = A;` — 实验已证伪

**根因已确认**（本波实测静态读码）：`root-item-rule.KindOf` 的 `type` 分支用
`this.TextOf(code[probe]) !== "="` 找等号，而 `TextOf` 只对 `Common` 返回文本、**`Symbol` 一律返回空串**
（同文件 `TextOf` 的实现：`if (unit instanceof Common) return TempToString(); return ""`）。
所以 `type T = A` 永远找不到 `=` → `KindOf` 返回 **9**（不是 8）→ 语句族在 `A` 处全灭 →
raw 收口在 `=`（`type T =` raw + `A;` 单独 `ExpressionStatement`），与 cj 观测一致。

**但改成 `IsSymbolAt(code, probe, "=")` 是净负**（本波实测）：AST 6162 → **6151**，
新失败 13 条全部是 `type T = A` ⏎ 续行的 recovery 用例（#28/#223/#227/#228/#229/#230/#231/#232/#238/#241/#302 等）。
原因：修好 KindOf 后这些用例走 `TypeAliasDeclarationShape`，它把续行（`(b)` / `[B]` / 模板）当成**类型的一部分**吃掉；
而 TS 那里类型别名在 `A` 就结束、续行是**下一条语句**（旧行为（KindOf=9 → 语句族）反而是对的）。
→ 已 `git checkout` 回滚并重新 xl_build。**下一波的正确方向**：
`KindOf` 返回 8 时，`BuildByKind(8)` 必须按「类型别名不能续行」截断——即 `TypeAliasDeclarationShape.FromUnits`
的 `ParseType` 之后若还有剩余代码单元就**不收**（让 item 收口在类型右界），
或 `KindOf` 只在「`=` 后到行尾没有续行」时返回 8。只改 KindOf 的探针一定回退。

### 2.2 模板标签 #13/#15/#61 — 未动

wp3-29 已证伪 root 的三条收口路径（本次未重复实验）。剩余两个候选落点（本波未测）：
`statement-scanner.ScanToSemicolon` / `statement-builder.BuildVariableStatement` 的终点扫描（`AngleJudge` 的 `>` 截断），
或 `variable-declaration-list-shape` 的 End。注意 `TextOf` 对 `Symbol` 返回空串这个坑在
`AngleJudge` / `ScanToSemicolon` 里同样要复核（凡是「按文本找 `>` / `=` / `;`」的地方都应走 `IsSymbolAt`）。

### 2.3 #86 `const﻿b8 = 3;`（BOM 前导）

仍是结构 1 + 位置 1，未定位。文件首字符是 U+FEFF 的 `constb8`（BOM 后的 `b8` 连着？），
建议下一波先 dump 它的 cj/ts 两棵树。

## 3. 命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-31 -From impl-wp3-30 -Base impl-wp3-30
cd impl-wp3-31
# xl_build(cwd=..., paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs
git checkout -- typescript/cases   # 先读 diff 再 checkout（cj-ast.json 是 tracked 快照）
```

## 4. 踩过的坑

1. `TextOf` 只认 `Common`；对 `Symbol` 做文本比较永远 false（本波 #81 的根因，也是后续最容易再踩的坑）。
2. `xl_build` 增量只传改动文件即可（1 个文件 ~1s），但**改完必须 xl_build 再 tsc**。
3. 回滚后必须再 xl_build 一次，否则 dist 仍是实验代码（本波已做）。
4. `git checkout -- typescript/cases` 会把 `*.cj-ast.json` 还原成 committed 快照——**先读 diff**。