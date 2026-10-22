# cover9 · basic token（X 组）：U+0085 NEL 按 TS 词法计入空白

> 作者：auth-endbuild（cover9 轮次 W5）
> 克隆/分支：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-basictoken-nel`，分支 `cover9-basictoken-nel`
> 起点：`b465cf6e`（分支 `cover9-basictoken-nel`，基线钉死在 b465cf6e；未 pull/fetch 跟随主仓）
> 修复对象：survey X 组 15 形（X01–X15，1 根因），targetStem=`basic-token`
> 结果：**15/15 红→绿**；`basic-token` 新增 **25 条**用例（196 → 221）；全量门禁通过（读数见 §6）

## 0. 用户裁定记录（IMPORTANCE §3.1）

**用户已明确裁定**：`U+0085`（NEL）按 **TS 词法**修正——TS 的 `isWhiteSpaceSingleLine` 把
`CharacterCodes.nextLine`（0x85）算作单行空白，而 ECMAScript 的 WhiteSpace / LineTerminator 都不含它；
本仓跟随 TS 词法。**只在 ts 层改一处 `case`，core 零改动**。本文件此前的「ECMAScript 全空白集」
一段是 cover5 的口径（当时按 ES 补 `\v` / `\f` / NBSP / U+1680 / U+2000–200B / U+202F / U+205F /
U+3000 / LS / PS），NEL 是其后**唯一漏掉的 TS 特有字符**。

## 1. 一句话结论

`typescript/run/typescript-symbol-template.xl.md` 的 `IsWhiteSpace` 覆写是 ts 层**唯一**的空白归类判据
（`WrapSymbol.IsAppend/Transit`、`Common.IsAppend` 都问它）；它漏了 U+0085，于是 NEL 不被认领成空白块
trivia，而落进 `Common` 被并进标识符 / 关键字 / 数字（`const<NEL>a` 的 Identifier 从 0 起、
`const a=<NEL>1` 的 `1` 变成 Identifier），表现为 crash（「表达式语句没有读完」）或结构/位置/字段差。
补一个 `case "\u0085":` 即全绿；NEL **不是**行终止符（TS 的 `isLineBreak` 不含 0x85），
所以 `return<NEL>1` 仍是带表达式的 return，**没有**在 NEL 处 ASI 断句的语义。

## 2. 改了哪些文件 / file:line

只改 `typescript/**`。core / `typescript/IMPORTANCE.md` **零改动**
（`git diff b465cf6e..HEAD -- core typescript/IMPORTANCE.md` 为空）。

### 2.1 `typescript/run/typescript-symbol-template.xl.md`（+16/−3）

| file:line | 内容 |
|---|---|
| `:19-25` | 页首说明补一段：**U+0085 是 TS 口径、不是 ECMAScript 口径**（`isWhiteSpaceSingleLine` 的 `CharacterCodes.nextLine`；ES 的 WhiteSpace/LineTerminator 都不含）；并写明它**不是行终止符**（`isLineBreak` 不含 0x85），所以 `return<NEL>1` 仍是带表达式、语句间靠 `;` 分句；记录用户裁定与「core 不动」 |
| `:30-31` | `TypeScriptSymbolTemplate` 类说明：空白集口径从「ECMAScript 全集」改为「TS 词法（ES 全集 + TS 特有 U+0085）」 |
| `:42-45` | `IsWhiteSpace` 方法说明：成员表补 **U+0085**，并注明它属 TS 的 `isWhiteSpaceSingleLine`、不是行终止符、不要放进 `LineTerminator` |
| `:54-56` | **修复本体**：switch 里 `case "\u000C":` 之后插入三行注释 + `case "\u0085":`（一处、core 零改动） |

```ts
  case "\u000B":
  case "\u000C":
  // U+0085（NEL）：TS 的 isWhiteSpaceSingleLine 把 nextLine 当单行空白（ECMAScript 不认）；
  // 只在这里收口，core 不动；它不进 LineTerminator 表（TS 的 isLineBreak 不含 0x85）。
  case "\u0085":
  case "\u00A0":
```

### 2.2 用例与快照

| 文件 | 变化 |
|---|---|
| `typescript/cases/basic-token.ts:339-384` | 追加「cover9」段：**+25 条**用例（用例行在 `:354-384`；6 组注释标明 §6 类别、候选 id、TS 口径） |
| `typescript/cases/basic-token.cj-ast.json` | 由 `node typescript/cases/ast-json.mjs basic-token` 重生成（不手工合并） |
| `typescript/cases/basic-token.ts-ast.json` | 同上 |

`.gitattributes` 无需改动：`typescript/cases/basic-token.ts -text` 早已钉住，字面 NEL 字节按原样入库。

## 3. 四问回答（IMPORTANCE §6 的修法框架）

以 `const a = 1;<NEL>const b = 2;` 为例，说明 **basic token close → ComputePossibleShapes** 这条链：

1. **正确的应该什么时候 build（字符什么时候成为哪个 basic token）**：字符到达时由
   `Template.BasicBranchQueue()` 的 `Transit` 决定归属。`WrapSymbol.Transit` 先问
   `SymbolTemplate.IsWhiteSpace`——是空白就接手；`Common.Transit/IsAppend` 同样问它——不是空白才并进
   `Common`。NEL 补进这张表后，它**在字符到达的那一刻**就归 `WrapSymbol`（trivia 空白块），
   不再有「先被 Common 吞掉、事后补救」的时机——这正属于 **basic token 层**（IMPORTANCE §3.1）。
2. **build 时应该提取哪些信息**：空白块只攒原始文本（`WrapSymbol.Temp`，源码文本完整性用）；
   NEL 不承载任何语法信息，**不进任何 shape 字段**，也不产生 AST 节点。它唯一的作用是
   「占位但被跳过」：让下一个代码单元的 `SourceRange` 从自己这一格开始，于是 AST 的
   `Pos`/`End` 不再被撑大（`const<NEL>a` 的 Identifier `pos` 从 NEL 之后算，而不是 0）。
3. **什么时候 close**：空白块在**下一个非空白字符到来**时收尾（`WrapSymbol.Transit` 里先 `TryToClose`
   还开着的上一个 `WrapSymbol`）；而**前一个代码单元**（Common / 符号）在 NEL 到达时已经关闭——
   `Common.Close` 会**只问父单元** `ComputePossibleShapes(context)`（`common.xl.md:220-234`），
   这就是 §3.2 的「basic token close 触发父级 ComputePossibleShapes」：候选目录在这一格重算，
   看到的当前单元是 trivia（NEL 空白块），按「判形状时跳过 trivia」的口径继续等下一个代码单元。
   `WrapSymbol.Close` 是特例：只置 `Closed`、返回 `Nothing`、**不问父单元**（`wrap-symbol.xl.md:56-65`）——
   空白永远不是任何形状的收尾，问了只会在判不出东西的下标上打转。
4. **close 时应该提取哪些信息**：空白块 close 时**不提取**任何 AST 信息（只标记关闭）；
   形状 close 时把 `Data` 里的 trivia 过滤掉（形状的 `Data` 只留子形状），`ParseFromShape` 只看
   子形状的 `SourceRange`。所以 NEL 修复的产物是「AST 与 TS 三栏一致」而不是多出任何节点。

一句话：**basic token 层只回答「这个字符归谁」**；NEL 的答案是 `WrapSymbol`（trivia），
之后 build/close 两个阶段都按 trivia 处理——不建节点、不撑区间、不参与候选定案。

## 4. X01–X15 逐条红→绿证据

修前状态取自 `cover9-survey-candidates.json` 的 `currentStatus`（并在 b465cf6e 基线上用 survey 探针复跑确认：
`red=15 green=0 ts-invalid=0`）；修后 live 取自同一探针（`red=0 green=15`）。

| id | input（`\u0085`=NEL） | 修前 | 修后 live |
|---|---|---|---|
| X01 | `const a=1;\u0085const b=2;` | red-crash: 表达式语句没有读完 | green |
| X02 | `const\u0085a = 1;` | red-diff: 结构 VariableStatement −1 / … / ExpressionStatement +1；位置 Identifier ts[5,7] cj[0,7] | green |
| X03 | `const a =\u00851;` | red-diff: 结构 Identifier +1 / NumericLiteral −1 | green |
| X04 | `\u0085const a = 1;` | red-crash: 表达式语句没有读完 | green |
| X05 | `const a = 1;\u0085` | red-diff: 结构 Identifier +1 / ExpressionStatement +1 | green |
| X06 | `function f() { return\u00851; }` | red-diff: 结构 Identifier +1 / ReturnStatement −1 / NumericLiteral −1 / ExpressionStatement +1 | green |
| X07 | `type T =\u0085number;` | red-diff: 结构 Identifier +1 / NumberKeyword −1 / TypeReference +1 | green |
| X08 | `class C { m() {}\u0085}` | red-diff: 结构 Identifier +1 / PropertyDeclaration +1 | green |
| X09 | `const a = 1;\u0085\u0085const b = 2;` | red-crash: 表达式语句没有读完 | green |
| X10 | `let\u0085x = 1;` | red-diff: 结构 VariableStatement −1 / …；位置 Identifier ts[3,5] cj[0,5] | green |
| X11 | `const x = 1;\u0085const y = 2;\u0085const z = 3;` | red-crash: 表达式语句没有读完 | green |
| X12 | `const\u0085\u0085a = 1;` | red-diff: 结构 VariableStatement −1 / …；位置 Identifier ts[5,8] cj[0,8] | green |
| X13 | `export const a = 1;\u0085export const b = 2;` | red-crash: 表达式语句没有读完 | green |
| X14 | `function\u0085f() {}` | red-crash: 表达式语句没有读完 | green |
| X15 | `const a = 1;\u0085// c\nconst b = 2;` | red-diff: 结构 Identifier +1 / ExpressionStatement +1；位置 VariableStatement ts[12,30] cj[13,30] | green |

**复跑命令**（官方 `tests/cover9/probe.mjs` 的 decode 不认 `\uXXXX`，所以 X 组用 survey 探针；
脚本未进仓，来源是只读克隆 `xl-example-set\cover9-survey\tmp\survey-probe.mjs` 与
`cover9-survey-candidates.json`；本报告的克隆里拷到 `tmp/` 后运行）：

```powershell
# 15 条候选形（probe 支持 \uXXXX 解码）
node tmp/survey-probe.mjs tmp/x-cases.json --full
# 25 条用例形（字面 U+0085，与 basic-token.ts 里的字节完全相同）
node tmp/survey-probe.mjs tmp/nel-cases.json
# 官方全量探针（不涉及 X 组）：node tests/cover9/probe.mjs --quiet
```

## 5. 新增用例（N = 25）

`typescript/cases/basic-token.ts` 末尾追加 `cover9` 段（不重排、不改历史行），
**NEL 一律写成行内字面 U+0085 字符**（`ast-json.mjs` 的 decode 不认 `\uXXXX`；该文件已被 `-text` 钉住）。
结构（base 先行，trivia / 位置 / 重复形在后）：

| 组 | 条数 | 内容 | 候选 |
|---|---|---|---|
| ① NEL 作语句分隔 | 8 | base `const a=1;<NEL>const b=2;`；带空格形；前导 NEL；尾随 NEL；连续两个；三条语句；export 两条；NEL 后接行注释 | X01 X04 X05 X09 X11 X13 X15 |
| ② 关键字 / 名字 / 字面量之间 | 5 | `const<NEL>a`；两个 NEL；`let<NEL>x`；`=<NEL>1`；`function<NEL>f` | X02 X12 X10 X03 X14 |
| ③ NEL 只是空白、不是行终止符 | 3 | `return<NEL>1`（仍是带表达式的 return）；`type T =<NEL>number;`；类成员行尾 `}<NEL>}` | X06 X07 X08 |
| ④ trivia 与重复形 | 9 | 四条语句连排；NEL+空格 / 空格+NEL / 多位置；空语句后；块注释后；与 LF 并存；函数体首尾 | —（叠加形） |

- 一行一例；本段**只含字面 NEL + LF**（无裸 CR / LS / PS；已用脚本核过本段字节）。
- 同 stem 内无精确重复（与 cover5/6/7 段也不重复；脚本核对 25 条两两不同）。
- **红→绿验证（走真实用例管线）**：把 `.xl.md` 回退到 b465cf6e + 重建 dist + tsc 后跑
  `node typescript/cases/ast-json.mjs basic-token` → `cases=221 cj-ok=208 cj-fail=13`
  （13 条 crash）；`node typescript/cases/ast-json-diff.mjs basic-token` 逐条列出
  **`#197`–`#221` 共 25 条** = 恰好本段 25 条用例（13 CRASH + 12 结构/位置/字段差）。
  恢复修复后：`cases=221 cj-ok=221 cj-fail=0`，diff **221/221，0/0/0**。
  证据文件在克隆 `tmp/`（未进仓）：`tmp/baseline-ast.txt`、`tmp/baseline-diff.txt`、`tmp/nel-before.txt`。
- 快照由 `ast-json.mjs basic-token` 一次重生成，`ast-json-diff.mjs basic-token` = **221/221，结构 0 / 位置 0 / 字段 0**。

## 6. 全量门禁读数（修复后）

| 门禁 | 期望 | 实测 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5990+N | **6015 / 6015**（+25） |
| `node typescript/cases/ast-json-diff.mjs` | 0/0/0 | **6015/6015，结构 0 / 位置 0 / 字段 0** |
| `node typescript/cases/token-ast.mjs --quiet` | 不差于 1715 | **1715（ok 1705 / ts-invalid 10 / crash 0 / diff 0），未变** |
| `node tests/parse/validate.mjs` | 1719+M / 0 | **1719 条 / 0 条不合格，未变**（本任务未新增 token 夹具） |
| `node typescript/cases/real-dts-ast.mjs` | 226/226 | **226 / 226** |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | 0 | **0 error** |
| `xl_check(paths=["core","typescript"])` | 0 error | **864 file(s)，0 error(s)，2461 warning(s)**（既有 W3102/W3103，无新增 E2004） |
| `git diff b465cf6e..HEAD -- core typescript/IMPORTANCE.md` | 空 | **空（0 行）** |
| `git status --short` | 干净 | 提交后只允许未跟踪 `tmp/` |
| `basic-token` 单 stem | 221/221 + 0/0/0 | **221/221；0/0/0** |

## 7. 遗留风险 / 未做

1. **`ExpressionBuilder.IsWhitespaceChar`（`typescript/tokens/expressions/expression-builder.xl.md:751`）
   是另一份手写空白表**（`" \t\r\n\v\f"`），不在本任务的写 scope 内、也不影响 X01–X15。
   它只服务「对象字面量 `{…}` 前是不是 `) =>` 的体」这类**源码回溯扫描**；若 NEL 出现在
   `() => <NEL> {}` 这类回溯路径上，可能多走一步/少走一步。建议下一轮把它换成
   `Template.SymbolTemplate.IsWhiteSpace`（与本次同一判据），或至少把 NEL 补进那张表。
2. **`StatementScanner.NextChar/NextWord`（`typescript/tokens/statements/statement-scanner.xl.md`）
   的源码前瞻**同样手写 `" \t\r\n\v\f"`。NEL 现在是 trivia，`NextWord` 在 NEL 前会读出空串，
   影响 `if (…){…}<NEL>else` / `try{}<NEL>catch` 的「下一个词」前瞻（不在 X01–X15，且
   官方用例与全量 6015/6015 均未暴露）。同属「空白判定路径统一」的下一轮候选。
3. **NEL 不受 ASI 影响**：本修复只把它当空白、不是行终止符；如果未来有人「顺手」把 U+0085 加进
   `LineTerminator`，会与 TS 语义（`return<NEL>1` 带表达式、无 ASI 断句）冲突——注释已写在本页
   与 case 段头，测试也钉了 `return<NEL>1` 这一形。
4. **官方 `tests/cover9/probe.mjs` 不参与本组**：它的 decode 不支持 `\uXXXX`，所以官方 probe
   没有新增 X 组候选；X 组证据用 survey 探针（命令见 §4）。若后续要把 X 组并入官方候选库，
   需要先改 `tests/cover9/probe.mjs` 的 decode（不在本轮写 scope）。
5. **未 push / 未 merge**：只提交到本地 `cover9-basictoken-nel`；`tmp/` 未跟踪、未提交。
6. **本轮没有新增 token 夹具**：`token-ast` 维持 1715（ok 1705 / ts-invalid 10）。
   `basic-token.ts` 是 ast-json 用例 stem，不经过 `tests/cases/token/**` 的标签体系。
