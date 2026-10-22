# COVER9 HANDOFF — 下一批候选 case 库与交接说明

> 本轮 cover9 的**唯一入口**：新对话请先读本文件，再按 §1 的 kickoff prompt 启动。
> 本轮产物只有两个新文件：`tests/cover9/{candidates.json,probe.mjs}` 与本文件；
> 分支 `cover9-prep`（从 `feature/quick-parse` 拉出，不 merge / 不 push）。
> 本文件不含已修复代码——它是下一批修复的**起点**。

## 0. 一句话状态

主仓 `feature/quick-parse` @ **`1acf9d1b`**（代码 `cfb06914` = cover8 全量合并 + cover8 FINAL）。
全量门禁：**ast-json 5929/5929、diff 0/0/0、token-ast 1715（ok 1705 / ts-invalid 10）、
cases:check 1719/0、real-dts 226/226、tsc 0、xl_check 0 error**；
`git diff 5362a38…HEAD -- core typescript/IMPORTANCE.md` 为空（core 与 IMPORTANCE 零改动）。
下一批经实测的候选：**88 条，red 44 / green 44 / ts-invalid 0**（TS 6.0.3 `parseDiagnostics=0` 硬性口径）。

## 1. 可直接粘贴给新对话的 kickoff prompt

```text
你是 cover9 轮次的 Lead。起点：xl-example 主仓 feature/quick-parse @ 1acf9d1b（若已前进，以
最新 HEAD 为准，但先跑基线门禁确认读数与交接文档一致）。上一轮 cover5–cover8 已完成，本轮目标：
把 COVER9-HANDOFF.md 里的候选 case 库（tests/cover9/）逐条修成真红→绿，并沉淀成标准 case。

【第一件事】读 docs/COVER9-HANDOFF.md（本文件）全文；再读 typescript/IMPORTANCE.md §3–§7、
tests/cases/README.md（用例夹具/TAGS/GHOST_TAGS/xl:end 规则）、COVER5-WORKFLOW.md /
COVER6-WORKFLOW.md / COVER8-WORKFLOW.md、docs/cover8-FINAL.md §7、docs/cover5-FINAL.md §4、
docs/cover6-FINAL.md §8。不要凭记忆施工。

【当前门禁（新对话必须先复跑确认）】
- 全量：node typescript/cases/ast-json.mjs → 5929/5929；ast-json-diff.mjs → 5929/5929 且 0/0/0
- node typescript/cases/token-ast.mjs --quiet → 1715（ok 1705 / ts-invalid 10 / crash 0 / diff 0）
- node tests/parse/validate.mjs → 1719 条用例 / 0 条不合格
- node typescript/cases/real-dts-ast.mjs → 226/226
- .\node_modules\.bin\tsc.cmd -p tsconfig.json → 0
- git diff <round-start>..HEAD -- core typescript/IMPORTANCE.md → 空
- 候选：node tests/cover9/probe.mjs → 期望 88 条 red=44 green=44 ts-invalid=0（若与 HEAD 不符，
  说明已有先行修改，按 probe 的 “存储值 vs 实测” 提示重新定基线，不要照抄）

【团队模式（成员上限 8，每个 agent ≤10 轮）】
1 个 infra/prep 成员（建各作者克隆、统一重建 xl_build(force, core+typescript)+tsc、跑门禁、维护合并队列）
+ 3 个并行 workstream 作者（A 装饰器声明头 / B 换行口径统一 / C cover5-6-8 遗留；每人一个独立克隆、
写 scope 只碰自己组的 typescript 文件与目标 case 文件）
+ 1 个独立合并成员（按序 merge、冲突按「取一侧后重生成快照」处理、合并后全量复跑）
+ 1 个独立终验成员（只读 + 只写 docs/cover9-FINAL.md，独立抽样 21 条真红、核 core 零 diff、跑全量门禁）。
Lead 只做分派、进度、裁定，不亲自改代码（或由 Lead 兼 infra，但终验必须独立）。

【任务批次】COVER9-HANDOFF.md §3 的 A/B/C 三组，候选 id 与 rootCause/fixSketch 已逐条给出；
每组只接受「TS parseDiagnostics=0 且本仓 crash/AST 不一致」的真红（probe 的 red 行），
green 行是回归对照、不是 case。修完后按 IMPORTANCE §5 追加用例（base 先行、trivia/重复形变体、
一行一例、行内 \n 转义、同 stem 去重）。

【验收门禁（合并后 + 终验）】
ast-json 5929+N（N=新增 case 数，逐 stem 核）；diff 0/0/0；token-ast 不差于 1715；
cases:check 1719+M（新用例不得引入不合格）；real-dts 226/226；tsc 0；xl_check 0 error；
core 与 IMPORTANCE 零 diff；tmp/ 未提交；工作区干净。
【禁止】不 push、不 merge 到主仓（除非 Lead 指定合并成员）；不改 core（确需改 core 必须先让用户批准
并记录 file:line）；不改既有 case 文件/快照/夹具（只 append 目标 stem 的 cover9 段）；
不手工合并 JSON 快照（冲突取一侧后用 ast-json.mjs <stem> 重生成）；不提交 tmp/。
```

