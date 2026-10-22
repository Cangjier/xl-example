# cover8-A：U+2028 / U+2029 作为 ASI 断句点（ts 层 LineTerminator 统一）

工作区 `cover8-asi`，分支 `cover8-asi`，基线 `3fcd2e37`。改动只在 ts 层，**`core` 零改动**
（`git diff 3fcd2e37..HEAD -- core` 为空）。

## 1. 基线 / 最终读数

| 项 | 基线（`3fcd2e37`） | 本分支结束 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5797 / 5797 cj-ok（47 构造） | **5830 / 5830 cj-ok**（+33） |
| `node typescript/cases/ast-json-diff.mjs` | 5797/5797；结构 0 / 位置 0 / 字段 0 | **5830/5830；结构 0 / 位置 0 / 字段 0** |
| `end-compute` 单 stem | 262 / 262 | **295 / 295 完全一致** |
| `node typescript/cases/token-ast.mjs --quiet` | total 1714；ok 1704 / crash 0 / diff 0 / ts-invalid 10 | **total 1715；ok 1705 / crash 0 / diff 0 / ts-invalid 10 / known-gap 0**（+1 夹具） |
| `node ./tests/parse/validate.mjs`（cases:check） | 1718 条用例，0 不合格 | **1719 条用例，0 不合格**（+1 夹具） |
| `node typescript/cases/real-dts-ast.mjs` | 226 / 226 / 226 | **226 / 226 / 226** |
| `tsc -p tsconfig.json` | exit 0 | **exit 0** |
| `xl_check(core, typescript)` | 863 files / 0 error | **864 files / 0 error**（+1 新页；warning 仍为既有 W3102/W3103 + 3 条 E2004 孤儿产物噪音） |
| `git diff 3fcd2e37..HEAD -- core` | — | **空（core 零改动）** |

## 2. 修前现象与 TS 对照

探针 `tmp/probe-asi.mjs`（TS `createSourceFile` 的 `parseDiagnostics` + `tsAst` vs 本仓
`SourceFileRunner.Parse` 的 `cjAst`；三栏口径与 `typescript/cases/` 一致）。输入 56 条
（LF/CR/CRLF 对照 + LS/PS 变体，全部 TS diag=0）：**修前 31 红，修后 0 红**。

| 复现 | 修前本仓 | TS |
|---|---|---|
| `function f(){ return<LS>1; }` / `<PS>` | 把 `1` 当返回值：`ReturnStatement[13,23]`，少一条语句 | `ReturnStatement[13,20]` + `ExpressionStatement(1)[20,23]` |
| `a<LS>b`、`a<PS>b` | crash「表达式语句没有读完」 | 两条 `ExpressionStatement` |
| `a<LS>++b` / `a++<LS>b` / `a<LS>!b` | crash | 两条语句 |
| `let a = 1<LS>let b = 2` / `var …<LS>…` | crash | 两条 |
| `{ a<LS>b }`、`function f(){ a<LS>b }`、`if/while/switch` 块内 | crash（块体里换行判据全失效） | 块内两条语句 |
| `function* g(){ yield<LS>(x) }` | `YieldExpression` 吃到 `(x)` | `yield;` + `(x);` |
| `while (a) { break<LS>label }` / `continue` | `BreakStatement` 吃到 label | 关键字处收口 |
| `do f()<LS>while (a)` | crash | do-while |
| `x = () => {}<LS>(y)` | 并成 `CallExpression` | 两条 |
| `class C { a = 1<LS>b = 2 }` | crash「类成员之间缺少分隔符」 | 两个成员 |
| `type T = A<LS>z;` | crash「类型别名声明的类型没有读完」 | TypeAlias + `z;` |
| `import x from "m"<LS>import y from "n"` | crash（import 壳不闭合） | 两条 ImportDeclaration |
| `export { a } from "m"<LS>type T = A` | export 吞掉 type alias | 两条 |
| LF / CR / CRLF 同形 | 全部与 TS 一致（对照组，修前修后不变） | — |

根因：cover6 已把 LS/PS 收进 ts trivia（`TypeScriptSymbolTemplate.IsWhiteSpace`），但所有
「这里是不是换行」的判据仍写死 `\n` / `\r`。

## 3. 改动（助手设计 + 逐文件）

### 3.1 新页 `typescript/run/line-terminator.xl.md`（共享助手）

`class LineTerminator`：ts 层唯一的行终止符判据（LF / CR / U+2028 / U+2029；CRLF 天然只回答「有」，
不数行数）。**core 零改动**：core 的 `StringTemplate.LineTerminatorChars` 是 basic token 层
（字符串 cooked 值）口径，ts 的 ASI 语义留在 ts。

| 方法 | 作用 |
|---|---|
| `IsLineTerminator(value:string)` | 单字符是不是四个行终止符之一 |
| `ContainsLineTerminator(text)` | 文本（空白块 `Temp` / 区域注释 `Tmp`）里有没有 |
| `HasLineBreakUnit(unit)` | trivia 单元（`WrapSymbol` / `AreaAnnotation`）里有没有 |
| `HasBetween(left, right)` | 两个源位置之间（含块注释内部）有没有 |
| `HasBefore(units, tokenIndex)` | 前一个**代码**单元到当前单元之间有没有（源位置优先，块体无 trivia 单元时也成立；位置不可用退回 trivia 单元） |
| `HasAfter(last)` | 关键字之后跳过空格/注释是否先出现行终止符（行注释以行终止符收尾；EOF 的纯行注释不算） |

### 3.2 各文件只替换「换行判据」（不动其它逻辑）

