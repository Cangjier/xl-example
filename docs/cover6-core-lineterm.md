# cover6-A（core 行终止符判据）实施报告

- 分支：`cover6-core-lineterm`，基线 `99f286d8`（prep），工作区
  `C:\Users\Admin\Documents\GitHub\xl-example-set\cover6-core-lineterm`；未 merge / 未 push。
- 范围：`docs/cover5-FINAL.md` §5 的 **A / B / C**——行注释与 shebang 的行尾判据从「只认 `\n`」
  改为「ECMAScript LineTerminator = `\n` / `\r` / U+2028 / U+2029；CRLF 整体算一个」。
- 非本分支：D+G（字符串）、E（`?.`）、F（`\u{…}`）分别由 cover6-core-string / -symbol / -unicode 承担。

## 1. 读数（修前 → 修后）

| 项 | 修前（`99f286d8`） | 修后 | 说明 |
|---|---|---|---|
| tmp 探针 `tmp/probe-lineterm.mjs`（26 输入，TS 6.0.3 `parseDiagnostics=0` 全 26 条） | **14 一致 / 12 红** | **26 一致 / 0 红** | 12 红全绿 |
| `node typescript/cases/ast-json.mjs` | 5709 / cj-ok 5709 / fail 0 | **5720 / cj-ok 5720 / cj-fail 0**（47 构造） | +11（basic-token stem 108→119） |
| `node typescript/cases/ast-json-diff.mjs` | 5709/5709，0/0/0 | **5720/5720，结构 0 / 位置 0 / 字段 0** | — |
| `node typescript/cases/token-ast.mjs --quiet` | total 1704 / ok 1694 / ts-invalid 10 / crash 0 / diff 0 / known-gap 0 | **total 1708 / ok 1698 / ts-invalid 10 / crash 0 / diff 0 / known-gap 0** | +4 新夹具，全 OK |
| `node typescript/cases/real-dts-ast.mjs` | 226/226 | **226/226、崩溃 0、差异 0** | — |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | exit 0 | **exit 0** | — |
| `xl_build(core+typescript, force)` | — | **863 written / 0 error**（2464 warning 为既有 W3102/W3103 噪音） | — |
| `xl_check`（4 个改动 .xl.md，targets ts） | — | **0 error** | 见 §5 |
| `git status --short` | 空 | 7 个预期跟踪文件 + 4 个新夹具（`tmp/` 未跟踪、不提交） | — |

## 2. 红的最小复现与 TS AST（修前）

统一现象：行注释 / shebang 把整行之后的代码一起吞掉，本仓根 `Data` 为空（或只解析出注释前的语句），
与 TS 的 `VariableStatement` 不一致（三栏比较里是「结构差」：整个语句缺失）。

| # | 最小复现 | TS 6.0.3（0 diag） | 本仓修前 | 根因 |
|---|---|---|---|---|
| A | `// c\rconst a = 1;` | `VariableStatement` `[pos 0, end 17]`，`Identifier a [10,12]`、`NumericLiteral 1 [14,16]` | 树为空（整行吞到 EOF） | `LineAnnotation.ExitOrPre` 只认 `\n` |
| B | `// c<U+2028>const a = 1;` | 同上 | 树为空 | 同上（U+2028 不在判据里） |
| B′ | `// c<U+2029>const a = 1;` | 同上 | 树为空 | 同上 |
| C | `#!x\rconst a = 1;` | `VariableStatement` `[0,16]`，`a [9,11]`、`1 [13,15]` | 树为空 | `Shebang.ExitOrPre` 只认 `\n` |
| C′ | `#!x<U+2028>…` / `#!x<U+2029>…` | 同上 | 树为空 | 同一判据（同一次修复顺带覆盖） |
| A2 | `const a = 1; // c\rconst b = 2;` | 两条 `VariableStatement`（TS 侧 `b` 在 `[23,25]`） | 第二条缺失 | 同 A |
| A3 | `//\rconst a = 1;`（空注释） | `VariableStatement` `[0,15]` | 树为空 | 同 A（注释正文为空也要能收尾） |
| A4 | `// c\rconst a=1;\rconst b=2;` | 两条语句 | 树为空 | 同 A |
| C2 | `#!\rconst a = 1;`（空 shebang） | `VariableStatement` `[0,15]` | 树为空 | 同 C |

另外两条只在**语句内部**表现的 diff：`switch(a){ case 1: // c\r break; }` 修前 `IfStatement`/`CaseBlock`
的 `end` 为 31 vs 18（注释吞掉了 `break; }`）；修后一致。

