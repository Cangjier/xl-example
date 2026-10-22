# cover9 · missing-end 组（Y01–Y17 + O01–O07）真红修复报告

> 作者：auth-missingend（cover9 轮次 W1：缺少 end + end build 两 stem）
> 克隆/分支：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-missingend`，分支 `cover9-missingend`
> 起点：`b465cf6e`（父链 `3a47b46d` → `4d2dafe3`；基线含 cover9-endbuild 39 条 + cover9-missingpossible 22 条）
> 修复对象：`cover9-survey-candidates.json` 的 **Y01–Y17（缺少 end，targetStem=`missing-end`）** 与
> **O01–O07（end build，targetStem=`end-build`）**，共 **24 条真红**
> 结果：**24/24 红→绿**；`missing-end` 新增 **27 条**用例（115 → 142）、`end-build` 新增 **18 条**（233 → 251）；
> 全量门禁通过（读数见 §6）

## 1. 一句话结论

两个根因，都在 **EOF 收口层**：

1. **Y 组**：`source-file-end-possible-shape.xl.md` 的 EOF 兜底 `isExportDefaultFunction` 分支调
   `FunctionDeclarationShape.FromUnits` 时**没传 `allowAnonymous` / `ambient`**，匿名无体
   `export default function (): void` 抛「函数声明的名字不是标识符」（无返回类型形抛「必须带返回类型」）
   → 被 catch 后落进 `isExportDefault` 的表达式路径，crash「表达式语句没有读完」；另外该分支的
   声明长度下界按「`(...)` 是整单元」算错了（`export default function ()` 只有 4 个代码单元）。
2. **O 组**：同一文件的多语句分界（EOF 尾随分界）只放行「前一个代码单元是 `export`」，
   `export default` ⏎ 声明词 / `export as` ⏎ `namespace` 的**修饰词链内部**换行被当成新语句起点，
   声明头被从中间切开 → 前缀 `export default` / `export as` 走表达式路径 crash
   （「表达式语句没有读完」/「类型意外结束」）。

修复：① `isExportDefaultFunction` 分支传 `ambient=true, allowAnonymous=true`，长度下界改成 4 / async 5；
② 多语句分界前先跑 `IsInsideExportModifierChain`：从候选格向前回溯 `export` / `default` / `as` / `import`
修饰词链，链内部不设边界（`declare` / `abstract` / `async` 与下一格之间换行在 TS 侧仍是两条语句，不吞）。
此外 Y13（后接 `interface`）还叠了 `export-declaration-possible-shape.xl.md` 的 Stage 23 缺陷：
「有闭合 `{` 就收作函数体」把下一条声明的体吞进函数；同一判据（`IsNewDeclarationAfterLineBreak`）
同时补到 Stage 16（`export function`），这是本组唯一超出建议写 scope 的文件（见 §8.1）。

## 2. 改了哪些文件 / file:line

只改 `typescript/**`。`core/**` 与 `typescript/IMPORTANCE.md` **零改动**
（`git diff b465cf6e -- core typescript/IMPORTANCE.md` 为空，0 行）。

### 2.1 `typescript/tokens/files/source-file-end-possible-shape.xl.md`（+55/-12 行）

| file:line | 内容 |
|---|---|
| `:377-400` | 新增 `private static IsInsideExportModifierChain(code, index):bool`：从 `index-1` 向前只回溯 `default` / `as` / `import`，遇到 `export` 返回 true；遇到别的代码单元返回 false |
| `:568-574` | 多语句分界的放行守卫：原来的「前一个代码单元是 `export`」换成调用 `IsInsideExportModifierChain`（链内部任何一格都不设边界） |
| `:910-923` | `isExportDefaultFunction` 的单元数下界：`5 → 4`、async 分支 `6 → 5`（括号是整单元，`export default function ()` 只有 4 格） |
| `:943-951` | `FunctionDeclarationShape.FromUnits(host, codeAt[2], overloadEnd, context, true, true)`：ambient=true（无体无返回类型的重载签名）+ allowAnonymous=true（匿名 default function 的 TS children 没有名字） |

### 2.2 `typescript/tokens/declarations/export-declaration-possible-shape.xl.md`（+40 行，Y13 需要）

| file:line | 内容 |
|---|---|
| `:374-378` | Stage 23（`export default function …`）：`IsNewDeclarationAfterLineBreak` 为真 → `Stage = 3`（无体签名在 ASI 收口），不再把下一条声明的 `{…}` 当函数体 |
| `:441-445` | Stage 16（`export function …`）：同一判据、同一处理（`export function f(): void` ⏎ `interface I {}` 同族红） |
| `:1331-1359` | 新增 `private static IsNewDeclarationAfterLineBreak(units, index):bool`：真换行（LF/CR/LS/PS/含换行的块注释，复用 `StatementScanner.HasLineBreakBefore`）+ 声明/语句关键字（`StatementScanner.IsDeclarationKeyword` + 变量词 / export / import / declare / abstract / async） |

### 2.3 用例与快照

| 文件 | 变化 |
|---|---|
| `typescript/cases/missing-end.ts:215-264` | 追加 cover9 段：**+27 条**（5 组注释，标明 §6 类别与候选 id Y01–Y17） |
| `typescript/cases/end-build.ts:362-399` | 追加 cover9 段：**+18 条**（4 组注释，标明 §6 类别与候选 id O01–O07） |
| `typescript/cases/missing-end.cj-ast.json` / `.ts-ast.json` | `node typescript/cases/ast-json.mjs missing-end` 重生成（不手工合并） |
| `typescript/cases/end-build.cj-ast.json` / `.ts-ast.json` | `node typescript/cases/ast-json.mjs end-build` 重生成 |

## 3. 四问回答（IMPORTANCE §6 的修法框架）

以 **Y01 `export default function (): void`**（匿名、无体、无分号到 EOF）为例：

1. **正确的应该什么时候 build**：这段 leftover 到 EOF 才收口。EOF 终结候选 `Accept` 后，
   `BuildTrailingDeclaration` 认出 `export default function` 声明头（`isExportDefaultFunction`），
   在最后一个真实代码单元后补一个零宽合成 `;`，把整段当一条 `FunctionDeclaration` 建。
   判定它得先认得「`export default` + `function` + 匿名」是一个合法声明头，而不是表达式。
2. **build 时应该提取哪些信息**：TS 的 AST 是 `FunctionDeclaration`，children 顺序
   `ExportKeyword → DefaultKeyword → (AsyncKeyword?) → AsteriskToken? → Identifier? → Parameter[] → ReturnType?`；
   匿名时**没有 Identifier**（Y02 无返回类型时也没有 ReturnType）。`Pos` 含前导 trivia，
   `End` 是返回类型/参数表右边界（无体声明不含任何 Block）。
3. **什么时候 close**：EOF 兜底建出来就 close（`TryToClose`）；`export` / `default` 修饰词由本分支
   手工插回 `Data` 最前，不从 `FunctionDeclarationShape.FromUnits` 走（它不认这两个修饰词）。
4. **close 时应该提取哪些信息**：`ExportKeyword` 的 `Pos` = 前面非 trivia 单元 `End.Index+1`、
   `DefaultKeyword` 区间取 `default` 那格；函数本体从 `codeAt[2]`（`function` 或 `async`）起，
   `FunctionDeclarationShape.FromUnits` 按 `allowAnonymous=true` 收名字缺省、按 `ambient=true` 收
   「无体 + 无返回类型」这一格。

以 **O01 `export default` ⏎ `function f(): void`**（end build）为例：

1. **正确的应该什么时候 build**：TS 的 `parseModifiers` 对 `export` / `default` / `as` / `import`
   不看换行——`export default` ⏎ `function …` 是**一条**声明，换行处不分界。多语句分界必须先
   把整段修饰词链当成声明头，边界只能落在链的**外面**。
2. **build 时应该提取哪些信息**：与 Y01 同一条 `FunctionDeclaration`（有名字时 children 有 Identifier）；
   分界不切在链内部即可，后续建树完全复用 Y 组的分支。
3. **什么时候 close**：同 Y01（EOF 兜底一次建完）。`export as` ⏎ `namespace A` 走既有的
   `NamespaceExportDeclarationShape` 分支（`export / as / namespace` 都不是节点，children 只有名字）。
4. **close 时应该提取哪些信息**：`NamespaceExportDeclaration` 区间从 `export` 起、到名字末；
   后接 `export = A` 时（O07）第二段由既有 `ExportAssignment` 分支建，区间从第二个 `export` 起。

Y13（`export default function (): void` ⏎ `interface I {}`）：**build** 时函数签名在换行处 ASI 收口
（TS 的 `parseFunctionBlockOrSemicolon` 只看紧跟参数表/返回类型的 token，不是 `{` 就不带 body）；
**提取** `FunctionDeclaration`（无 Block）+ `InterfaceDeclaration` 两个节点；**close** 各自在
自己的右边界；close 时不把下一条声明的 `{…}` 当函数体。修复落在 export 候选的 Stage 23/16
（`IsNewDeclarationAfterLineBreak`），与 EOF 兜底同一份「真换行 + 声明词」口径。

## 4. 24 条逐条红→绿证据

修前状态：在**回退修复**（`git checkout --` 两个 .xl.md + 重建 dist + tsc）的构建上逐条实测，
24/24 全红，逐条记录在克隆 `tmp/before-status.txt`（未进仓）；与
`cover9-survey-candidates.json` 的 `currentStatus` 一致。
修后 live：`tmp/yo-probe.mjs`（复用 `tests/cover9/probe.mjs` 的 measure 口径，读候选库 Y/O 两组）
24/24 **green**。

| id | input（`\n`=LF） | 修前（实测） | 修后 live |
|---|---|---|---|
| Y01 | `export default function (): void` | red-crash: 表达式语句没有读完 | green |
| Y02 | `export default function ()` | red-crash: 表达式语句没有读完 | green |
| Y03 | `export default function* (): void` | red-crash: 表达式语句没有读完 | green |
| Y04 | `export default async function (): void` | red-crash: 表达式语句没有读完 | green |
| Y05 | `export default function (a: A): B` | red-crash: 表达式语句没有读完 | green |
| Y06 | `export default function (): void;` | red-crash: 表达式语句没有读完 | green |
| Y07 | `export default function (): void\n` | red-crash: 表达式语句没有读完 | green |
| Y08 | `export default function (): void\nconst x = 1;` | red-crash: 表达式语句没有读完 | green |
| Y09 | `export default function (): void\n// c` | red-crash: 表达式语句没有读完 | green |
| Y10 | `const a = 1;\nexport default function (): void` | red-crash: 表达式语句没有读完 | green |
| Y11 | `declare function f(): void\nexport default function (): void` | red-crash: 表达式语句没有读完 | green |
| Y12 | `interface I {}\nexport default function (): void` | red-crash: 表达式语句没有读完 | green |
| Y13 | `export default function (): void\ninterface I {}` | red-diff: 结构 VoidKeyword -1 / InterfaceDeclaration -1 / Identifier -1 / Block +1；位置 FunctionDeclaration ts[0,32] cj[0,47] | green |
| Y14 | `export default function (): void\nexport default function (): void` | red-crash: 表达式语句没有读完 | green |
| Y15 | `export default\nfunction (): void` | red-crash: 表达式语句没有读完 | green |
| Y16 | `export default\nfunction* g(): void` | red-crash: 表达式语句没有读完 | green |
| Y17 | `export default\nasync function (): void` | red-crash: 表达式语句没有读完 | green |
| O01 | `export default\nfunction f(): void` | red-crash: 表达式语句没有读完 | green |
| O02 | `export as\nnamespace A` | red-crash: 类型意外结束 | green |
| O03 | `export\nas\nnamespace A` | red-crash: 类型意外结束 | green |
| O04 | `export as /* \n */ namespace A` | red-crash: 类型意外结束 | green |
| O05 | `export as\rnamespace A` | red-crash: 类型意外结束 | green |
| O06 | `export as\u2028namespace A` | red-crash: 类型意外结束 | green |
| O07 | `export as\nnamespace A\nexport = A` | red-crash: 类型意外结束 | green |

**根因对照（file:line）**

- Y01–Y12、Y14–Y17：`source-file-end-possible-shape.xl.md` 的 `isExportDefaultFunction` 分支
  （`FromUnits` 调用在 `:951`）缺 `allowAnonymous` / `ambient`；Y15–Y17 还叠加多语句分界切链
  （旧守卫在 `:566-575` 的位置）。Y02 另需长度下界修正（`:913`）。
- Y13：`export-declaration-possible-shape.xl.md` 的 Stage 23（`:366` 起）只等「任意闭合 `{`」，
  把 interface 体当函数体；`FunctionDeclarationShape.FromUnits` 同时因返回类型被吞而抛
  「函数声明的返回类型没有读完」（具名形 `export default function f(): void` ⏎ `interface I {}` 是 crash）。
- O01：多语句分界的放行守卫只认「前一格是 `export`」，前一格是 `default` 时链被切开 → 前缀
  `export default` 走表达式路径 crash。
- O02–O07：同一分界问题，前一格是 `as`；前缀 `export as` 进 `ExpressionBuilder.ParseFollowingType`
  （`type-builder:621`）把 `as` 当类型断言 → 「类型意外结束」。

## 5. 新增用例（N = 45：missing-end 27 + end-build 18）

`typescript/cases/missing-end.ts:215-264`（+27）与 `typescript/cases/end-build.ts:362-399`（+18）
末尾各追加 cover9 段（只 append，不改历史行；一行一例、行内 `\n` 由 ast-json.mjs 还原；
CR / LS / PS 用行内字面字符；段注释写 §6 类别与候选 id）。

| stem | 组 | 条数 | 内容 | 候选 id |
|---|---|---|---|---|
| missing-end | ① base + trivia | 8 | 匿名无体 + 返回类型：base、行尾注释、块注释、末尾换行、空行、真实 `;`、多空格、无返回类型 | Y01/Y02/Y06/Y07 |
| missing-end | ② 匿名形态 | 3 | `function*` / `async function` / 带形参返回类型 | Y03–Y05 |
| missing-end | ③ 声明头换行 | 4 | `export default` ⏎ `function`（含前导空格）、生成器具名、async | Y15–Y17 |
| missing-end | ④ 前后有语句 | 7 | 前置 const / declare 无体函数 / interface；后接语句 / 行注释；两条连排（含生成器） | Y08–Y12/Y14 |
| missing-end | ⑤ 后接声明（吞体） | 5 | interface / class / enum / 具名形 interface / interface 后再跟语句 | Y13 同族 |
| end-build | ① export default 链 | 7 | 具名函数 / 生成器 / async / 行注释 / 含换行块注释 / 双换行 / 后接语句 | O01 |
| end-build | ② export as 链 | 7 | base / 多空格 / 双换行 / 含换行块注释 / CR / LS / PS | O02–O06 |
| end-build | ③ 后接 export = | 2 | base、双换行 | O07 |
| end-build | ④ 同族附加 | 2 | `export function f(): void` ⏎ interface / class（Stage 16 同一判据） | 同族 |

- **红→绿验证**：45 条全部在「回退修复」的构建上实测为 **red**（逐条见 `tmp/before-status.txt`），
  恢复修复后 45/45 green（快照 diff 0/0/0 即逐节点一致）。
- 同 stem 内无精确重复（脚本核对：missing-end 142 条、end-build 251 条两两不同）。
- 快照：`node typescript/cases/ast-json.mjs missing-end end-build` →
  **missing-end cases=142 cj-ok=142**、**end-build cases=251 cj-ok=251**；
  `node typescript/cases/ast-json-diff.mjs missing-end end-build` → **142/142、251/251，结构 0 / 位置 0 / 字段 0**。
- 同族**已绿对照**（修前已绿，按 endbuild 先例未收作 case）：`export\ndefault\nfoo`、
  `export\nimport\nx = A.B`、`export\ndefault\nclass C {}`、`export\ndefault\nabstract class C {}`、
  `export as\nnamespace A;`。
- CRLF 变体（`export as\r\nnamespace A`）修后实测 green，但 case 文件「一行一例」按 `\n` 切行，
  CRLF 会被切成两条物理行，**无法编码成单条用例**，故未收（见 §8.3）。

## 6. 全量门禁读数（克隆内，修复后）

| 门禁 | 期望 | 实测 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5990+N | **6035 / 6035**（+45） |
| `node typescript/cases/ast-json-diff.mjs` | 0/0/0 | **6035/6035，结构 0 / 位置 0 / 字段 0** |
| `node typescript/cases/token-ast.mjs --quiet` | 不差于 1715 | **1715（ok 1705 / ts-invalid 10 / crash 0 / diff 0 / gap-now-passing 0）**，未变 |
| `node tests/parse/validate.mjs` | 1719+M / 0 | **1719 条 / 0 条不合格**（本轮无 token 夹具，M=0） |
| `node typescript/cases/real-dts-ast.mjs` | 226/226 | **226 / 226** |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | 0 | **0 error** |
| `xl_check(paths=["core","typescript"])` | 0 error | **864 file(s)，0 error(s)**（另 1 条既有 E1107 重复类型 warning：`import-attributes-possible-shape` 两份声明，与本轮文件无关；W3102/W3103 既有 warning 未逐条计） |
| `git diff b465cf6e -- core typescript/IMPORTANCE.md` | 空 | **空（0 行）** |
| `node tests/cover9/probe.mjs --quiet` | 其余 stem 不受影响 | **88 条：red=20 green=68**，与基线完全一致（A 45 全绿、B 15 红、C 5 红） |
| `tmp/yo-probe.mjs` | 本组 24 条转绿 | **24/24 green**（Y 17 + O 7） |
| `git status --short` | 只允许未跟踪 `tmp/` | 提交后：`?? tmp/`（一次性尺子与 before 证据，均不进仓） |

## 7. basic token 是否牵涉

**不牵涉。** 两处缺陷都在 shape / possible-shape 层（EOF 兜底分支的建树参数与长度判据、
多语句分界的修饰词链判据、export 候选的 body 终结点），`core/syntax/basic-tokens/**` 零改动，
`core/**` 与 `typescript/IMPORTANCE.md` 零 diff。没有新增 token 夹具，`basic-token.ts` 未动；
CR / LS / PS 只作为 **case 输入的行内字面字符**（`end-build.ts` 各 1 个），不是 token 规则改动。

## 8. 遗留风险（供合并成员 / 下一轮）

1. **写 scope 外的必要改动**：任务建议 scope 是 `source-file-end-possible-shape.xl.md`（+ 如需
   `function-declaration-shape.xl.md`），但 Y13 的「export 候选吞下一条声明体」只能在
   `typescript/tokens/declarations/export-declaration-possible-shape.xl.md` 修（Stage 16/23 的 body
   终结点）。已按最小改动落 3 处（2 个 Stage 守卫 + 1 个 private static 判据），未碰
   `function-declaration-shape.xl.md`。同文件此前已被 cover9-endbuild 改过（`@` 判据），
   本轮的 `IsNewDeclarationAfterLineBreak` 与它的 `IsDecoratedDeclarationStart` 并列，口径一致。
2. **Stage 23 body 判据仍有残余红（不在本组候选内）**：换行后以**非关键字**开头的语句里若含顶层
   `{…}`，仍会被当函数体——`export default function (): void\nz = {};`（本仓造出
   `FunctionDeclaration[0,39)` + EmptyStatement，TS 是 `FunctionDeclaration[0,32)` + ExpressionStatement[0,39)）、
   `export default function (): void\nfoo({});`（吞掉表达式语句）。彻底修需要候选按「参数表 / 返回类型
   结束后紧跟的 token 才是 body」流式判定（或直接让 `FunctionDeclarationShape.FromUnits` 定位 true body），
   本轮未做，登记为下一轮候选。
3. **CRLF 不能进 case**：case 文件按 `\n` 切行，`\r\n` 会被拆成两条物理行；本组的 CR / LS / PS
   变体已用行内字面字符（`end-build.ts` 各 1 个），CRLF 只做了修复后实测（green，未收 case）。
4. **`export default async` ⏎ 声明词的边界**：TS 里 `export default async` ⏎ `function f(): void`
   是 **ExportAssignment + FunctionDeclaration**（两条），本轮的链判据只回溯
   `default / as / import`，不把 `async` 当链，因此不回归；`export default\nasync function` 仍是一条
   FunctionDeclaration（已验证，并收进 Y17）。
5. **probe 存储值偏差**：`tests/cover9/candidates.json` 不在写 scope，未更新；官方 probe 仍会因
   「存储值 vs 实测」不一致 exit 1（**预期**）。本组 24 条的 live 证据用克隆 `tmp/yo-probe.mjs`
   （只读父目录 `cover9-survey-candidates.json`），终验/合并时由维护 candidates.json 的角色统一更新基线。
6. **没有 push / merge**：只提交到本地 `cover9-missingend` 分支；工作区提交后只允许未跟踪 `tmp/`
   （一次性尺子、before 证据，均未进仓）。
