# cover9 · end build 组（A01–A16 + C01）真红修复报告

> 作者：auth-endbuild（cover9 轮次 A 组 end-build 工作流）
> 克隆/分支：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-endbuild`，分支 `cover9-endbuild`
> 起点：`4d2dafe358ea633bc12653e73fd1051cfae03983`（= 主仓 `feature/quick-parse` HEAD）
> 修复对象：17 条真红（`tests/cover9/candidates.json` 的 A01–A16 + C01），targetStem=`end-build`
> 结果：**17/17 红→绿**；`end-build` 新增 **39 条**用例（194 → 233）；全量门禁通过（读数见 §6）

## 1. 一句话结论

「无体声明 / `import =` 之后换行接**装饰器声明头**」的 ASI 收口错，根因不在函数候选的 `@` 判据（cover8 已修），
而在两处：**EOF 尾随分界把「`@dec`」与「声明词」切成两段**，以及**装饰器尾随段的分派面只接 class**；
另外 `export function` / `export default function` 候选会越过 ASI 把下一条声明的 `{…}` 当函数体。
修复＝把「装饰器前缀（可跨行、可多个）+ 修饰词 + 声明词」做成**一份共用判据**
（`StatementScanner.DecoratedHeadKeyword` / `IsDecoratedDeclarationStart`），EOF 分界用它把整段声明头
当一个起点、尾随段按声明词分派到各 `FromUnits`；`let ⏎ let = 1` 另加「前一段能否收口」判据。

## 2. 改了哪些文件 / file:line

只改 `typescript/**`。core / `typescript/IMPORTANCE.md` **零改动**（`git diff 4d2dafe3..HEAD -- core typescript/IMPORTANCE.md` 为空）。

### 2.1 `typescript/tokens/statements/statement-scanner.xl.md`（+111 行，共享判据的新家）

| file:line | 内容 |
|---|---|
| `statement-scanner.xl.md:966` | `HasLineBreakBefore(units, at)`：前一非 trivia 单元与当前格之间有没有换行（与 `NoLineBreakBetween` 同一份 `LineTerminator` 口径） |
| `statement-scanner.xl.md:986` | `IsDecoratedDeclarationStart(units, at)`：`@` + 换行 = 下一条装饰器声明的起点（**唯一一份**，function 候选与 export 候选都读它） |
| `statement-scanner.xl.md:1004` | `IsDeclarationKeyword(text)`：装饰器声明头的声明词表 `class/interface/enum/type/namespace/module/global/function`（`abstract` 是修饰词；变量词不在此表，留给 A17–A21 的 `BuildDecoratedStatement`） |
| `statement-scanner.xl.md:1016` | `DecoratedHeadKeyword(code, at)`：`code[at] = @` 起，扫完「装饰器表达式（可多个、可 `.` 限定名、可 `(…)` 调用）+ 修饰词（export/default/declare/abstract/async/const）+ 声明词」，返回声明词下标；不是声明头返回 `-1` |

选 `statement-scanner` 的理由与它已有的 `EndsExpression` 一致：不给
`statement-scanner → statement-builder` 造成循环依赖；`source-file-end`、`function-declaration-possible-shape`、
`export-declaration-possible-shape` 都只依赖它，没有反向依赖。

### 2.2 `typescript/tokens/files/source-file-end-possible-shape.xl.md`（EOF 尾随分界 + 装饰器分派）

| file:line | 内容 |
|---|---|
| `source-file-end-possible-shape.xl.md:31` | 新增 `import { StatementScanner }` |
| `:450-456` | 段首就是 `@` 时先算 `decoratedHeadEnd = DecoratedHeadKeyword(code, 0)`：整段是**一个**声明头 |
| `:472-475` | 边界循环：`index <= decoratedHeadEnd` 的格（装饰器 / 修饰词 / 声明词本身）**不是**新语句起点，跳过 |
| `:491-497` | 换行后的 `@`：`boundary = index`，同时算出它所属声明头的 `decoratedHeadEnd`（头内部的 `class` / `export` 不再改边界） |
| `:507-515` | **「前一段能否收口」判据**：前缀恰好是单独一个 `let` 且下一格能起绑定时，换行**不**构成多语句分界（C01） |
| `:585-598` | 装饰器尾随段：原来只接 `ClassDeclarationShape.FromUnits`，现按 `DecoratedHeadKeyword` 认出的**声明词**分派 class / interface / enum / type / function / namespace·module·global |
| `:1361-1395` | 新增 `private static BuildModuleDeclaration(host, start, at, context)`：模块声明的 `code + positions` 两数组组装（`ModuleDeclarationShape.FromUnits` 的入口要求），装饰器 / export / declare 前缀由它自己消费 |

### 2.3 `typescript/tokens/declarations/export-declaration-possible-shape.xl.md`（+13 行）

| file:line | 内容 |
|---|---|
| `export-declaration-possible-shape.xl.md:368-373` | Stage 16（`export function …` 等函数体）：遇到「换行 + `@`」→ `Stage = 3`（Reject），本条是**无体签名**，交给 EOF 兜底建；不再把下一条声明的 `{…}` 当函数体 |
| `:428-434` | Stage 23（`export default function …`）同一判据、同一处理 |

### 2.4 `typescript/tokens/declarations/function-declaration-possible-shape.xl.md`（-4/+9 行）

| file:line | 内容 |
|---|---|
| `function-declaration-possible-shape.xl.md:21` | 新增 `import { StatementScanner }` |
| `:375-380` | `IsDecoratedDeclarationStart` 的实现改为委托 `StatementScanner.IsDecoratedDeclarationStart`（原来是本地 `@` + `LineBreakBefore` 的第二份实现）；语义不变，判据只剩一份 |

### 2.5 用例与快照

| 文件 | 变化 |
|---|---|
| `typescript/cases/end-build.ts:294-360` | 追加「cover9」段：**+39 条**用例（含 6 组注释，标明 §6 类别与候选 id） |
| `typescript/cases/end-build.cj-ast.json` | 由 `node typescript/cases/ast-json.mjs end-build` 重生成（不手工合并） |
| `typescript/cases/end-build.ts-ast.json` | 同上 |

## 3. 四问回答（IMPORTANCE §6 的修法框架）

以「`declare function f(): void` ⏎ `@dec` ⏎ `class C {}`」为例：

1. **正确的应该什么时候 build**：前一条**无体声明**在换行处就收口（TS 的 ASI 在 `void` 之后插入语句边界），
   由 EOF 尾随分界把「前段」与「装饰器声明头」分开：前段走 `FunctionDeclarationShape.FromUnits`（无 body），
   装饰器段在**整段声明头到齐**（`@… + 修饰词 + 声明词`）时一次建完。分界必须落在**声明头的 `@` 上**，
   而不是头内部的声明词上——这就是 A 组红的地方。
2. **build 时应该提取哪些信息**：本仓建的是 `FunctionDeclaration`：`DeclareKeyword`、名字、返回类型，
   **body = null**（下一条声明的 `{…}` 不属于它）；装饰器段的 `Decorator` 是下一条声明 children 的**第一项**，
   修饰词（export/default/declare/abstract）按 TS 书写顺序，区间从 `@` 起。
3. **什么时候 close**：无体声明在 ASI 边界（换行处）close；装饰器声明在「声明头到齐」时 build，
   到自己的 body `}` / `;` 时 close。`export function` / `export default function` 候选必须在
   「换行 + `@`」处**主动拒绝**（Stage 3），否则会等到下一条声明的 `{…}` 才 close（超收）。
4. **close 时应该提取哪些信息**：前一条的区间止于无体签名的最后单元（不含下一条声明的任何单元）；
   装饰器声明区间从 `@` 起、含自己的 body / `;`，`Pos` 含前导 trivia（与实际位置差 0/0/0 由快照核对）。

C01（`let` ⏎ `let = 1`）：**build** 在整段收口时由 `BuildStatementSegments` 按一条 `VariableStatement` 建；
提取 `VariableDeclarationList`（两个声明符：`let` 与 `let = 1`）；**close** 在 EOF；close 时不切分——
判据是「前缀（单独 `let`）收不住一条完整语句」，与 `StatementScanner.ScanRoot` 的 `isLetDeclaration`
（`let` 后能起绑定就按声明读）同口径。

## 4. 17 条逐条红→绿证据

修前消息取自 `tests/cover9/candidates.json` 的 `currentStatus`（并在 HEAD 上复跑确认）；
修后 live 取自 `node tests/cover9/probe.mjs`（全量输出 `! A01 diag=0 green` …）。probe 会因
「存储值 vs 实测」不一致 exit 1（**预期**；`candidates.json` 不在本组写 scope 内，未改）。

| id | input（`\n`=LF） | 修前 | 修后 live |
|---|---|---|---|
| A01 | `declare function gf(): void\n@dec\nclass C {}` | red-crash: 不支持的表达式起点 | green |
| A02 | `function f(): void\n@dec\nclass C {}` | red-crash: 不支持的表达式起点 | green |
| A03 | `export function f(): void\n@dec\nclass C {}` | red-crash: 函数声明的返回类型没有读完 | green |
| A04 | `export default function f(): void\n@dec\nclass C {}` | red-crash: 函数声明的返回类型没有读完 | green |
| A05 | `import x = require("m")\n@dec\nclass C {}` | red-crash: 不支持的表达式起点 | green |
| A06 | `declare function f(): void\n@a @b\nclass C {}` | red-crash: 不支持的表达式起点 | green |
| A07 | `declare function f(): void\n@a\n@b\nclass C {}` | red-crash: 不支持的表达式起点 | green |
| A08 | `declare function f(): void\n@dec /*c*/\nclass C {}` | red-crash: 不支持的表达式起点 | green |
| A09 | `declare function f(): void\n@dec\ninterface I {}` | red-crash: 不支持的表达式起点 | green |
| A10 | `declare function f(): void\n@dec\nenum E { A }` | red-crash: 不支持的表达式起点 | green |
| A11 | `declare function f(): void\n@dec\ntype T = number;` | red-crash: 不支持的表达式起点 | green |
| A12 | `declare function f(): void\n@dec\nnamespace N {}` | red-crash: 不支持的表达式起点 | green |
| A13 | `declare function f(): void\n@dec\nabstract class C {}` | red-crash: 不支持的表达式起点 | green |
| A14 | `declare function f(): void\n@dec\nexport class C {}` | red-crash: 不支持的表达式起点 | green |
| A15 | `declare function f(): void\n@dec\nfunction g() {}` | red-crash: 不支持的表达式起点 | green |
| A16 | `declare function f(): void\n@dec\nclass C {}\nlet z = 1` | red-crash: 不支持的表达式起点 | green |
| C01 | `let\nlet = 1` | red-diff: 结构 VariableStatement -1 / VariableDeclarationList -1 / VariableDeclaration -1 / Identifier +1 / ExpressionStatement +2 / BinaryExpression +1 / EqualsToken +1 | green |

**根因对照（file:line）**

- A01–A08、A13–A16：`source-file-end-possible-shape.xl.md` 的 EOF 分界循环（旧 `:447-515`）在 `@` 处设了
  `boundary`，随后又被声明头内部的 `class` / `abstract` / `export`（同样「换行 + 声明关键字」）**覆盖**，
  于是前缀停在 `@dec` 上、`@dec` 单独建不出来 → `ExpressionStatementShape.FromUnits` 抛「不支持的表达式起点」。
- A03/A04：`export-declaration-possible-shape.xl.md` 的 `export function` / `export default function` 体扫描
  （旧 Stage 16 / Stage 23）只等「已闭合的 `{`」，越过返回类型之后的 ASI，把下一条声明（装饰器 class）的
  体当函数体 → `FunctionDeclarationShape.FromUnits` 抛「函数声明的返回类型没有读完」。
- A05：同一 EOF 分界问题；前缀 `import x = require("m")` 的 `isImportEquals` 分支本来就能建，修好分界即绿。
- A09–A12、A15：分界修好之后，装饰器尾随段仍只分派 class（旧 `:559-574` 只认 `ClassDeclarationShape`），
  interface / enum / type / namespace / function 落回 `false` → 表达式兜底 crash。按声明词分派即绿。
- C01：EOF 分界对「下一行以声明关键字开头」无条件切分（旧 `:483-493` 的 `let` 分支），缺少
  「前一段能否收住完整语句」检查 → 切成 `ExpressionStatement(let)` + `ExpressionStatement(let = 1)`。
  加入 lone-`let` 前缀判据后整段走 `BuildStatementSegments` 建成一条 `VariableStatement`。

## 5. 新增用例（N = 39）

`typescript/cases/end-build.ts` 末尾追加 `cover9` 段（不重排、不改历史行），结构：

| 组 | 条数 | 内容 | 候选 id |
|---|---|---|---|
| ① base + trivia/重复形 | 7 | `declare function` 无体签名 ⏎ `@dec` ⏎ `class`：base、行尾注释、词间块注释、装饰器前注释行、空行、尾部注释、多成员类 | A01 |
| ② 前缀形态 | 4 | 裸 `function` / `export function` / `export default function` / `import =` | A02–A05 |
| ③ 装饰器前缀形态 | 5 | 多装饰器同行 / 逐行 / 装饰器后块注释 / 三装饰器逐行 / 装饰器间注释 | A06–A08 |
| ④ 声明词分派 | 13 | `abstract class` / `export class` / interface / enum / type / namespace / function（各带 base 与重复形） | A09–A15 |
| ⑤ 第三条语句 | 3 | 装饰器 class / interface 之后再跟一条声明 | A16 |
| ⑥ C01 | 6 | `let ⏎ let = 1` base、行尾注释、块注释、空行、多声明列表、末尾换行 | C01 |

- 一行一例、行内 `\n` 由 `ast-json.mjs` 的 decode 还原；本段纯 LF（无裸 CR / LS / PS，已用脚本核过）。
- 同 stem 内**无精确重复**（脚本核对 39 条两两不同；与 cover5/cover8 段也不重复）。
- **红→绿验证**：用 `docs/cover9-endbuild.md` 作者侧的一次性尺子，在**回退到修复前**（`git checkout --` 四个 .xl.md +
  重建 dist + tsc）的构建上逐条实测：39 条里 **39 条 red**（另有一条 `let\nlet = 1;` 修前已绿，未收作 case）。
  恢复修复后 39/39 green。证据文件在克隆 `tmp/`（未进仓）：`tmp/before-status.txt`。
- `node typescript/cases/ast-json.mjs end-build` → **cases=233 cj-ok=233 cj-fail=0**；
  `node typescript/cases/ast-json-diff.mjs end-build` → **233/233，结构 0 / 位置 0 / 字段 0**。

## 6. 全量门禁读数（克隆内，修复后）

| 门禁 | 期望 | 实测 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5929+N | **5968 / 5968**（+39） |
| `node typescript/cases/ast-json-diff.mjs` | 0/0/0 | **5968/5968，结构 0 / 位置 0 / 字段 0** |
| `node typescript/cases/token-ast.mjs --quiet` | 不差于 1715 | **1715（ok 1705 / ts-invalid 10 / crash 0 / diff 0），未变** |
| `node tests/parse/validate.mjs` | 1719+M / 0 | **1719 条 / 0 条不合格，未变**（本轮无 token 夹具） |
| `node typescript/cases/real-dts-ast.mjs` | 226/226 | **226 / 226** |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | 0 | **0 error** |
| `xl_check(paths=["core","typescript"])` | 0 error | **864 file(s)，0 error(s)，2461 warning(s)**（既有 W3102/W3103，无新增 E2004） |
| `git diff 4d2dafe3..HEAD -- core typescript/IMPORTANCE.md` | 空 | **空（0 行）** |
| `node tests/cover9/probe.mjs` | 本组 17 条转绿 | **A01–A16 + C01 全部 live=green**；其余未动：A17–A21（5）、B01–B16（15）、C02–C08（7）仍 red，与本组无关 |

## 7. basic token 是否牵涉

**不牵涉。** 本轮所有缺陷都在 shape / possible-shape 层（候选的 ASI 判据、EOF 分派、装饰器声明头判据），
`core/syntax/basic-tokens/**` 不需要改，`core/**` 与 `typescript/IMPORTANCE.md` 零 diff。
没有新增 token 夹具，`basic-token.ts` 未动（按 handoff §6 Guardrail 5，不涉及 CR/LS/PS 夹具）。

## 8. 遗留风险（供合并成员 / 下一轮）

1. **共享文件的重叠仲裁**：`statement-scanner.xl.md` 新增的 4 个静态方法被 4 个文件读取
   （`source-file-end` / `function-declaration-possible-shape` / `export-declaration-possible-shape` /
   本报告的用例），**没有改 `statement-builder.xl.md`**（A17–A21 作者的 `ScanDecoratedHead` /
   `BuildDecoratedStatement` 是同一套判据的另一处实现）。合并时建议：`statement-builder.ScanDecoratedHead`
   的「装饰器 + 修饰词 + 声明词」扫描改为委托 `StatementScanner.DecoratedHeadKeyword`，
   但分派表（变量声明通道）仍由 A17–A21 作者拥有——两处判据若继续各写一份，会出现「候选说不是声明头、
   builder 说是」的分歧。本轮遗留的 file:line 已在 §2 列全。
2. **装饰器 + `export` 的 enum / function / type**：本轮装饰器分派按声明词交给各自 `FromUnits`；
   `class` / `interface` / `namespace·module` 的 `FromUnits` 自己消费 `export`，但
   `enum` / `function` / `type` 的 `FromUnits` 不消费（`function` 只认 declare/async）。
   因此 `@dec` ⏎ `export enum E { A }` 一类仍会退回表达式兜底。**未在 candidates 里、本轮不修**；
   要修可照 `source-file-end` 既有的 `isExportFunction` 手法（从声明词建 + 把 `ExportKeyword` 插回
   children 最前），登记为下一轮候选。
3. **装饰器表达式扫描器的边界**：`DecoratedHeadKeyword` 是轻量结构扫描（`@name` / `@a.b` / `@a(…)` /
   `@(…)`），不建表达式、也不处理「装饰器表达式自身跨行续接」（`@a` ⏎ `.b`）或元素访问装饰器。
   这类形态在尾随段会返回 `-1` → 退回原逻辑（不比修前差，但也不修）。probe 候选里没有这种形态。
4. **`let` 判据的边界**：只覆盖「前缀恰好是单独一个 `let` + 下一格能起绑定」。
   `let ⏎ let x = 1` 在 TS 侧本身 `parseDiagnostics=1`（不是 case）；`var ⏎ var` / `const ⏎ const` 同样 TS 非法。
   `let ⏎ let = 1, x = 2`（多声明列表）已收进用例并绿。
5. **probe 的存储值会报偏差**：`tests/cover9/candidates.json` 不在本组写 scope，未更新，probe 会 exit 1
   （17 条 stored=red / live=green）。终验/合并时若需要干净 exit 0，由维护 candidates.json 的角色统一更新基线。
6. **没有 push / merge**：只提交到本地 `cover9-endbuild` 分支；工作区提交后只允许未跟踪 `tmp/`（本报告 §5
   的一次性证据尺子与复现脚本都在 `tmp/`，未进仓）。