## 2. 当前状态 / 仓库结构 / 构建链

- HEAD：`1acf9d1ba69f05f15222311fe538711215da5d72`；代码面 `cfb06914`（merge cover8-exportasi）；
  cover8 FINAL 在 `1acf9d1b`。
- 轮次基线链（最近）：cover5 `db7d13c3`（5709） → cover6 `ff2ea1e8`（5784） → cover7 `3fcd2e37`（5797）
  → cover8 `cfb06914`（5929）。回滚点 = 当前轮次起点；单组回滚 = revert 对应 merge（见各 FINAL §合并记录）。
- 构建链：`*.xl.md` --DSH `xl_build`--> `dist/ts/**/*.ts` --`tsc`--> `build/ts/**/*.js`；
  用例读 `build/ts`，所以**改完 `.xl.md` 必须重建**：
  `xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist", force=true)`
  （首次到新 HEAD 用 force 全量；之后只给改过的文件/目录即可）→ `.\node_modules\.bin\tsc.cmd -p tsconfig.json`。
- 用例目录：`typescript/cases/*.ts`（一行一例、行内 `\n` 由 `ast-json.mjs` 的 decode 还原；47 个 construct）；
  `tests/cases/token/**` 是 token 语料夹具（`cases:check` / `token-ast` 用）。
- 标准 stem（本批 target）：`typescript/cases/{end-build,missing-possible,end-compute,possible-build}.ts`。

## 3. 待做批次（候选库 = `tests/cover9/candidates.json`，实测口径见 §4）

> 记录字段：`id`、`group`、`input`（转义写法：`\n`=LF、`\r`=CR、`\u2028`/`\u2029`=LS/PS）、`tsDiag`、
> `tsAstSummary`、`currentStatus`（green / red-crash / red-diff）、`category`（§6 七类）、`targetStem`、
> `rootCause`（file:line）、`fixSketch`（一句话）。**green 不是 case**（已绿或回归对照）。

### A 组：装饰器声明头 / source-file-end 分派面（45 条：red 21 / green 24）

**red 21 条（修复对象）**

