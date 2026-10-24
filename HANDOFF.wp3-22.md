# HANDOFF — impl-wp3-22（WP-3 第二十二波：F 类 5 + G 类 2 落地，AST 6136 → 6143）

STATUS: **PARTIAL / 净正（AST）**。AST **6143 / 6167**（结构差 **25 → 18**、位置差 **24 → 17**、字段差 0、
cj-fail 0）、real-dts 226/226、buffer xml **4487 / 17 / 52**、digest 4379 / 125 / 52（与起点逐项相同）、
tsc 0、xl_check 0 error / 2414 warning、quick PASS、standard PASS。

BRANCH: impl-wp3-22（源码 2 个文件 + 本文件）
BASE: impl-wp3-20 @ 7fdbe069

## 0. 一句话结论（给 Lead）

**F 类 5（missing-possible #146–#150）全部修好，G 类 2（end-declarations #71 + namespace 同形）修好**，
AST +7（6136 → 6143），buffer 一项不倒退。落点与 wp3-20 §1 的证伪结论完全一致：
F 不是 root 的 `IsEmptyVariableStatement`，而是 **root 级 `StatementPossibleShape` 的 `@` 起点在
`statement-scanner.ScanRoot` 里直接 Mismatch**——possible-shape 阶段就死了，根于是在 `const` 上收口。
G 是 `RootItemRule.IsDeclarationBoundary` 把**整单元 Bracket `{}`** 当成「不能续接」（它只排除了
Symbol `"{"`），声明体的 `{` 换行后就裂成独立的 `Block`。

H 类 6 条与 I 类 13 条**未动**（本波时间用尽）；§4 给出了逐条实测形状与首选落点。

## 1. 源码改动（2 个文件，各 1 处语义改动）

### 1.1 `typescript/tokens/statements/statement-scanner.xl.md`（F 类 5）

1. `ScanRoot` 的 `first instanceof Symbol` 分支（**第 214–226 行**）：`;` 之后新增
   `@` → `StatementScanner.ScanDecoratedVariableRoot(code, startAt)`。
2. 新增 `## static method ScanDecoratedVariableRoot:(code:Array<Token>, startAt?:int)=>StatementScanResult`
   （**第 1149 行起**，紧跟 `DecoratedHeadKeyword` 之后）：装饰器前缀（可跨行、可多个、
   `@a` / `@ns.dec` / `@dec(…)` / `@(expr)`）+ 修饰词（export/default/declare/abstract/async）
   + **变量关键字**（const/let/var）→ `ScanToSemicolon(code, keywordAt + 1, true, startAt)`；
   声明词是 class/interface/… → `Mismatch`（那些声明头归各自的候选，本候选不抢）。
   前缀没读全时 `NeedMore`（EOF 上则 `Mismatch`，把位置让给 `BuildTrailingDeclaration` 的装饰器分支）。

为什么必须 `NeedMore` 而不是 `Mismatch`：`ComputeByIndex` 的淘汰是**永久**的，`@` 一格就 Mismatch
会让候选在整条语句上死掉，根回到「Alive 空 → 按含 `const` 这一格建」的老路（就是本波修掉的病）。

为什么限定变量关键字：`@dec class C {}` / `@dec interface I` 等在根上由
`ClassDeclarationPossibleShape` 等候选建（实测本来就对），本候选若也 Accept 会撞
CatalogGuide 的「两个候选同时成立」（C04–C06）。

实测（`SourceFileRunner.Parse` 单例）：
`@dec\nconst x = 1;` / `@dec const x = 1;` / `@dec('x')\nconst x = 1;` / `@a @b.c\nconst x = 1;` /
`@dec\nconst x = 1;\nconst y = 2;` → 与 ts 逐节点一致（`VariableStatement[0,17]`，children =
Decorator + VariableDeclarationList）；`@dec\nconst x = 1`（无 `;` 的 EOF）仍由尾巴建，同样正确。

### 1.2 `typescript/tokens/items/root-item-rule.xl.md`（G 类 2）

`IsDeclarationBoundary` 里、调用位判据**之前**（**第 566–576 行**；**不是** D 类的调用位段，
见 §5 与 wp3-21 的协调说明）：`next` 是 `{` 整单元 Bracket 且 `KindOf` ∈ {3 class, 4 interface,
5 enum, 6 function, 7 module} 时返回 `false`（体从这里开始，换行不改变归属）。
表达式尾巴（kind 9 / export 子句 2）不受影响，仍把换行后的 `{}` 当块语句。

实测：`module N\n{}` / `namespace N\n{}` → `ModuleDeclaration[0,11]`（children = Identifier + ModuleBlock）；
`module N {}`（同行，本来就对）不变；`@dec class C {}` / `@dec\nconst x = 1` 不变。