| 文件 | 方法 | 改法 |
|---|---|---|
| `typescript/tokens/statements/expression-statement-possible-shape.xl.md:186` | `HasLineBreak` | 转调 `LineTerminator.HasLineBreakUnit` |
| 同上 `:606` | `HasLineBreakBefore` | 转调 `LineTerminator.HasBefore` |
| `typescript/tokens/statements/statement-builder.xl.md:1576` | `HasLineBreakAfter`（return/throw/break/continue 受限产生式） | 转调 `LineTerminator.HasAfter` |
| `typescript/tokens/statements/statement-scanner.xl.md:930` | `NoLineBreakBetween` | `!LineTerminator.HasBetween(...)` |
| `typescript/tokens/declarations/function-declaration-possible-shape.xl.md:287/:297` | `NoNewlineBefore` / `LineBreakBefore` | `!HasBefore` / `HasBefore` |
| `typescript/tokens/expressions/expression-builder.xl.md:645` | `ParseYield` 的行终止符扫描（原 60 行手写扫描） | 一行 `LineTerminator.HasAfter(yieldUnit.SourceRange.End)` |
| `typescript/tokens/types/member-boundary.xl.md:63` | `HasLineBreakBetween` | 转调 `LineTerminator.HasBetween` |
| `typescript/run/typescript-template.xl.md:131` | `TypeScriptRegexTemplate.HasLineBreakBetween` | 转调 `LineTerminator.HasBetween` |

### 3.3 同口径补齐（原 writeScope 列表之外，**纯换行判据替换**，请 merger 注意）

任务说明的「已知落点」不是穷尽列表；这三处同样是「是否换行」判据，不补则目标红不齐
（`type T = A<LS>z;`、`import …<LS>import …`、`export {…} from "m"<LS>type T = A`）：

| 文件 | 改动 |
|---|---|
| `typescript/tokens/declarations/import-declaration-end-possible-shape.xl.md:111-141` | `CanEndAt` 的原始前探：行终止符分支改用 `LineTerminator.IsLineTerminator`（LF/CR/LS/PS 统一；CR 不再当空格），行注释跳过改用同一判据 |
| `typescript/tokens/declarations/export-declaration-end-possible-shape.xl.md:109-131` | `CanEndAt`：同上（`lineBreak` 由任意行终止符置位；行注释到任意行终止符结束） |
| `typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md:254` | `HasLineBreakBetween` 转调 `LineTerminator.HasBetween`（保留「位置不可用退回 trivia」分支） |

这三处与合并冲突表的 A/D、A/B 文件不重叠；若 merger 认为越界，只需保留其 hunk 之外的 A 改动也能
让其余目标红转绿，但这三族会退回红（见 §6 遗留说明）。

## 4. 测试增量

1. `typescript/cases/end-compute.ts` 末尾唯一标记段 `// ══ cover8（U+2028/2029 ASI）…`：
   **+33 条**（262 → 295），base 先行（LF 对照 `function f(){ return\n1; }` / `a\nb` /
   `const a = 1;\nconst b = 2;` / `function* g(){ yield\n(x) }`），再 LS/PS 变体：
   return 受限产生式 4、表达式语句 ASI 6、声明边界 6（const/let/type/import/export）、
   块体内部 6、受限产生式其余 + 箭头/类成员 7。
   LS/PS 用**行内字面字符**写（reader 只按 LF 切行，且 `trim()` 会吃掉行首尾的 LS/PS）；
   `ast-json.mjs end-compute` 重生成两份快照并随分支提交，`ast-json-diff end-compute` 295/295 全一致。
2. 新 token 语料夹具 `tests/cases/token/lexical/lex-line-terminator-asi.ts`（1 条用例，
   带 `xl:note` + `xl:expect Let,Function,FunctionBody,Identifier`）：
   `token-ast` total 1714 → 1715、ok 1704 → 1705；`cases:check` 1718 → 1719、0 不合格。
3. 探针（tmp，不进 git）：`tmp/probe-asi.mjs` + `tmp/cases-asi-before.json`（56 条）：
   修前 31 红 → 修后 0 红；每条 report 里有 TS AST 三栏对照。

## 5. 构建 / 复现

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover8-asi
# xl_build(cwd=..., paths=[改过的 .xl.md…], targets=["ts"], out="dist")
.\node_modules\.bin\tsc.cmd -p tsconfig.json
node typescript/cases/ast-json.mjs end-compute
node typescript/cases/ast-json-diff.mjs end-compute
node typescript/cases/ast-json.mjs; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node ./tests/parse/validate.mjs
node typescript/cases/real-dts-ast.mjs
```

## 6. 遗留 / 交接

1. **`type-builder.xl.md:515 HasLineBreakBeforeCurrent`** 仍是原始 `\n` 扫描（不在本任务 scope）：
   本批 56 条探针没有它的红点（覆盖到的类体/类型字面量路径都已被其它判据兜住），
   但为「全 ts 层同口径」应下批一并转调 `LineTerminator.HasBefore`。
2. **注释/行号扫描不是 ASI 判据，本轮未动**：`import-clause-possible-shape` /
   `import-equals-declaration-possible-shape` 里的「跳过 `//` 到 `\n`」用于读下一行首词
   （行注释在 LS 处结束属于注释词法，不是 ASI 断句）；`text-document.xl.md` 的 CR/LF→行号/Pos
   处理也不是 ASI。若后续发现注释后 LS 的续接词判断有红，再按同一助手补
   「行注释到任意行终止符结束」。
3. **合并注意**：「已知落点」里 `expression-statement-possible-shape` / `statement-scanner`
   与 cover8-D 同文件、`function-declaration-possible-shape` 与 cover8-B 同文件；
   本分支在这些文件里**只改换行判据（转调助手）**，不改候选逻辑/边界语义，
   逐 hunk 保留双方即可。§3.3 的三处是对冲突表的补充，建议合并时同样按 hunk 保留。