| id | input（`\n`=换行） | 现状 | 归属 / targetStem | 根因（file:line） |
|---|---|---|---|---|
| A01 | `declare function gf(): void\n@dec\nclass C {}` | crash「不支持的表达式起点」 | end compute（次 possible build）→ `end-build` | `function-declaration-possible-shape.xl.md:234/:266` `IsDecoratedDeclarationStart`（:363）只认「换行 + @ + 同行 class」；`@` 与 `class` 各占一行时不收口，吞到下一条声明 |
| A02 | `function f(): void\n@dec\nclass C {}` | 同上 | 同上 → `end-build` | 同 A01（无 declare 的 overload 前缀） |
| A03 | `export function f(): void\n@dec\nclass C {}` | crash「函数声明的返回类型没有读完」 | 同上 → `end-build` | 同 A01（export 前缀） |
| A04 | `export default function f(): void\n@dec\nclass C {}` | 同上 | 同上 → `end-build` | 同 A01（export default 前缀） |
| A05 | `import x = require("m")\n@dec\nclass C {}` | crash「不支持的表达式起点」 | 同上 → `end-build` | import-equals 的 EOF 收口不认装饰器声明头 |
| A06 | `declare function f(): void\n@a @b\nclass C {}` | crash 同 A01 | 同上 → `end-build` | 同 A01（多装饰器同行） |
| A07 | `declare function f(): void\n@a\n@b\nclass C {}` | 同上 | 同上 → `end-build` | 同 A01（装饰器逐行） |
| A08 | `declare function f(): void\n@dec /*c*/\nclass C {}` | 同上 | 同上 → `end-build` | 同 A01（装饰器后 trivia） |
| A09 | `declare function f(): void\n@dec\ninterface I {}` | 同上 | end compute + 缺少 possible → `end-build` | 同 A01；`source-file-end` 装饰器分派面只接 class（`:559-562`；cover8-FINAL §7.1/7.3） |
| A10 | `declare function f(): void\n@dec\nenum E { A }` | 同上 | 同上 → `end-build` | 同 A09 |
| A11 | `declare function f(): void\n@dec\ntype T = number;` | 同上 | 同上 → `end-build` | 同 A09 |
| A12 | `declare function f(): void\n@dec\nnamespace N {}` | 同上 | 同上 → `end-build` | 同 A09 |
| A13 | `declare function f(): void\n@dec\nabstract class C {}` | 同上 | 同上 → `end-build` | 同 A01（abstract 修饰词） |
| A14 | `declare function f(): void\n@dec\nexport class C {}` | 同上 | 同上 → `end-build` | 同 A01（export 修饰词） |
| A15 | `declare function f(): void\n@dec\nfunction g() {}` | 同上 | 同上 → `end-build` | 同 A01 + 装饰器后 function 的 FromUnits |
| A16 | `declare function f(): void\n@dec\nclass C {}\nlet z = 1` | 同上 | 同上 → `end-build` | 同 A01（后面还有第三条语句） |
| A17 | `@dec\nconst x = 1;` | crash「不支持的表达式起点」 | 缺少 possible → `missing-possible` | 声明头分派没有「`@` + 换行 + 变量声明」通道（cover8-FINAL §7.2 只登记了块级） |
| A18 | `{ @dec\nconst x = 1; }` | 同上 | 缺少 possible → `missing-possible` | `statement-builder.xl.md:1039 BuildDecoratedStatement`（`ScanDecoratedHead:985`）只认声明词，`const` 不在分派表 |
| A19 | `{ @dec\nlet x = 1; }` | 同上 | 同上 → `missing-possible` | 同 A18（let） |
| A20 | `{ @dec\nvar x = 1; }` | 同上 | 同上 → `missing-possible` | 同 A18（var） |
| A21 | `{ @dec\nconst x = 1, y = 2; }` | 同上 | 同上 → `missing-possible` | 同 A18（多声明列表） |

**green 24 条（不是 case，作回归对照）**：A22–A29 根级 `@dec` + class/interface/enum/type/namespace/
function/export/export default（cover8 已修）；A30–A39 块级同类 + 修饰词（cover8 blockdecl 已修）；
A40/A41 普通已收口声明后跟装饰器声明；A42–A45 source-file-end 对连续 interface/module/enum/type alias
的 EOF 分派（HEAD 均已绿）。
**重要修正**：cover8-FINAL §7.1 列出的 5 条「`⏎ @dec interface/enum/type/namespace` 仍红」在 HEAD
**已绿**（A23–A26）；真正仍红的是「装饰器声明头跟在**未收口声明**之后」（A01–A16）与「`@dec` + 变量声明」
（A17–A21）。修 A 组时不要重复修已绿形态。

**修复方向（四问）**：① 何时 build：`@` 前缀的声明头在「`@` 起首（可跨行）→ 声明词」到齐时由声明的
`FromUnits` 一次建完；无体函数/import-equals 的 ASI 判据把「换行 + @（装饰器前缀可跨行）+ 换行 + 声明词」
识别为**下一条声明的起点**；② build 提什么：Decorator 进 children 最前、修饰词（export/default/declare/
abstract）按 TS 顺序；③ 何时 close：声明完整（body `}` / `;`）即关；④ close 提什么：区间含装饰器、
不含下一条声明的任何单元。建议把「装饰器前缀 + 声明词」做成**一份判据**（`source-file-end` 的
`HasDecoratorPrefix`/`LeadingDeclarationKeyword` 与 `function-declaration-possible-shape.
IsDecoratedDeclarationStart`、`statement-builder.ScanDecoratedHead` 共用），并把分派表按声明词扩展到
interface/enum/type/namespace/module/function/variable。
**写用例**：A01–A16 → `end-build`（16 条）；A17–A21 → `missing-possible`（5 条）。