## 3. 实施（core 改动一律走模板开关 + 共享助手；默认行为不变）

### 3.1 `core/syntax/templates/template.xl.md`（新增开关，core 不写 TS 常量）

- 新增字段 `LineTerminatorChars:string = "\n"`：**默认值 = 历史行为**（只有 `\n`），
  其它语言模板不配置时零影响；字段描述里写清「CRLF 不需要成对声明，判据按『先遇到 `\r` 就收尾』工作」。
- 新增方法 `IsLineTerminator:(item:string)=>bool`：`item.length === 1 && this.LineTerminatorChars.indexOf(item) >= 0`。
- 位置：紧接 `ShebangMarker` 之后（两者同属「行/文件头边界」配置，读起来连续）。

### 3.2 `core/syntax/basic-tokens/line-annotation.xl.md`（判据 + CR 分支）

`ExitOrPre` 改为：

1. `if (!this.Template.IsLineTerminator(source.Value)) return BranchStates.Undo;`——判据从硬编码 `"\n"` 改为模板钩子；
2. **`\r` 分支（新）**：`\r` 自己当行尾（lone CR，或 CRLF 的前半）时它**不进注释正文**——`SignOut(source.Pre())`
   签出到前一个字符、`TryToClose`、`Quit`，再 `ReloadMessage` 把 `\r` 交回根单元（根单元按空白 trivia 处理；
   随后的 `\n` 同样由根单元接手）。这样 CRLF 在 ts 模板下等价于一个行终止符，AST 不受影响（trivia 不进 Pos/End）；
3. **`\n` 分支保留原样**：前一个字符是 `\r` 时先 `Undo` 掉 CR 再签出到 CR 之前——这条只有**默认 `"\n"` 模板**走得到
   （ts 模板已在 `\r` 处先收尾），保证未配置该开关的语言行为逐字节不变。

### 3.3 `core/syntax/basic-tokens/shebang.xl.md`（判据）

`ExitOrPre` 改为 `if (!source.IsEOF && !this.Template.IsLineTerminator(source.Value)) return Undo;`
（原 `source.Value !== "\n"`）。其余「签出到前一个字符 / TryToClose / Quit / 非 EOF 插 Reload」完全保持——
**行终止符本身不吃进 shebang**，仍按原约定 Reload 给根单元。

### 3.4 `typescript/run/typescript-template.xl.md`（ts 模板启用全集）

`TypescriptTemplate.Create` 里新增 `template.LineTerminatorChars = "\n\r\u2028\u2029";`，
并在 Create 的说明里补一段「行终止符」：ts 的 LineTerminator 是 `\n` / `\r` / U+2028 / U+2029（CRLF 整体算一个），
core 默认只有 `\n`。**TS 专用常量只出现在 typescript 层**，core 里没有任何 U+2028/2029 字面量。

### 3.5 为什么用开关而不是直接改 core 常量

- 同一份 core 被多种语言模板共用；行终止符属于**词法差异**，与 `ShebangMarker` / `BomChars` 同性质，
  用模板字段配置和现有设计一致；
- 默认 `"\n"` 让 4 条并行 core 分支（以及未来语言）在未配置时行为不变，回归面可控；
- 判据只有一个入口（`Template.IsLineTerminator`），两个 basic token 不会各写一份字符表。

## 4. 测试增量

### 4.1 token 语料夹具（`tests/cases/token/lexical/`，+4 文件，全 OK）

| 文件 | 内容（`<CR>`/`<LS>`/`<PS>` 为字面字符） | 字节 / CR 数 | xl 指令 |
|---|---|---|---|
| `lex-line-comment-lone-cr.ts` | `// c<CR>const a = 1;` | 105 B / CR 1 | `// xl:note …`、`// xl:expect Let` |
| `lex-line-comment-ls.ts` | `// c<LS>const a = 1;` | 119 B / CR 0 | 同上 |
| `lex-line-comment-ps.ts` | `// c<PS>const a = 1;` | 124 B / CR 0 | 同上 |
| `lx-shebang-cr.ts` | `#!x<CR>const a = 1;`（shebang 必须是文件第 0 行，故文件首行即 shebang，无法放 `// xl:` 指令——与既有 `lex-shebang.ts` 同一约定） | 17 B / CR 1 | —（`readDirectives` 只读文件头连续 `//` 行） |

