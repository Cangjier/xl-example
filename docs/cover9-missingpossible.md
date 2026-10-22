# cover9 作者报告 — 缺少 possible（targetStem = `missing-possible.ts`）

日期：2026-10-22 ｜ 分支：`cover9-missingpossible` ｜ 起点：`4d2dafe358ea633bc12653e73fd1051cfae03983`（merge cover9-prep）
工作区：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-missingpossible`（独立克隆；未 push / 未 merge / 主仓只读）
任务：`task-6`（COVER9-AUTH-MISSINGPOSSIBLE）｜ 修复对象：`tests/cover9/candidates.json` 中 A17–A21 + C07–C08 共 **7 条真红**
（TS 6.0.3 `parseDiagnostics=0` 且本仓 crash）→ 全部转绿；用例追加到 `typescript/cases/missing-possible.ts` 的 cover9 段。

## 1. 一句话结论

7 条真红全部修复（probe 7 条 `red-crash` → `green`），同族 1 条 TS 合法但本类未覆盖的形态（块内
`declare function …` ⏎ `global {}`）仍红，按纪律登记为遗留（§9）。新增 22 条用例（135 → 157），
`ast-json` 5929 → **5951**、`ast-json-diff` 0/0/0，其余门禁与基线持平（§10）。

## 2. 基线 / 最终读数

| 项 | 基线（4d2dafe3） | 修复后（本分支） |
|---|---|---|
| `node tests/cover9/probe.mjs` | 88 条：red 44 / green 44 / ts-invalid 0 | 本类 7 条 red→green（其余 37 条 red 不动）；存储值 vs 实测偏差 exit 1（预期） |
| `node typescript/cases/ast-json.mjs` | 5929 / 5929 / fail 0 | **5951 / 5951 / fail 0**（+22 用例） |
| `node typescript/cases/ast-json-diff.mjs` | 5929/5929，结构 0 / 位置 0 / 字段 0 | **5951/5951，0/0/0** |
| `node typescript/cases/token-ast.mjs --quiet` | total=1715 ok=1705 crash=0 diff=0 ts-invalid=10 | **同上（无回归）** |
| `node tests/parse/validate.mjs` | 1719 / 0 不合格 | **1719 / 0 不合格**（新增用例都进 `typescript/cases`，不进 token 夹具） |
| `node typescript/cases/real-dts-ast.mjs` | 226 / 226 | **226 / 226（0 崩溃 / 0 差异）** |
| `tsc -p tsconfig.json` | 0 error | **0 error** |
| `xl_check`（core+typescript，targets ts） | 0 error | **0 error**（864 文件，2461 warning，均为既有 W3102/W3103） |
| `git diff 4d2dafe3..HEAD -- core typescript/IMPORTANCE.md` | 空 | **空**（core 与 IMPORTANCE 零改动） |

## 3. 问题清单与根因（7 条，file:line 以修复前行为准）

### 3.1 A17–A21：装饰器贴变量声明（`@dec` + `const`/`let`/`var`）

TS 侧：`VariableStatement` 的 children 是 `Decorator(s)` → `VariableDeclarationList` → `SemicolonToken`；
装饰器表达式允许跨行（`@dec` ⏎ `const x = 1;` 的 Decorator 在 `[0,4)`、VariableDeclarationList 在 `[4,16)`）。
本仓两条路径都缺「装饰器 + 变量」通道：

- **块 / 体级**（A18–A21）：`typescript/tokens/statements/statement-builder.xl.md` 的 `BuildStatement`
  `@` 分支（修复前 :244）只做 `BuildDecoratedStatement`；`ScanDecoratedHead`（修复前 :985）能认出
  `const`（`DecoratedKeyword = "const"`），但 `BuildDecoratedStatement`（修复前 :1039）的分派表只有
  class / interface / enum / type / function / namespace，**变量族没有入口** → 返回 `null` →
  退回 `BuildExpressionStatement`，在 `@` 上抛「不支持的表达式起点」。
- **根级**（A17）：`StatementScanner.ScanRoot` 对 `@` 直接 `Mismatch`，根级候选全灭；
  到 EOF 由 `typescript/tokens/files/source-file-end-possible-shape.xl.md:376 BuildTrailingDeclaration`
  兜底。它的多语句分界（修复前 :447-515）把 `@dec` 与 `const` 当成两条语句切开，前缀 `@dec`
  单独不是语句 → 走 `ExpressionStatementShape.FromUnits`，在 `@` 上抛「不支持的表达式起点」；
  装饰器分支（修复前 :559）只接「最后一块是 `{`」的 class。

### 3.2 C07–C08：无体 ambient 声明之后的尾随 `global {}`

TS 侧：`FunctionDeclaration[0,27)` + `ModuleDeclaration[27,37)`（`global` 是 ModuleDeclaration 的
global 关键字形：`Identifier + ModuleBlock`）。
本仓：`declare function gf(): void` 由根级 `FunctionDeclarationPossibleShape` 吃掉；返回类型后
换行遇到标识符 `global`（非 statement word）记 `SplitAt`（`typescript/tokens/declarations/
function-declaration-possible-shape.xl.md:303-327`）。到 `global {}` 的 `{` 时
`TypeBuilder.IsBodyBrace` 把它误当函数体 → `DoneAt` 落在 `{}`；`BuildByIndex`（修复前 :437-450）
在截断点把**尾巴一律当 `ExpressionStatement`** 建（`ExpressionStatementShape.FromUnits(host,
splitAt, tokenIndex, context, true)`，要求末尾 `;`）→ 尾巴是 `global {}`（无分号）→
抛「表达式语句缺少分号」。即 `global {}` 的 module 声明分派在「函数候选的 ASI 截断尾巴」上缺失。

## 4. 修复文件与改动（只改 `typescript/**`，3 个文件）

| 文件 | 改动（file:line 为修后行号） |
|---|---|
| `typescript/tokens/statements/statement-builder.xl.md` | ① `BuildDecoratedStatement` 增加变量族分派（:1070-1073，`const`/`let`/`var` → `BuildDecoratedVariableStatement`）；② 新增 `BuildDecoratedVariableStatement`（:1076-1104）：`TypeBuilder.ParseDecorators` 建 Decorator 形状（与参数/声明装饰器同源），`BuildVariableStatement(decoratedFirst)` 从关键字建列表、区间/`Pos` 锚到第一个 `@`，再把装饰器按 TS children 顺序插到 Data 最前；③ `BuildVariableStatement` 增加可选参 `decoratedFirst?`（:1372-1400）：`first = decoratedFirst ?? keywordStart`，`Finish(shape, first, …)` 让 SignIn/Pos 从装饰器起算，`BuildVariableDeclarationList` 的 listStart 仍用关键字格（`VariableDeclarationList` 的 Pos 在关键字上）。 |
| `typescript/tokens/files/source-file-end-possible-shape.xl.md` | `BuildTrailingDeclaration` 在「多条声明连排」分界之前增加「装饰器 + 变量关键字」通道（:447-521）：用 `StatementBuilder.ScanDecoratedHead` 判词（与块级同一份判据），**只接 `const`/`let`/`var`**（class/interface/enum/function/namespace 仍走各自既有分支，不抢装饰器声明头的归属）；整段交给 `StatementBuilder.BuildStatement`，按语句右边界算消费量 splice，剩余单元递归 `BuildStatementSegments`（`@dec ⏎ const x = 1;` ⏎ `const y = 2;` 可拆）。 |
| `typescript/tokens/declarations/function-declaration-possible-shape.xl.md` | `BuildByIndex` 的 ASI 截断尾巴（:444-472）：尾巴头是 `global` 时用 `StatementBuilder.BuildStatement` 按语句分派建（`BuildModuleDeclaration`），其它形态仍走原 `ExpressionStatementShape.FromUnits(…, true)`；新增 `StatementBuilder` import（:14）。 |

未新增 `PossibleShape` 类：本族缺的是分派入口（等价于候选入口判据），不是新的根候选形状；
`@` 装饰器表达式的扫描复用 `TypeBuilder.ParseDecorators` / `ScanDecoratedHead`，没有重复扫描（§3.4 口径）。

## 5. 四问（§6 解决问题思路）

1. **正确的应该什么时候 build**
   - 装饰器变量声明：块 / 体里一条语句「到齐」时由 `BuildStatement` 的 `@` 分支一次建完；
     根级则由 EOF 兜底（`BuildTrailingDeclaration`）在最后一段代码到齐时建——两者都要求
     「装饰器前缀（可跨行）+ 变量关键字」先被认出，再交给变量语句建造。
   - `global {}`：`declare function …` 的返回类型之后换行、下一行是 ModuleDeclaration 头时，
     它在函数候选的 ASI 截断点上就「到齐」了（`global` + `{…}` 是一个括号单元），
     由截断尾巴的语句分派建，不等 `;`（global 模块不需要分号）。
2. **build 时应该提取哪些信息**
   - `DecoratorShape`（`@` 不进 children，Pos 含前导 trivia）、变量关键字（`const`/`let`/`var`）、
     `VariableDeclarationListShape`（每个 declarator 的名字/`!`/类型/初始化器）、语句区间与 `Pos`
     （从第一个 `@` 起算）；`VariableDeclarationList` 的 `Pos` 仍锚在关键字。
   - `ModuleDeclaration`：`global` 标识符 + `ModuleBlock`（体内成员递归 `ModuleBlockShape`）。
3. **什么时候 close**
   - 装饰器变量语句：声明列表到 `;`（或块级 ASI 边界）即 `Finish`（SignIn 装饰器起点、SignOut 语句末单元、`Pos` = 装饰器 Pos 口径）。
   - `global {}`：`{…}` 是闭合括号单元，FromUnits 建完即关闭（体已在括号内收口）。
4. **close 时应该提取哪些信息**
   - 变量语句：`Data` = Decorator(s) + VariableDeclarationList（顺序与 TS 一致）、区间从 `@` 到 `;`/末单元、
     `Pos` 从第一个 `@` 的前导 trivia 起；装饰器自身的 Pos 由 `TypeBuilder.ParseDecorators` 链式给出。
   - ModuleDeclaration：`Data` = Identifier + ModuleBlock；区间从 `global` 到 `}`；`Pos` = 前一非 trivia 单元 End+1。

## 6. 逐条红→绿证据

复现命令（克隆内，重建后）：`node tests/cover9/probe.mjs`。修复前 7 条原文与状态（probe 存储值 = 实测）：

| id | 输入 | 修复前 | 修复后 |
|---|---|---|---|
| A17 | `@dec\nconst x = 1;` | red-crash：不支持的表达式起点 | **green**（TS `VariableStatement[0,17)` + Decorator） |
| A18 | `{ @dec\nconst x = 1; }` | red-crash：不支持的表达式起点 | **green** |
| A19 | `{ @dec\nlet x = 1; }` | red-crash：不支持的表达式起点 | **green** |
| A20 | `{ @dec\nvar x = 1; }` | red-crash：不支持的表达式起点 | **green** |
| A21 | `{ @dec\nconst x = 1, y = 2; }` | red-crash：不支持的表达式起点 | **green** |
| C07 | `declare function gf(): void\nglobal {}` | red-crash：表达式语句缺少分号 | **green**（TS `FunctionDeclaration[0,27)` + `ModuleDeclaration[27,37)`） |
| C08 | `declare function gf(): void\nglobal { const x = 1 }` | red-crash：表达式语句缺少分号 | **green**（同上，ModuleBlock 含 VariableStatement） |

修复后 `node tests/cover9/probe.mjs --quiet`：本类 7 条 live=`green`；probe 因「存储值 vs 实测」7 条偏差
按约定 exit 1（candidates.json 是 4d2dafe3 的基线，未改，属预期）。

**新增 22 条用例的「修复前红」证据**（用 git stash 暂存本分支 3 个 `.xl.md`、重建基线后逐条实测）：
同批探测 27 条形态，修复前 27/27 全部 red（17 条「不支持的表达式起点」+ 9 条「表达式语句缺少分号」
+ 1 条块内形态 red-diff）；修复后 26/27 green，22 条写入用例（22/22 green），另 5 条未写入：
根级 `@dec\nlet y = 1;` / `@dec\nvar z = 2;`（与 A19/A20 的块级 let/var 是同族重复形，不另立用例）、
`function f(): void\nglobal {}`（无 declare，同族但不在 7 条候选内，已转绿）、
`declare function gf(): void\nglobal\n{}`（`global` 与 `{}` 分行，已转绿，属 trivia 之外的排布变体）、
`{ declare function gf(): void\nglobal {} }`（块内形态，修复后仍 red-diff，缺 `Identifier`/`ModuleDeclaration`/
`ModuleBlock`，按「只修本类 7 条」的纪律登记为遗留（§9））。

## 7. 新增用例（+22，`typescript/cases/missing-possible.ts` 末尾 cover9 段）

段内注释写明 §6 类别（缺少 possible）与候选 id（A17–A21 / C07–C08）。一行一例、行内 `\n` 转义、
同 stem 无重复行、全 LF、无裸 CR/LS/PS。分组（base 先行、trivia/重复形随后）：

- 块内装饰器变量（10）：base `{ @dec\n  const x = 1;\n}`；变体 let / var / `const x = 1, y = 2`；
  trivia：装饰器与关键字同行、装饰器前 `/* c */`、装饰器后 `/*c*/`；重复形：两个装饰器、
  块内后续 `const`、块内后续 `let`。
- 根级装饰器变量（5）：base `@dec\nconst x = 1;`；trivia：同行、带参装饰器 `@dec('x')`；
  重复形：`@a @b.c`、根级后续语句。
- `declare function` 之后尾随 `global {}`（7）：base `…\nglobal {}`；变体：带成员 / 体内换行；
  trivia：空行 / 块注释；重复形：体内多声明 / 尾随两个 `global` 模块。

单 stem 读数：`[missing-possible] cases=157 cj-ok=157 cj-fail=0`；`ast-json-diff missing-possible`
157/157，结构 0 / 位置 0 / 字段 0。两份快照（`missing-possible.cj-ast.json` / `missing-possible.ts-ast.json`）
由 `ast-json.mjs missing-possible` 重新生成，未手工合并。

## 8. 与作者 A1 的共享面（供合并成员仲裁）

- `typescript/tokens/files/source-file-end-possible-shape.xl.md`：本类新增的「装饰器 + 变量关键字」通道
  放在**多语句分界之前**，只认 `const`/`let`/`var`；装饰器声明头（`@dec class/interface/enum/function/
  namespace`，A01–A16）仍走该文件既有的装饰器 class 分支与根候选，本分支不拦截。
- `typescript/tokens/declarations/function-declaration-possible-shape.xl.md`：本类只改 `BuildByIndex` 的
  **截断尾巴**（`global` 开头 → `StatementBuilder`），**未动** `ComputeByIndex` 的 `IsDecoratedDeclarationStart`
  / `SplitAt` 判据（A01–A16 需要改的区域）；两边可能同时改 `BuildByIndex`，合并时以「两边区块都保留、
  冲突取重生成快照」处理即可（本类只新增：import、`trailingHead` 分支）。
- `typescript/tokens/statements/statement-builder.xl.md`：本类新增 `BuildDecoratedVariableStatement` 与
  `BuildVariableStatement(decoratedFirst?)`；A1 若也扩 `BuildDecoratedStatement` 分派表，变量关键字这一支
  与本类一致（同一位置 :1070），取任一侧后重生成快照。

## 9. basic-token 是否牵涉 / 遗留风险

- **basic-token：不牵涉**（只登记）。本类全部落在 shape / 分派层：`@` 与 `@dec` 的 token 化、`const`
  关键字、`{}` 括号单元在基线里都正确（装饰器声明头 A22–A45 已绿），缺口是「候选 / 分派 / 建树入口」。
  未改 `core/**`、未改 `basic-tokens`、未新增 token 夹具。
- **遗留 1（本类同族未修）**：块内 `{ declare function gf(): void\nglobal {} }`（TS diag=0）仍 red-diff
  （结构缺 `Identifier`/`ModuleDeclaration`/`ModuleBlock`）。根因在块级 `BuildFunctionDeclaration`
  （`statement-builder.xl.md:453`）按 `TypeBuilder.IsBodyBrace` 找函数体，会把下一条 `global {}` 的体当成函数体，
  与根级 `FunctionDeclarationPossibleShape` 的 `SplitAt` 是**不同路径**；修它需要块级 ASI 截断（属 end-build /
  下一批）。
- **遗留 2（口径）**：`@dec` 贴变量声明在语义上未必合法（TS 只报 parse，不报语义）；本类沿用
  「TS `parseDiagnostics=0` 即真值」的既有口径（与 cover5 §6 裁定 3 一致）。
- **遗留 3**：A17 的根级通道只接 `const`/`let`/`var`；`@dec using x = …` 这类上下文关键字形态未验证
  （TS 侧大概率 parse 合法但极冷门，未纳入本批候选）。
- 风险：`BuildVariableStatement` 新增可选参后，所有既有调用点行为不变（未传时 `first === keywordStart`，
  `listStart` 与旧代码一致）；用全量 5951/5951 与 token-ast 1715 作回归证据。

## 10. 复跑方法（克隆内）

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-missingpossible
# 重建（改过的 3 个 .xl.md）
#   xl_build(cwd=<clone>, paths=[上述 3 文件], targets=["ts"], out="dist", force=true)
.\node_modules\.bin\tsc.cmd -p tsconfig.json
node tests/cover9/probe.mjs                 # 本类 7 条 green；存储值偏差 → exit 1（预期）
node typescript/cases/ast-json.mjs          # 5951 / 5951 / fail 0
node typescript/cases/ast-json-diff.mjs     # 5951 / 0 结构 / 0 位置 / 0 字段
node typescript/cases/token-ast.mjs --quiet # 1715（ok 1705 / ts-invalid 10）
node tests/parse/validate.mjs               # 1719 / 0
node typescript/cases/real-dts-ast.mjs      # 226 / 226
git diff 4d2dafe3..HEAD -- core typescript/IMPORTANCE.md   # 空
```

## 11. 提交内容

- 代码：`typescript/tokens/statements/statement-builder.xl.md`、
  `typescript/tokens/files/source-file-end-possible-shape.xl.md`、
  `typescript/tokens/declarations/function-declaration-possible-shape.xl.md`
- 用例与快照：`typescript/cases/missing-possible.ts`（+22）、`missing-possible.cj-ast.json`、
  `missing-possible.ts-ast.json`
- 文档：本文件。`tmp/`（探针脚本）未提交。