### B 组：换行口径统一（22 条：red 15 / green 7）

**red 15 条分三族（不要混成一条根因）**

**B1 族：`type-builder.HasLineBreakBeforeCurrent` 只认 LF（4 条：B01–B04）**
- 输入：`const x = a as T\r<b>c;`（B01）、LS（B02）、PS（B03）、LS+大写（B04）→ 全部 crash「表达式没有读完」。
- **LF 对照 B05 已绿**（cover8 D 已修）→ 差异只来自行终止符口径。
- 根因：`typescript/tokens/types/type-builder.xl.md:491 HasLineBreakBeforeCurrent` 在 `:515` 只判断
  `document.At(at).Value === "\n"`；`ParseTypeReference:1837` 的类型实参同行守卫因此把换行后的 `<b>`
  吞成类型实参。
- 修法：该类换行判断改用 `typescript/run/line-terminator.xl.md` 的共享 LineTerminator 助手
  （cover8 A 组已建立；与 `expression-statement-possible-shape`/`statement-builder` 同源）。
- targetStem：`possible-build`（4 条）。

**B2 族：type alias 跨行 `<` 边界（9 条：B06–B14；LF 也红，**不是**行终止符特有）**
- 输入：`type T = A\n<B>c;`（B06，LF 也红）、CR（B07）、LS（B08）、PS（B09）、
  `type T = typeof x.y\n<Z>c;`（B10，LF 也红）、CR（B11）、
  `type T = import("m")\n<T>(1);`（B12，LF 也红）、CR（B13）、`type T = A\n<B>(1);`（B14）
  → 全部 crash「类型别名声明的类型没有读完」。
- TS：`TypeAliasDeclaration` 在行末收口 + 下一行 `<B>c` 是独立 TypeAssertion 语句（TS 的
  `parsePostfixTypeOrHigher` 只在同行吃 `<`/`[`；`parseTypeArgumentsOfTypeReference` 要求同行）。
  本仓把 `<B>c` 吞进类型。
- 根因：`typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md:279 IsAsiBoundary`
  （调用点 `:230`）不把「换行 + `<`」当新语句起点；`typescript/tokens/statements/statement-builder.xl.md:1135
  BuildTypeAliasDeclaration` 的 `asiEnd`（`:1215`）同缺口。
- 修法：type alias 的 ASI 边界把「换行 + 下一行以 `<` 起始」判为新语句起点（类型位不再续接），
  并核 `BuildTypeAliasDeclaration` 的 asiEnd 切片；与 B1 共用行终止符助手。
- targetStem：`end-compute`（9 条）。
- **已绿的邻近形（不是 case）**：`type T = A\r[0]` / LS / PS、`import("m").X\r[0]`、
  `typeof x.y<Z>\r[0]`（B17–B21）——说明 `[` 路径在语句层已按行终止符切走，**不要**为它们写 case。

**B3 族：`as typeof …` 后 `<` 未回二元层（2 条：B15–B16；“无现成行终止符差异”）**
- 输入：`const x = a as typeof f\n<T>(1);`（B15）、CR（B16）→ crash「表达式没有读完」；LF 也红。
- 对照 B22：`const x = typeof f\n<T>(1);`（表达式位 typeof，不是 as 类型位）**已绿** → 说明问题在
  `as` 的类型位：`expression-builder.xl.md:466 ParseFollowingType` +
  `type-builder.xl.md:1918 ParseTypeQuery` 把 `<T>(1)` 当续接吞掉，没回到二元层。
- 修法：`ParseFollowingType` 返回 TypeQuery 后按二元层继续（`<` 作比较），或 TypeQuery 内不消费
  `<` 类型实参；修者需 trace 定最终落点（先用 `node tests/cover9/probe.mjs --quiet` 看 B15/B16）。
- targetStem：`possible-build`（2 条）。

**写用例**：B01–B04 → `possible-build`；B06–B14 → `end-compute`；B15–B16 → `possible-build`。

### C 组：cover5/6/8 文档登记但 HEAD 仍可测的项（21 条：red 8 / green 13）

**red 8 条**