## 2. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 读数 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | 875 written / 0 error / 2414 warning | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0 | PASS |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |
| AST 全量 | `ast-json` + `ast-json-diff` | 6167 条：一致 **6143**；结构差 **18**、位置差 **17**、字段差 0、cj-fail 0 | **+7 vs 起点** |
| real-dts | `real-dts-ast.mjs` | 226 文件：解析成功 226、崩溃 0、AST 一致 226 | PASS |
| buffer | `--mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml **4487 / 17 / 52**、digest **4379 / 125 / 52** | 与起点相同（不倒退） |
| quick | `gates.ps1 -Tier quick` | **PASS** 5.8s | PASS |
| standard | `gates.ps1 -Tier standard` | **PASS** 10.4s（tests/gates 1/8 = 基线 KNOWN-RED） | PASS |

## 3. 当前剩余 24 条红项（本波实测，按构造，附首条 id 与实测形状）

| 构造 | 红 | id | 实测（cj vs ts） |
|---|---|---|---|
| basic-token | 1 | #86 | `const﻿b8 = 3;` BOM（脚本口径，见 §4 I 类） |
| dts-recovery | 2 | #14/#15 | `class<T> {}` / `class<T> extends B {}` |
| dts-types | 1 | #81 | `import x from "m"\ntype T = A;` |
| end-build | 2 | #33/#37 | `type T = A \| B // c\n;`（End 吃尾注释） |
| end-compute | 1 | #184 | `const f = () => 1\n(y)` ← **D 类（wp3-21）** |
| end-import-export | 2 | #20/#22 | `import x from "m"\na;` |
| possible-build | 6 | #72/#48/#49/#95/#9/#155 | H 类 6 条，见 §4.1 |
| possible-compute | 2 | #13/#15/#61 | `f<T>`t`` 模板标签 |
| statements | 1 | #290 | `const x = a\n(b)` ← **D 类（wp3-21）** |
| （另） | 2 | #25/#126/#169/#171/#179 | 见 §4.2/§4.3 |

> 位置差 17 条与结构差 18 条基本一一对应（`#95/#9/#48/#49` 是 End 锚点，`#155/#72` 是
> ExportKeyword Pos）。

## 4. 未完成项（逐条落点，已验证过一遍形状）

### 4.1 H 类 6 条（`possible-build`）——**首选落点已收窄**

- `#48 declare module "m"`（末尾换行）：`ModuleDeclaration` cj **End 多 1**（把行尾 trivia 算进 End）。
- `#49 declare module "m" // c`：cj 把 `// c` 吃进 End（`cj[0,23]` vs `ts[0,18]`）。
- `#95 export as namespace A\nz;`：`NamespaceExportDeclaration ts[0,21] cj[0,22]`（End 多 1）。
- `# 9 export as namespace N; // trailing`：`ts[0,22] cj[0,34]`（End 吃尾注释，**实测复现**：
  `node tmp-probe "export as namespace N; // trailing"` → cj end 34）。
  → 这 4 条同源：**建树入口拿到的右界是「最后一个单元（含 trivia）」而不是「最后一个代码单元」**。
  落点优先级：`declarations/namespace-export-declaration-shape.xl.md` 的 `FromUnits`
  （`SignOut(last.SourceRange.End)` 的 `last` 来自 code 数组，理论上是 `;` 或名字——所以 End=34
  说明**不是** FromUnits 建的，而是某个用 `host.Data[end].SourceRange.End` 的调用方：
  先 `Select-String -Pattern "NamespaceExportDeclaration"` 找 root 的 kind 2 / `BuildDirect` 入口，
  再对齐「最后一个代码单元」口径）；模块那两条同理看 `ModuleDeclarationShape.BuildDirect` /
  `SourceFileTailBuilder.BuildModuleItem`。
- `#155 declare function f(): void\nexport import y = require("m")\ninterface I {}`：
  **`ExportKeyword Pos ts[26,33] cj[0,33]`**（只有 Pos，结构不差）。
- `#72 export import A = B.C.D; export import D = require("n");`：同一条 Pos=0。
  → 这两条同源：`import-equals-declaration-shape.xl.md` **第 195–196 行**
  `const exportModifier = ExportKeywordShape.FromBasicToken(exportUnit as Common, context); exportModifier.Pos = pos;`
  ——`pos` 在这一支里是 0。`FromUnits` 的 pos 是从 `host.Data[start-1]` 往前扫出来的；
  `#155`/`#72` 的 export 不在段首（前有 `declare function …` / 前有上一句），所以 `pos` 该取
  「export token 的 `StartIndex`」。wp3-19 的 H 类建议正是这句：**ExportKeyword 的 Pos 用 export token 起点**。
  改法（一行级）：在该处 `exportModifier.Pos = exportUnit.SourceRange.StartIndex >= 0 ? exportUnit.SourceRange.StartIndex : pos;`
  **未实测**（本波到此为止），下一波先跑 `tmp-probe "export import A = B.C.D;"` 单例确认，再跑全量。

### 4.2 I 类里可归属 / 不可归属（本波判断，供 Lead 定责）

