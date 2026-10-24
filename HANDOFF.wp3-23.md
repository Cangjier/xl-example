# HANDOFF — impl-wp3-23（WP-3 第二十三波：合并 wp3-21/22，H 类 5 条落地，AST 6151）

STATUS: **PARTIAL / 净正（AST）**。合并后基线 **6145 / 6167**（与预期 6136+2+7 完全一致），
本波修复后 **6151 / 6167**（结构差 **16**、位置差 **9**、字段差 0、cj-fail 0）。
real-dts 226/226；buffer xml **4487 / 17 / 52**（与起点逐项相同）、digest **4383 / 121 / 52**
（起点 4379 / 125 / 52 → PASS **+4**，未倒退）；tsc 0；xl_check **0 error / 2414 warning**；
quick PASS、standard PASS。

BRANCH: impl-wp3-23（源码 2 个文件 + 本文件）
BASE: impl-wp3-22 @ 3a2dfb37，并 merge impl-wp3-21 @ 335887b0（`--no-ff`，无冲突）
MERGE: 557bc919；H 类修复 1617f405

## 0. 一句话结论（给 Lead）

1. **合并成功**：两条分支的改动都在（`root-item-rule.xl.md` 的 D 类 `continuesCall` 与 G 类
   Bracket `{` 例外、`statement-scanner.xl.md` 的 `@` 装饰器候选），合并后重建 **6145/6167**，
   与 Lead 预期 6145 逐位吻合。
2. **H 类 6 条里修好 5 条**（+6 AST，其中 #9 为探针复现但当前语料未单列）：
   - `#72` / `#155`：`ImportEqualsDeclarationShape.BuildDirect` 里 `ExportKeyword.Pos` = 0
     → 改用 `DeclarationSpan.PosBefore(host, start)`（与声明 Pos 同口径，含前导 trivia）。
     **注意**：`FromUnits` 内按 export token `StartIndex` 改会差 1（#155 应为 26、token 起点 27），
     不能用；已在 `BuildDirect` 末尾补正（见 §1.1）。
   - `#48` / `#49` / `#95`（+探针里的 `#9`）：EOF 尾巴合成 `;` 的终点取了**边界单元（trivia）**的
     `EndIndex` → 模块声明 / namespace-export 的 End 把换行或尾注释吃进来。改为：边界是 trivia 时
     回扫到最后一个非 trivia 单元的 `EndIndex`（见 §1.2）。
3. **I 类 13 条本波未修**（0 条），但把其中 6 条的**真实共因**测清楚了（§3.2）：不是 End 锚点，
   而是「声明按 ASI 在换行处收口后，下一行的孤立 `;` 被当成 EmptyStatement」。
   修它要动 root 的声明收口/ASI 终止逻辑，超出本波时间与写范围判断，留给下一波。

## 1. 源码改动（2 个文件，3 处）

### 1.1 `typescript/tokens/declarations/import-equals-declaration-shape.xl.md`（#72/#155）

`BuildDirect` 末尾：
```ts
const pos = DeclarationSpan.PosBefore(host, start);
const shape = ImportEqualsDeclarationShape.FromUnits(hostLike, 0, units.length - 1, context);
shape.Pos = pos;
const exportHead = shape.Data.length > 0 ? shape.Data[0] : null;
if (exportHead !== null && exportHead instanceof ExportKeywordShape) {
  (exportHead as ShapeToken).Pos = pos;
}
```
为什么不在 `FromUnits` 里改：
- `FromUnits(hostLike, 0, …)` 的 hostLike.Data 从 export 那格开始，倒扫 `start-1` 拿不到 pos（=0）；
- 换成 `exportUnit.SourceRange.StartIndex` 会**差 1**：#155 的 ts Pos 是 26（含前导换行），
  token 起点是 27。`PosBefore` 正好是「前一个非 trivia 单元 EndIndex」= 26 / #72 的第二条 = 24。
