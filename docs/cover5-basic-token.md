# cover5 basic-token 类别报告（§6「basic token 存在问题」）

- 分支：`cover5-basic-token`（从 `feature/quick-parse` 的 `5362a38b` 起，未 merge、未 push）
- 工作区：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover5-basic-token`
- 类别边界：只处理「字符由哪个 basic token 承接」（`AreaAnnotation` / `LineAnnotation` / `RegexToken` /
  `String` / `Bracket` / `WrapSymbol` / `Symbol` / `Common`，注释与空白是 trivia）。
- core 纪律：`core/**` **零改动**；`core/syntax/basic-tokens/` 一行未动；`typescript/IMPORTANCE.md` 未动。

## 1. 基线 → 最终读数

| 项 | 基线（`5362a38b`） | 最终（本轮） | 判定 |
|---|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5335 / cj-ok 5335 / cj-fail 0（47 构造） | **5352 / cj-ok 5352 / cj-fail 0（47 构造）** | 5335+17，全绿 |
| `node typescript/cases/ast-json-diff.mjs` | 5335/5335，结构 0 / 位置 0 / 字段 0 | **5352/5352，结构 0 / 位置 0 / 字段 0** | 全绿 |
| `node typescript/cases/token-ast.mjs --quiet` | known-gap 0；non-known-gap 1704（ok 1694 / ts-invalid 10，crash 0 diff 0） | **完全一致**：known-gap 0；non-known-gap 1704（ok 1694 / ts-invalid 10，crash 0 diff 0） | 无回归 |
| `node typescript/cases/real-dts-ast.mjs` | 226 文件 / 226 一致 | **226 文件 / 226 一致 / 崩溃 0** | 无回归 |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | exit 0 | **exit 0** | 无回归 |
| `git status --short` | 空 | 4 个预期文件（见 §5） | 无多余改动 |

## 2. 探针与问题清单

探针：`tmp/probe-r6.mjs`（**tmp 不进 git**）。口径与 `typescript/cases/token-ast.mjs` 一致：
同输入分别用 TS 6.0.3 `ts.createSourceFile(text, ScriptKind.TS)` 与 `SourceFileRunner.Parse`，
经 `typescript/cases/ast-compare.mjs` 的 `createAstCore` / `cjAst` 归一后整树比较；
**只认 TS `parseDiagnostics.length === 0` 的输入**（TS 自身非法的 6 条剔除：legacy octal、`08`/`09`、
字符串 octal escape、`\u{0}`、`<!--`）。

读数：106 输入 → TS 合法 100 → 修前 **74 一致 / 26 红**，修后 **87 一致 / 13 红**。

### 2.1 已修（转绿 13 条）：ECMAScript 全空白集被错归 `Common`

| # | 最小复现 | TS（合法，0 diag） | 本仓（修前） | basic token 归类 |
|---|---|---|---|---|
| 1 | `const a = 1;<NBSP>const b = 2;` | 2 条 `VariableStatement` | crash「表达式语句没有读完」 | NBSP 被 `Common` 吞进标识符，未成 `WrapSymbol` |
| 2 | `const<NBSP>a = 1;` | `VariableStatement` | diff：`ExpressionStatement`（`const` 不再是关键字） | 同上 |
| 3 | `const a = 1;<U+1680>const b = 2;` | 2 条语句 | crash | 同上 |
| 4 | `const a = 1;<U+2000>…` | 2 条语句 | crash | 同上 |
| 5 | `const a = 1;<U+2003>…` | 2 条语句 | crash | 同上 |
| 6 | `const a = 1;<U+200A>…` | 2 条语句 | crash | 同上 |
| 7 | `const a = 1;<U+202F>…` | 2 条语句 | crash | 同上 |
| 8 | `const a = 1;<U+205F>…` | 2 条语句 | crash | 同上 |
| 9 | `const<U+3000>a = 1;` | `VariableStatement` | crash | 同上 |
| 10 | `const a = 1;<U+3000>const b = 2;` | 2 条语句 | crash | 同上 |
| 11 | `const a = 1;<U+2028>const b = 2;` | 2 条语句 | crash | 同上（U+2028 为 LineTerminator，仍是 trivia） |
| 12 | `const a = 1;<U+2029>const b = 2;` | 2 条语句 | crash | 同上 |
| 13 | `const a = 1;<U+200B>const b = 2;` | 2 条语句 | crash | 同上 |
| 14 | `const a = 1;<U+2028>const b = 2;` 变体 `type T =<U+2028>number;` | `NumberKeyword` | diff：`TypeReference` | 同上（`number` 被拼成标识符） |

**根因（精确位置）**：`core/syntax/templates/symbol-template.xl.md:222-238` `IsWhiteSpace`
只认四种空白（`" "` / `"\t"` / `"\r"` / `"\n"`）；`core/syntax/basic-tokens/common.xl.md` 的
`IsAppend` 只看 `IsSymbol || IsWhiteSpace`，因此上述字符既非符号也非空白 ⇒ 被 `Common` 吞进
`Temp`，标识符 / 关键字 / 数字全部错位（`WrapSymbol` 收不到它们，trivia 变成代码文本）。

**修复（只动 typescript 层，core 零改动）**：
`typescript/run/typescript-symbol-template.xl.md` 里**本来就有** `TypeScriptSymbolTemplate.IsWhiteSpace`
的覆写（原先把 `\v`/`\f` 补进 ts 口径），本轮把它扩成 ECMAScript 的 **WhiteSpace + LineTerminator 全集**：
`U+000B`、`U+000C`、`U+00A0`、`U+1680`、`U+2000–U+200B`、`U+2028`、`U+2029`、`U+202F`、`U+205F`、`U+3000`。
U+FEFF 故意**不**放进来（它由 core 的 `Bom` basic token 认领，空白表再收一次会与 `Bom.CanStart` 抢字符）。
`WrapSymbol.Transit`、`Common`/数字模板/`Symbol` 的字符判据都问这一个方法，所以一个覆写即收口。

**四问（basic token 口径 = 字符应归属哪个单元）**
- 正确何时 build：这些字符**永不** build 成 shape——它们只该被 `WrapSymbol` 认领为 trivia；
- build 提什么：不提任何字段（`WrapSymbol` 在 `Close` 时被丢弃）；
- 何时 close：一段连续空白结束时 close；
- close 提什么：只决定下一段代码单元的 `Pos`（`前一非 trivia 单元 End + 1`），不进 AST。

### 2.2 仍红、**必须改 core**（用户裁定项，未实施，见 §4）

修后剩 13 条红，其中 11 条属 basic token 且只能改 core；另 2 条属其它类别（§3）。

| # | 形成 | 最小复现 | TS（0 diag） | 本仓 | 首要失效阶段 / 根因 |
|---|---|---|---|---|---|
| A | 行注释行尾只认 `\n` | `// c\rconst a = 1;` | `VariableStatement` | 整段被吞，树为空 | `LineAnnotation` 未在 lone CR 收尾：`core/syntax/basic-tokens/line-annotation.xl.md:124`（`source.Value !== "\n"`） |
| B | 同上 LS/PS | `// c<U+2028>const a = 1;`、`// c<U+2029>…` | `VariableStatement` | 树为空 | 同上（U+2028/2029 也是 LineTerminator） |
| C | shebang 行尾只认 `\n` | `#!x\rconst a = 1;` | `VariableStatement` | 树为空 | `core/syntax/basic-tokens/shebang.xl.md:68` 同一判据 |
| D | 字符串行续接只认 CR/LF | `const s = "a\<U+2028>b";` | text `"ab"` | text `"a<U+2028>b"`（字段差） | `String` 的行续接判据：`core/syntax/basic-tokens/string/translate.xl.md:62-63`（`Temp === "\r"` → 只认 `\n"`）、`:135`（`ch === "\n" \|\| ch === "\r"`） |
| E | `?.` 组合符号缺「后随数字」前瞻 | `const x = a?.5:b;` | 条件表达式 `a ? .5 : b` | crash「表达式没有读完」 | `Symbol` 合符号无条件合并 `?.`：`core/syntax/basic-tokens/symbol.xl.md:58` |
| F | `\u{…}` 位数写死 1–6 | `const \u{0000061} = 1;` | `VariableStatement`（码点 0x61） | crash「变量声明缺少标识符」 | `core/syntax/basic-tokens/common.xl.md:60/92/96`（`digits < 6`）；解码侧同一 6 位口径 `typescript/tokens/names/identifier-shape.xl.md:47` |
| G | 带标签模板里非法转义的 cooked 值 | ``const t = tag`\8`;`` | text `"\\8"`（cooked=undefined 回退 raw） | text `"8"`（字段差） | `core/syntax/basic-tokens/string/translate.xl.md:37/125` 把 `\8`/`\9` 按 NonOctalDecimalEscape 解成字符本身 |

## 3. 非本类别（写给 lead 分派，不进 basic-token case）

1. **`FirstAssignment` 节点 kind 与 TS 规范名 `EqualsToken` 不一致**（AST 投影/命名类）：
   最小复现 `x = 1 + 2;`（**纯 ASCII，与本轮空白改动无关**，修前修后都一样）。
   TS 侧投影 `EqualsToken`，本仓 `FirstAssignment`（`typescript/tokens/aliases/first-assignment-shape.xl.md:9`
   的类名直接成了 kind；`ast-compare.mjs` 的 `TS_KIND_ALIASES` 只归一 TS 侧）。
   现有 5335 条用例未覆盖「赋值表达式作为语句」这一形态，否则基线早红 —— 属覆盖缺口 + kind 口径问题。
   建议：要么把该 shape 类名/投影名对齐 `EqualsToken`，要么给 `cjAst` 加同向别名映射。
2. **U+2028/U+2029 不是 ASI 断句点**（end build / 行终止符口径类）：
   最小复现 `function f(){ return<U+2028>1; }`；TS 是 `ReturnStatement`（只含 `return`，end=20）+
   `ExpressionStatement(1)`，本仓修空白后 `ReturnStatement` end=23（把 `1` 当返回值）。
   与 A/B 同源（行终止符只认 `\n`/`\r`），但出口在 ASI 判定而非 token 归属。
   `type T =<U+2028>number;` 在空白修复后已转绿（不再是问题）。

## 4. 需用户裁定的场景清单（core 改动，AI 不得自行改 `core/syntax/basic-tokens/`）

> 共同的「为何不能绕」：这 7 项的失效点在 `core/syntax/basic-tokens/**` 的字符判据 / 收尾判据内部，
> `typescript/**` 只拿到模板配置（符号表、合符号表、数字后缀、正则模板、空白表覆写）与 AST 投影，
> **没有任何接口能改变「某 token 何时收尾 / 某字符是否并入」**。已尝试的 ts 层手段：`Ban` / `BanCombineSymbol`
> 会误伤合法形（例如 Ban `?.` 直接废掉全部可选链），故不可用。

**A/B：行注释与 shebang 的「行终止符」集合（A1）** 形态：`// c\r…`、`// c<U+2028>…`、`#!x\r…`。
- 方案 A（推荐）：把 `line-annotation.xl.md:124`、`shebang.xl.md:68` 的 `!== "\n"` 改成
  「不是 LineTerminator」（`\n` / `\r` / U+2028 / U+2029），CRLF 作为一个整体消费。
  代价：core 两个方法各一处判据；需同步行号/行计数口径；回归网 = 1704 份 token 语料（CRLF 注释、EOF 注释）。
- 方案 B：不动 core，把这类输入声明为不支持。代价：与 TS 永久不一致，且 `lex-bom.ts` 一族同类。
- **裁定问题**：允许改这两处行终止符判据吗？

**A/B：字符串行续接的行终止符集合（A2）** 形态：`"a\<U+2028>b"` / `"a\<U+2029>b"`。
- 方案 A（推荐）：`translate.xl.md:62-63/135` 的行续接判据从 CR/LF 扩到全部 LineTerminator
  （CRLF 视为一个续接、lone CR/LS/PS 各一个）。
- 方案 B：不支持。代价：与 TS 字段差（cooked text 多出 U+2028）。
- **裁定问题**：允许扩这类判据吗？

**A/B：`?.` 的后随数字前瞻（B1）** 形态：`a?.5:b`（含 `a ?.5 : b`）。
- 方案 A（推荐）：`symbol.xl.md:58` 合符号前对 `?.` 加前瞻：下一字符是十进制数字时不合并
  （ECMAScript 的 `?.` lookahead restriction），`?` 与 `.5` 各自成单元。
  代价：core 一处判据 + 需要 peek 下一字符的现有接口；回归网 = 全部可选链用例（`typescript/cases/` 与 token 语料）。
- 方案 B：`BanCombineSymbol(["?."])`——**不可行**（可选链全域失效）。
- **裁定问题**：允许在合符号判据里加这个前瞻吗？

**A/B：`\u{…}` 的位数上限（B2）** 形态：`\u{0000061}`（7 位前导零）。
- 方案 A（推荐）：`common.xl.md:60/92/96` 去掉「`digits < 6`」上限，改成「任意位十六进制，累计值 ≤ 0x10FFFF」；
  同步放宽 `typescript/tokens/names/identifier-shape.xl.md:47` 的解码（ts 层，本就允许改）。
  代价：core 前探需要累积数值防溢出（`\u{` 后可能很多位）；需保证 `\u{110000}` 仍非法。
- 方案 B：不支持（保持 1–6 位）。
- **裁定问题**：允许去掉 6 位上限吗？

**A/B：带标签模板的非法转义 cooked 值（B3）** 形态：``tag`\8` ``。
- 方案 A（推荐）：`translate.xl.md:37/125` 对 NonOctalDecimalEscape（`\8`/`\9`）在**带标签**模板里
  标记 cooked=undefined，AST 取原文（`\\8`）；无标签模板仍按 TS 报词法错误（本仓当前不报错，属超集）。
- 方案 B：不支持。代价：与 TS 字段差 1 条。
- **裁定问题**：允许改 translate 的 `\8`/`\9` 口径（并说明无标签模板的超集是否保留）吗？

**已实施、无需裁定（仅记录架构取向）**：ECMAScript 全空白集本轮走的是**方案 B（ts 层覆写空白表）**，
core 零改动。若用户认为「Unicode 空白表应属 core 的 `SymbolTemplate.IsWhiteSpace`」，
可后续把这张字符表下沉到 core 并把 ts 覆写删掉（方案 A），行为不变、只换归属。

## 5. 修复文件与新增用例

**修复文件（1 个）**：`typescript/run/typescript-symbol-template.xl.md`
（`IsWhiteSpace` 覆写扩充 + 注释说明；core 零改动）。

**新增用例（17 行）**：`typescript/cases/basic-token.ts` 末尾新段落
`// ══ cover5 round5（basic token）：ECMAScript 全空白集（已修，只动 typescript 层）══`
（遵守 IMPORTANCE §5：base 先行、按字符给形变体、一行一例；这些字符会被 `trim()` 从行首行尾吃掉，全部放行中）：

```
const wsb0 = 1; const wsb1 = 2;                       // base（普通空格）
const wa = 1;<NBSP>const wb = 2;                      // NBSP 三种位置
const<NBSP>wc = 1;
const wd =<NBSP>1;
const we = 1;<U+1680>const wf = 2;
const wg = 1;<U+2000>const wh = 2;
const wi = 1;<U+2003>const wj = 2;
const wk = 1;<U+200A>const wl = 2;
const wm = 1;<U+202F>const wn = 2;
const wo = 1;<U+205F>const wp = 2;
const<U+3000>wq = 1;
const wr = 1;<U+3000>const wsV = 2;
const wt = 1;<U+2028>const wu = 2;
const wv = 1;<U+2029>const ww = 2;
const wx = 1;<U+200B>const wy = 2;
type TW =<U+2028>number;
const wz = 1; /* c */<NBSP>const wz2 = 2;            // 注释 trivia + NBSP 叠加
```

（实际文件里是真实字符，不是 `\uXXXX` 转义——corpus reader 只还原 `\n`，写转义会得到字面反斜杠。）
单构造验证：`node typescript/cases/ast-json.mjs basic-token` → `cases=108 cj-ok=108 cj-fail=0`；
`ast-json-diff.mjs basic-token` → 108/108 完全一致。

**提交**：`cover5(basic-token): …`（分支 `cover5-basic-token`，未 merge / 未 push）。
含 `typescript/run/typescript-symbol-template.xl.md`、`typescript/cases/basic-token.ts`、
两份 `basic-token.*-ast.json` 快照、本文件。

## 6. 已探明无缺口的族（本轮探针实测，避免下一轮重复劳动）

数字（`0X`/`0O`/`0B` 大写前缀、`_` 分隔符、BigInt `n`、`.5`、`5.`、`5.e3`、`1E3`、`1e+3`、`1..toString()`）；
字符串（LF/CRLF/lone-CR 行续接、`\u{…}`、`\x41`、`\0`）；模板（嵌套、`\u{…}`、raw CR/CRLF 归一、`$`）；
正则（字符类里的 `/`、`\/`、全 flags、`é`/ZWJ/ZWNJ flag 字符、`\u{…}`、`=\= /`、正则后除法）；
`?.`/`??`/`??=`/`=>`/`>>`/`>>>` 合符号；shebang CRLF；BOM 在字符串/注释/代码前；
HTML 注释（TS 自身多为非法）；`\u` 标识符 1–6 位（第 7 位见 §4 B2）。

## 7. 遗留项

1. §2.2 的 7 个 core 阻断形（A–G）待用户裁定；裁定通过后按 §4 的方案实施，并由本类别补活跃行。
2. §3 的 2 项属其它类别（`FirstAssignment` kind 口径；U+2028/2029 的 ASI 断句），交 lead 分派。
3. `tmp/probe-r6.mjs` / `tmp/probe-r6.json` 是探针证据（tmp 被 gitignore，不进提交）。