**CR 字节存活证据**：`.gitattributes`（prep `99f286d8`）已有
`tests/cases/token/lexical/*-cr*.ts -text`；`git check-attr text -- <4 个文件路径>` 与
`lex-line-comment-lone-cr.ts`、`lx-shebang-cr.ts` 均返回 **`text: unset`**；
提交后另用 `git cat-file -s HEAD:<path>` 与工作区字节数比对（见提交说明 / §6）。

### 4.2 AST 用例（`typescript/cases/basic-token.ts` 末尾追加，+11 行 → 该 stem 108→119，全绿）

段落唯一标记：`// ══ cover6 core（A/B/C 行终止符）：行注释与 shebang 在 \r / U+2028 / U+2029 处收尾 ══`。
遵守 IMPORTANCE §5：base 先行（LF 行尾），再按 lone CR / LS / PS / CRLF 给形变体，一行一例；
行注释不能作用例行首（`readCases` 丢弃 `//` 开头行），故统一写「一条语句 + 行尾注释」；CR 用**字面字节**，
LS/PS 用行内字面字符，CRLF 用「CR 字面字节 + `\n` 转义」表示（避免 `split("\n")` 把一条用例切成两条）。

```text
const lt0 = 0; // c\nconst lt1 = 1;              base（LF）
const lt2 = 0; // c<CR>const lt3 = 1;            lone CR
const lt4 = 0; // c<LS>const lt5 = 1;            U+2028
const lt6 = 0; // c<PS>const lt7 = 1;            U+2029
const lt8 = 0; // c<CR>\nconst lt9 = 1;          CRLF
/* c */const ltA = 0; // c<CR>const ltB = 1;    块注释 trivia + CR 行尾
#!x\nconst ltC = 1;                             shebang LF（base）
#!x<CR>const ltD = 1;                           shebang lone CR
#!x<LS>const ltE = 1;                           shebang U+2028
#!x<PS>const ltF = 1;                           shebang U+2029
#!x<CR>\nconst ltG = 1;                         shebang CRLF
```

快照 `typescript/cases/basic-token.cj-ast.json` / `.ts-ast.json` 已随分支重新生成（ast-json 会重写跟踪快照）。

### 4.3 探针

`tmp/probe-lineterm.mjs`（不提交）：26 条输入覆盖 A/B/C 三种红 + 14 条守卫（LF/CRLF/EOF 注释、
空注释、空 shebang、中间代码行尾注释、块注释里的 CR、CR/LS 当空白、连续注释、switch 内注释、`return\r`）。
每条都先要求 TS `parseDiagnostics.length === 0`，再经 `ast-compare.mjs` 的 `tsAst`/`cjAst` 整树比较。

## 5. xl_check

对 4 个改动的 `.xl.md`（`template.xl.md`、`line-annotation.xl.md`、`shebang.xl.md`、`typescript-template.xl.md`）
以 `targets=["ts"]` 跑 `xl_check`：**0 error**（`xl_build` 全量 863 文件同样是 `0 error(s)`）。

## 6. 提交

- 提交：`cover6(core-lineterm): …`（本分支唯一提交，未 merge / 未 push）。
- `git add` 预期文件：3 个 core `.xl.md` + `typescript/run/typescript-template.xl.md` +
  `typescript/cases/basic-token.ts` + 两份 `basic-token.*-ast.json` + 4 个 token 夹具 + 本文件；`tmp/` 不提交。
- CR 字节自检（提交后）：`git cat-file -s HEAD:tests/cases/token/lexical/lex-line-comment-lone-cr.ts` = 105，
  `…/lx-shebang-cr.ts` = 17；`git ls-files --eol` 两个 CR 文件应为 `i/-text w/-text`。

## 7. 遗留 / 边界

1. 本分支**只**做 A/B/C；D+G 字符串、E `?.`、F `\u{…}` 在其它 cover6 分支，`typescript/cases/basic-token.ts`
   的其它段落未重排、未删除（只在本文件末尾追加自己的段）。
2. **shebang 的 LS/PS 行尾**顺带转绿（与 lone CR 同一判据），已加夹具/用例；这不是超出范围的 core 改动，
   只是同一开关的自然覆盖。
3. U+2028/U+2029 作为 **ASI 断句点**（`function f(){ return<LS>1; }`：TS 是 `return;` + 独立语句）仍与 TS 不一致——
   属 end build / 行终止符消费的另一类别，不在 A/B/C 范围（探针里只作记录，未纳入本分支验收）。
4. 合并时注意：4 条 core 分支都往 `typescript/cases/basic-token.ts` 追加段落（lead 约定），
   快照冲突按 COVER6-WORKFLOW §5「取一侧后重新生成」处理，不手工合并 JSON。