- 单例实测：`export import A = B.C.D; export import D = require("n");` 第二条 ExportKeyword
  [24,31]；`declare function f(): void\nexport import y = require("m")\ninterface I {}` → [26,33]，与 ts 一致。

### 1.2 `typescript/tokens/items/source-file-tail-builder.xl.md`（#48/#49/#95/#9）

两处（`isExportAsNamespace` 分支的 `namespaceEnd`、`isBodylessAmbientModule` 分支的 `moduleEnd`）：
边界单元 `host.Data[at]` 是 trivia（换行 / 尾注释）时，回扫到 `start` 之前最后一个非 trivia 单元，
用它 `SourceRange.EndIndex` 作为零宽合成 `;` 的签出点：
```ts
let moduleEnd = host.Data[at].SourceRange.EndIndex;
if (host.Data[at].IsTriviaToken) {
  for (let index = at - 1; index >= start; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const codeEnd = host.Data[index].SourceRange.EndIndex;
      if (codeEnd >= 0) {
        moduleEnd = codeEnd;
      }
      break;
    }
  }
}
```
- `declare module "m"` ⏎（#48）→ End 19→**18** ✓；`declare module "m" // c`（#49）→ 23→**18** ✓；
  `export as namespace A` ⏎ `z;`（#95）→ 22→**21** ✓；`export as namespace N; // trailing`（探针 #9）→ 34→**22** ✓。
- 边界是**非 trivia**（如真的 `;`）时行为不变，所以带分号的同族用例没动。

## 2. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 读数 | 判定 |
|---|---|---|---|
| 合并基线 | xl_build + ast-json + diff | **6145 / 6167**（结构 16 / 位置 15 / 字段 0） | 与预期一致 |
| xl_build | core+typescript → dist（全量） | 875 written / 0 error / 2414 warning | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0 | PASS |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |
| AST 全量 | `ast-json` + `ast-json-diff` | **6151 / 6167**；结构 16、位置 9、字段 0、cj-fail 0 | +6 vs 合并基线 |
| real-dts | `real-dts-ast.mjs` | 226：成功 226、崩溃 0、一致 226 | PASS |
| buffer | `--mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml **4487 / 17 / 52**、digest **4383 / 121 / 52** | xml 与起点相同；digest PASS +4（不倒退） |
| quick | `..\tools\gates.ps1 -Tier quick` | **PASS** 5.7s | PASS |
| standard | `..\tools\gates.ps1 -Tier standard` | **PASS** 10.6s（tests/gates 1/8 = 基线 KNOWN-RED） | PASS |

## 3. 剩余 16 条结构差（本波实测，逐条）

### 3.1 清单

| 构造 | id | 实测形状 | 本波判断 |
|---|---|---|---|
| basic-token | #86 | `const﻿b8 = 3;` BOM | **脚本口径**：`ast-json.mjs` 的 `decodeCaseText`，不是解析器缺陷；记录不修 |
| dts-recovery | #14/#15 | `class<T> {}` / `class<T> extends B {}` | 类/成员族（`class` 后 `<`），root 侧不该修（`KindOf` 已判成 9 交 StatementBuilder）；**不属本波** |
| dts-types | #81 | `import x from "m"` ⏎ `type T = A;` | import 声明后一条 `type` 的 ASI 收口；见 §3.2 共因 |
| end-build | #33/#37 | `type T = A \| B // c` ⏎ `;` / `type T = () => string//c` ⏎ `;` | **不是 End 锚点**：cj 是 TypeAlias[0,14] + EmptyStatement[14,21]；ts 是 TypeAlias[0,21]；见 §3.2 |
| end-import-export | #20/#22 | `import x from "m"` ⏎ `a;` / 两条 import 后接 `a;` | §3.2 共因（`a` 收在 19，`;` 成 EmptyStatement；ts 是 [17,20]） |
| possible-build | #13/#15/#61 | `f<T>`t`` 模板标签 ×3 | 类型实参 + 模板标签，表达式/类型族；不在本波写范围 |
| possible-build | #169/#171/#179 | `yield` ⏎ `(1)` / `[1]` / `\r(1)` | 受限产生式的 yield ASI；statement-scanner 表达式侧，未做 |
| possible-compute | #25 | `interface I5 extends { a: 1 } { }` | interface 族（禁改区） |
| possible-compute | #126 | `import type from 'm'` ⏎ `import type from 'n';` | import 族 ASI；§3.2 同族（EmptyStatement +1、End -1） |