| id | input | 现状 | category / targetStem | 根因（file:line） |
|---|---|---|---|---|
| C01 | `let\nlet = 1` | red-diff：TS=`VariableStatement(let let=1)`，本仓=两条 ExpressionStatement | end build → `end-build` | `source-file-end-possible-shape` 的 `BuildTrailingDeclaration` 多语句分界：下一行以声明关键字开头就切，没有「前一段能否收住完整语句」检查（cover5 possible-compute §5.1） |
| C02 | `yield\n(1);` | crash「表达式语句没有读完」 | possible build → `possible-build` | 顶层 script 里 `yield` 是 Identifier（TS=`CallExpression(Identifier "yield")`）；`ExpressionBuilder.ParseYield` 无条件当 YieldExpression（cover5 possible-compute §5.3） |
| C03 | `await\n(1);` | red-diff：本仓 AwaitExpression+Parenthesized，TS=CallExpression(Identifier "await") | possible build → `possible-build` | 同 C02（await 同族） |
| C04 | `type T = A\nreturn` | crash「CatalogGuide: 终结候选与其它候选同时成立」 | end compute → `end-compute` | type alias 候选边界 Accept 时 return 候选同时起动（cover5-FINAL §4 候选共存；cover6-FINAL §8.5 同族） |
| C05 | `type T = A\ndebugger` | 同上 | end compute → `end-compute` | 同 C04（debugger） |
| C06 | `type T = A\n{ a: 1 }` | 同上 | end compute → `end-compute` | 同 C04（块语句） |
| C07 | `declare function gf(): void\nglobal {}` | crash「表达式语句缺少分号」 | 缺少 possible → `missing-possible` | `global {}` 是 ModuleDeclaration 的 global 关键字形；source-file-end / module 分派缺口（cover5 end-build §8.4） |
| C08 | `declare function gf(): void\nglobal { const x = 1 }` | 同上 | 缺少 possible → `missing-possible` | 同 C07 |

**green 13 条（不是 case；记录“HEAD 已绿”的事实，避免下一轮重复劳动）**
- C09–C11：cover5 possible-compute §5.2 登记的「块体内部同一条 ASI」三形（`function f(){ const x = a as T⏎(b); }`、
  `{ const x = () => {}⏎(1); }`、`{ type T = A⏎(b); }`）——**HEAD 已绿**（cover8 D 的收口判据覆盖）。
- C12–C13：cover8 D 已修的对照（`const x = a as T\n<b>c;`、`export default a as T\n(b);`）。
- C14：根级 `global {}` 单独成句——已绿（与 C07/C08 的「尾随声明」形成对照）。
- C15–C21：cover8 C 已修的模板块成员 export/import 七形——已绿（cover8-FINAL §4 抽样 8 的扩展）。

**写用例**：C01→`end-build`；C02/C03→`possible-build`；C04–C06→`end-compute`；C07/C08→`missing-possible`。

### 批次汇总（预期增量）

| 组 | red（=修复对象） | 去向 | 说明 |
|---|---|---|---|
| A | 21 | end-build 16、missing-possible 5 | 装饰器声明头判据统一 + 变量声明通道 |
| B | 15 | possible-build 6（B01–B04+B15–B16）、end-compute 9（B06–B14） | B1 行终止符口径 / B2 type-alias `<` 边界 / B3 as typeof 二元层 |
| C | 8 | end-build 1、possible-build 2、end-compute 3、missing-possible 2 | 均为 cover5/6/8 已登记项 |
| **合计** | **44** | — | 修复后 ast-json ≥ 5973（+§5 base/trivia 变体，实际由各作者按 IMPORTANCE §5 决定，逐 stem 核） |

## 4. 候选探测方法 / 证据

- `node tests/cover9/probe.mjs`：读 `tests/cover9/candidates.json`，逐条解码 input → TS 6.0.3
  `parseDiagnostics` + TS AST 摘要 → 本仓 `SourceFileRunner.Parse` → `ast-compare.mjs` 三栏（结构/位置/字段）；
  输出每条的 diag / 现状 / TS AST 摘要，并核**存储值 vs 实测**是否一致（不一致 exit 1，提示基线已变）。
- `--quiet`：只打汇总（组统计、red/green id 列表、存储值校验）。
- 生成器与草稿在 `cover5-possible-build` 克隆的 `tmp/`（不提交）；`candidates.json` 由
  `node tests/cover9/probe.mjs` 每次重新实测，所以代码前进后若某条转绿，probe 会报「存储值 vs 实测不一致」。

## 5. 命令速查