| id | 形状 | 归属判断 |
|---|---|---|
| #86 `const﻿b8 = 3;`（`\uFEFF` 在标识符中间） | basic-token | **脚本口径**：`ast-json.mjs` 的 `decodeCaseText` 对 BOM 的处理，不是解析器缺陷（cj 把 `\uFEFF` 当 trivia/空格，TS 报错或另解）。修它要动 `cases/ast-json.mjs`，本波禁改 cases 口径 |
| #14/#15 `class<T> {}` | dts-recovery | 成员/类型族（`class` 后紧跟 `<`），root 侧**不**该修（root 已把 kind 判成 9 交给 StatementBuilder，见 `KindOf` 第 807–809 行注释） |
| #81 `import x from "m"\ntype T = A;` | dts-types | import 声明换行后的收口（import-declaration-shape / 尾巴） |
| #20/#22 `import x from "m"\na;` | end-import-export | 同上，import 族的 ASI 收口 |
| #33/#37 `type T = … // c\n;` | end-build | **End 吃尾注释**，与 §4.1 的 H 类**同一口径**（最后一个代码单元 vs 最后一个单元），可与 H 一起修 |
| #13/#15/#61 `f<T>`t`` | possible-build | 模板标签 + 类型实参，**类型族/表达式族**，不在本轮写范围 |
| #169/#171/#179 `yield\n(1)` / `yield\n[1]` / `yield\r(1)` | possible-build | 受限产生式（yield 的行尾 ASI），`statement-scanner` 的表达式侧；本波没时间 |
| #25 `interface I5 extends { a: 1 } { }` | possible-compute | interface 族（`extends` 的对象类型体 vs 声明体），**禁改区**（interface/**） |
| #126 `import type from 'm'\nimport type from 'n';` | possible-compute | import 族 |

### 4.3 D 类 2 条仍是 wp3-21 的活

`#290 const x = a\n(b)`（statements）、`#184 const f = () => 1\n(y)`（end-compute）——
本波**没有碰** `source-file-tail-builder.xl.md`，也没有碰 `root-item-rule.xl.md` 里 D 类的段
（`IsDeclarationBoundary` 的调用位分支 `IsCallPositionBlocked`、`Analyze` 的收口循环）。

## 5. 与并行成员 wp3-21 的边界（务必让 merger 看）

- 本波**未修改** `typescript/tokens/items/source-file-tail-builder.xl.md`（一行都没动）。
- `root-item-rule.xl.md` 只多了一段（第 566–576 行）在 `IsDeclarationBoundary` 的**开头**，
  与 D 类（调用位 `IsCallPositionBlocked`，第 577 行起）**不相邻、不重叠**；merge 冲突风险低。
- `statement-scanner.xl.md` 与 `statement-scanner` 的 D/表达式段无交集（只在 `ScanRoot` 的
  `Symbol` 分支插入一个 `@` 分支 + 文末新增一个 static 方法）。
- 第三处（`state.End` / `SelectDeferred`）未动。

## 6. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-23 -From impl-wp3-22 -Base impl-wp3-22
cd impl-wp3-23
# xl_build(cwd="...\impl-wp3-23", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs
git checkout -- typescript\cases
```

下一波首选 **H 类 2 条 ExportKeyword Pos**（§4.1 末，一行级，先单例确认），再 **H 类 4 条 End 锚点**
（与 `#33/#37` 同口径，一次修 6 条）。

单例探针（本波用的，20 行，可直接照抄）：

```js
import path from "node:path"; import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createAstCore, cjAst } from "./typescript/cases/ast-compare.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require(path.join(here, "node_modules", "typescript"));
const { SourceFileRunner } = require(path.join(here, "build/ts/typescript/run/source-file-runner.js"));
const { tsAst } = createAstCore(ts);
for (const src of process.argv.slice(2)) {
  const text = src.replace(/\\n/g, "\n");
  const file = ts.createSourceFile("t.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  console.log("ts : " + JSON.stringify(file.statements.map(tsAst)));
  const root = SourceFileRunner.Parse(text, "t.ts");
  console.log("cj : " + JSON.stringify(root.Data.map(cjAst)));
}
```

## 7. 阻塞点

无。

## 8. 踩过的坑（新增）

1. **`@` 上的淘汰是永久的**：`StatementPossibleShape.ComputeByIndex` 一旦 Reject 就
   `this.Alive.delete(index)`，同一个 item 里不会再回来。所以「还没读全」必须 `NeedMore`，
   不能用 Mismatch 图省事——这一条正是 F 类 5 条的真正病灶。
2. **`@a @b.c` 比 `@a @b` 难**：限定名装饰器在 `.` 那一格时 `index + 1 >= code.length`，
   朴素写法会落到「不是 Common → Mismatch」，候选死在 `.` 上；必须显式 `NeedMore`。
   多装饰器用例（#149 `@a @b.c`）就是靠这条才修好。
3. **G 类的 `{}` 是 Bracket 整单元**，不是 `Symbol "{"`：`IsDeclarationBoundary` 的续接表里
   `"{"` 只覆盖符号形态，所以 `module N\n{}` 一直裂。改判据时要看 `KindOf`（3/4/5/6/7 才是体）。
4. `..\tools\gates.ps1 -Tier standard/quick` 会重写 `typescript/cases/*.cj-ast.json`（tracked！），
   跑完必须 `git checkout -- typescript/cases`，否则提交里混进快照。