### 3.2 本波新测出的共因（下一波最有价值的一条）

`#20/#22/#33/#37/#81/#126` 六条**同一形状**：一条本可无分号的声明/语句在换行处按 ASI 收口，
`End` 停在该行最后一个代码单元，**下一行/同行的孤立 `;` 被单独建成 `EmptyStatement`**：
- `type T = A` ⏎ `;` → cj `TypeAlias[0,10] + EmptyStatement[10,12]`，ts `TypeAlias[0,12]`；
- `type T = A // c` ⏎ `;` → cj `TypeAlias[0,10] + EmptyStatement[10,17]`，ts `TypeAlias[0,17]`；
- `import x from "m"\na;` → cj `ExpressionStatement[17,19] + EmptyStatement`，ts `[17,20]`；
- `import x from "m"\na`（无分号）→ **两边一致**；`a;` 单独 → 一致；`type T = A;`（同行）→ 一致。
结论：分叉只在「收口点与 `;` 之间有换行」时发生。下一波落点：root 的声明/语句 ASI 终止路径
（`root-item-rule.xl.md` 的 Analyze/Build 收口，或 `TerminateShape` 的 ASI 分支），
把「收口点之后、下一个代码单元是 `;`」的那一格并进前一条语句的 `End`（并消费该 `;`），
可一次修 5–6 条。注意形状 `TryToClose` 之后不能再 `SignOut`（会抛），要在建之前定终点。

## 4. 与并行成员的边界

- 未触碰 `statement-scanner.xl.md` / `statement-builder.xl.md`（impl-wp6-4 的区域一字未动）。
- `root-item-rule.xl.md` 本波未改（merge 带进来 wp3-21 的 D 类段）。
- 改的两个文件：`import-equals-declaration-shape.xl.md`（BuildDirect 末尾 6 行）、
  `source-file-tail-builder.xl.md`（两处 End 回扫，各 ~12 行）。
- 未改 `typescript/cases/**`、`tests/**`、`core/**`。

## 5. 踩过的坑（务必让后续成员看到）

1. **仓库里 committed 的 `*.cj-ast.json` 是全绿的**：直接 `node ast-json-diff.mjs`（不先跑
   `ast-json.mjs`）会得到 **6167/6167 全一致**的假读数；`git checkout -- typescript/cases` 之后
   再 diff 也是假读数。必须严格「先 ast-json.mjs 再 ast-json-diff.mjs」，读 diff 的这一轮结果，
   然后才 checkout。本波第一次就被这个假绿骗了一轮。
2. **`export import` 的 ExportKeyword Pos 不能用 token StartIndex**（差 1，#155 是 26 vs 27）；
   要用 `PosBefore`（前一个非 trivia 单元 EndIndex）。
3. **EOF 尾巴合成 `;` 的位置必须取「最后一个代码单元」**：`host.Data[at]` 在 EOF 尾巴上是
   trivia（换行/注释），直接取它的 EndIndex 就会把 trivia 吃进声明 End。
4. `gates.ps1` 会重写 tracked 的 `typescript/cases/*.cj-ast.json`，每次跑完
   `git checkout -- typescript/cases`；`git status --porcelain` 只应剩自己改的 `.xl.md`。

## 6. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-24 -From impl-wp3-23 -Base impl-wp3-23
cd impl-wp3-24
# xl_build(cwd="...\impl-wp3-24", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs; git checkout -- typescript/cases
```

下一波首选 §3.2 的「孤立 `;` 并入前一条语句」共因（5–6 条），再考虑模板标签 #13/#15/#61
与 yield #169/#171/#179。

## 7. 阻塞点

无。