```powershell
# 0) 取代码 + 建自身克隆（不要在主仓改代码；主仓只读 + 只新增文档/交接文件）
#    以主仓为 origin 本地 clone，然后 git checkout -b <author-branch> origin/feature/quick-parse
# 1) 首次重建到 HEAD（force 全量）
#    xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist", force=true)
#    之后只改几个文件时：paths=[改过的 .xl.md 或目录]，同样 targets/out
.\node_modules\.bin\tsc.cmd -p tsconfig.json

# 2) 全量门禁
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node tests/parse/validate.mjs
node typescript/cases/real-dts-ast.mjs

# 3) 单 stem（修复完一个 target stem 就跑一次）
node typescript/cases/ast-json.mjs <stem>
node typescript/cases/ast-json-diff.mjs <stem>

# 4) 候选探针（本交接产物）
node tests/cover9/probe.mjs
node tests/cover9/probe.mjs --quiet

# 5) 快照冲突处理（禁止手工合并 JSON）
git checkout --ours typescript/cases/<stem>.{cj,ts}-ast.json   # 或 --theirs，取一侧
node typescript/cases/ast-json.mjs <stem>                       # 重新生成两份快照
node typescript/cases/ast-json-diff.mjs <stem>                  # 期望 0/0/0

# 6) 静态检查（无新增 error；既有 W3102/W3103 + 3 个 E2004 孤儿可接受）
#    xl_check(cwd=<clone>, paths=["core","typescript"], targets=["ts"])
```

## 6. Guardrails（违反即本轮验收不通过）

1. **core 需用户批准**：`core/**` 与 `typescript/IMPORTANCE.md` 不得改；本批 A/B/C 均可只在
   `typescript/**` 层修（若修者判断必须改 core，先让用户批准并记录 file:line 与默认值/开关）。
2. **只有真红进 `typescript/cases`**：TS `parseDiagnostics.length === 0` 且本仓 crash / AST 三栏任一不一致；
   green 候选不是 case；TS 非法（ts-invalid）一律排除。新增用例须是「修复前红、修复后绿」。
3. **IMPORTANCE §5**：每组先 base（不含干扰信息）再 trivia/重复形变体；一行一例；行内 `\n` 用转义；
   同 stem 内不得有精确重复行；跨 stem 重复仅记录。
4. **token 夹具规则**（若本轮需要新增 token 夹具，例如行终止符）：
   - 夹具文件头是 `// xl:<键> <值>` 指令块，**覆盖层必须以 `// xl:end` 收尾**（token 用例没有该行）；
   - `xl:expect` 只能写 `TAGS` 表里的产物标签名；**永远不进产物的名字（`GHOST_TAGS`）只能进 `xl:absent`**，
     写反了 `cases:check` 会报错；标签含义见 `tests/parse/validate.mjs` 与 `tests/cases/README.md`；
   - 跑 `node tests/parse/validate.mjs` 必须是 0 不合格（新增夹具不得让 1719/0 变差）；
   - CR/LS/PS：**输入里的行终止符用行内字面字符或真字节**——`\n` 在 token 夹具里是真实 LF；
     case 文件里 `\n` 可用转义（`ast-json.mjs` 的 decode 规则），**`\r`/U+2028/U+2029 必须用字面字符/真字节**，
     不要写成 `\r` / `\u2028` 转义；CRLF = 真 CR + `\n` 转义；含 lone CR 的夹具已在 `.gitattributes`
     用 `-text` 钉住（`typescript/cases/basic-token.ts`、`tests/cases/token/lexical/*-cr*.ts` 等），
     新文件若名字不含 `-cr` 需自行在 `.gitattributes` 加 `-text` 并说明。
5. **快照不手工合并**：`typescript/cases/*.{cj,ts}-ast.json` 冲突时取一侧后用
   `node typescript/cases/ast-json.mjs <stem>` 重生成；不要把两份 JSON 手工拼起来。
6. **不提交 tmp/**；不 push；不 merge 到主仓（合并成员按 Lead 指定执行）；工作区提交后必须干净
   （`git status --short` 只允许未跟踪 tmp/）。
7. **不改既有 case 文件别的段**：只 append 目标 stem 的 `cover9` 段（不重排、不改历史行）；
   不动其它 stem 的 case/快照/夹具。
8. **每个 agent 在同一克隆内不要并行跑两个 `ast-json.mjs`**（会同时重写跟踪快照）；不同克隆可并行。

## 7. 文件清单与链接

- 交接入口：`docs/COVER9-HANDOFF.md`（本文件）
- 候选库 / 探针：`tests/cover9/candidates.json`、`tests/cover9/probe.mjs`
- 历史总报告：`docs/cover5-FINAL.md`（§4 下一批转交）、`docs/cover6-FINAL.md`（§8 遗留）、
  `docs/cover7-FINAL.md`（core 轮收尾）、`docs/cover8-FINAL.md`（§7 下一批遗留，A 组来源）
- 分项报告：`docs/cover5-*.md`（basic-token/end-build/end-compute/missing-end/missing-possible/
  possible-build/possible-compute）、`docs/cover6-core-*.md`、`docs/cover7-*.md`、`docs/cover8-*.md`
  （asi/blockdecl/decortail/exportasi）
- 流程/环境：`COVER5-WORKFLOW.md`、`COVER6-WORKFLOW.md`、`COVER8-WORKFLOW.md`（构建链、门禁读数、
  克隆/重建/验证命令、已知坑）；用例夹具规则：`tests/cases/README.md`；标签表：`tests/parse/validate.mjs`
- 规范：`typescript/IMPORTANCE.md`（§3.3 候选 build 时机 / §3.4 cache 复用 / §3.5 basic token 提取 /
  §4 区间口径 / §5 用例标准 / §6 七类问题 / §7 质量）
- 合并记录：各 FINAL 的「合并记录」段（merge sha / parents / 回滚点）；cover9 轮次起点 = 本文件所在 commit
  （分支 `cover9-prep`，提交信息 `cover9(prep): …`）

## 8. 验收门禁与期望值

| 门禁 | 期望 |
|---|---|
| `ast-json.mjs` | 5929 / cj-ok 5929 / fail 0（起点）；修复后 5929+N 全绿（N=新增用例数，逐 stem 核） |
| `ast-json-diff.mjs` | 与 ast-json 同数，结构 0 / 位置 0 / 字段 0 |
| `token-ast.mjs --quiet` | 不差于 1715（ok 1705 / ts-invalid 10 / crash 0 / diff 0） |
| `node tests/parse/validate.mjs`（`npm run cases:check`） | 起点 1719 / 0 不合格；新增用例后 1719+M / 0 不合格 |
| `real-dts-ast.mjs` | 226 / 226 / 0 崩溃 / 0 差异 |
| `tsc -p tsconfig.json` | 0 error |
| `xl_check`（core+typescript） | 0 error（既有 W3102/W3103 + 3 个 E2004 孤儿产物可接受） |
| `git diff <起点>..HEAD -- core typescript/IMPORTANCE.md` | 空 |
| `git status --short` | 干净（只允许未跟踪 `tmp/`） |
| `node tests/cover9/probe.mjs` | 起点 88 条：red 44 / green 44 / ts-invalid 0；修复后对应 red 行转绿（probe 会报「存储值 vs 实测」偏差，提示更新基线或发现回归） |

## 9. 探测备注（写者按实测更新，务必不要覆盖）

- 本轮所有候选都是在本交接作者克隆（`cover5-possible-build`，`cover9-prep` 分支，force 重建到
  `1acf9d1b` + `tsc`）上实测的；`candidates.json` 记录的是**该 HEAD** 的行为。
- cover8-FINAL §7.1 的「`@dec` 单独起行 + interface/enum/type/namespace」4 条在 HEAD **已绿**
  （A23–A26），不要重复修；仍红的是「装饰器声明头跟在未收口声明之后」与「`@dec` + 变量声明」。
- B 组不是单一根因：B01–B04 才是 `HasLineBreakBeforeCurrent` 只认 LF 的现成 red；
  B06–B14 是 type alias 跨行 `<` 边界（LF 也红）；B15–B16 是 `as typeof` 类型位（LF 也红）。
  `type T = A⏎[0]` 一族实测已绿（B17–B21），属「口径统一」项而非现成 red，改 helper 时作回归对照。
- C 组 13 条 green 是 cover5/6/8 已修或对照项（C09–C21），可用于确认下一轮没有回退。
- 探针自写，不采信作者报告：新对话开始前先 `node tests/cover9/probe.mjs --quiet` 与
  `git rev-parse HEAD` 对照 §0 读数。
