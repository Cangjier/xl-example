# cover6-F：`\u{…}` 位数上限与 code point 校验

本文件记录 cover6 core 轮**项 F**（`docs/cover5-FINAL.md` §5）的读数、复现、改动与证据。
工作区 `cover6-core-unicode`，分支 `cover6-core-unicode`，基线 `99f286d8`（prep）。

## 1. 基线 / 最终读数

| 项 | 基线（`99f286d8`） | 本分支结束 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5709 / 5709 cj-ok（47 构造） | **5735 / 5735 cj-ok（47 构造）**（+26） |
| `node typescript/cases/ast-json-diff.mjs` | 5709/5709；结构 0 / 位置 0 / 字段 0 | **5735/5735；结构 0 / 位置 0 / 字段 0** |
| `node typescript/cases/token-ast.mjs --quiet` | total 1704；ok 1694 / crash 0 / diff 0 / ts-invalid 10 / known-gap 0 | **total 1705；ok 1695 / crash 0 / diff 0 / ts-invalid 10 / known-gap 0**（+1 夹具） |
| `node typescript/cases/real-dts-ast.mjs` | 226 / 226 / 226 | **226 / 226 / 226** |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | exit 0 | **exit 0** |
| `xl_check(core, typescript)` | 863 files / 0 error | **863 files / 0 error**（2464 warning 为既有 W3102/W3103 + 3 条 E2004 孤儿产物噪音） |
| TS | 6.0.3 | 6.0.3 |

## 2. 修前现象（真红）

探针 `tmp/probe-unicode.mjs`（TS `createSourceFile` 的 `parseDiagnostics` + `tsAst` vs 本仓
`SourceFileRunner.Parse` 的 `cjAst`，三栏口径与 `typescript/cases/` 一致）。修前 41 + 17 条输入里
**TS-valid 且本仓 crash 的真红 12 + 16 条**，全部是「花括号转义位数超过 6（前导零）」：

| 复现（TS parseDiagnostics = 0） | 修前本仓 |
|---|---|
| `const \u{0000061} = 1;`（= `const a = 1;`，TS `Identifier.text = "a"`） | crash「变量声明缺少标识符」 |
| `const \u{000000061} = 1;` | 同上 |
| `const \u{000000000000000000061} = 1;` | 同上 |
| `const a\u{0000062}c = 1;` | crash「变量声明里有无法识别的单元」 |
| `const \u{0000061}\u{0000062} = 1;` | crash「变量声明缺少标识符」 |
| `const o = { \u{0000061}: 1 };` | crash「缺少标识符」 |
| `class F { \u{0000062}() {} }` | crash「类成员名字不是标识符」 |
| `const p = o.\u{0000062};` | crash「缺少标识符」 |
| `let t: \u{0000049};` | crash「不支持的类型起点」 |
| `function f\u{0000066}() {}` | crash「函数声明缺少参数表」 |
| 星面 code point：`const \u{0001D400} = 1;`（U+1D400 MATHEMATICAL BOLD CAPITAL A，ID_Start） | crash「变量声明缺少标识符」 |
| 长前导零 + `_` / `$`：`\u{000005F}` / `\u{0000024}` | 同上 |

根因（定位到行）：
- `core/syntax/basic-tokens/common.xl.md`
  - `IsAppend`：`return digits < 6 && IsHexDigit(...)` —— 第 7 位十六进制不再并进 `Common`，
    token 被提前切断，`\u{0000061}` 根本进不了标识符；
  - `IsUnicodeEscapeStart`：前探循环 `while (at < count && digits < 6 && ...)` —— 7 位以上直接判非法；
  - `UnicodeBraceEscapeDigits`：`body.length > 6` 返回 `-1`，让 `{` / `}` 的让位判据也失效。
- `typescript/tokens/names/identifier-shape.xl.md:47`（解码侧）：正则 `/^[0-9a-fA-F]{1,6}$/`
  与 `0x10ffff` 比较 —— 即使 token 拼对，解码也会把 7 位以上当非法、保留原文。

TS 口径（同一批输入的 AST 真值）：`\u{0000061}` 解成 `a`（`Identifier[6,15] text="a"`，
区间仍是**原文** 9 个字符）；`\u{0001D400}` 解成代理对 `"𝐀"`（`Identifier.text` 是该星面字符）；
其余标识符位置（属性名 / 方法名 / 类型位）同理。

## 3. 改动逐行

### 3.1 `core/syntax/basic-tokens/common.xl.md`（F 的主体）

1. **`IsAppend`**（:41-67）：
   - 旧：`return digits < 6 && this.Template.SymbolTemplate.IsHexDigit(Src.Value);`
   - 新：hex 位照收，但用**累计码点**判「再补一位会不会越界」：
     `return this.UnicodeBraceEscapeValue() * 16 <= Common.MaxUnicodeCodePoint();`
   - 前导零时值为 0 ⇒ 任意长；`\u{110000}` 这类越界转义在**起点**就被
     `IsUnicodeEscapeStart` 挡掉，不会进这条分支（守卫只兜底）。
2. **新增 `static method MaxUnicodeCodePoint`**（:71-79）：`return 0x10FFFF;`
   —— Unicode 标量上限，属 Unicode 定义、与目标语言无关，留在 core；
   没有新增「ECMAScript 专用」常量，`\u{…}` 语法仍由既有开关
   `SymbolTemplate.SupportUnicodeEscapeIdentifier`（默认 `false`）表达 ⇒ 其它语言默认行为不变。
3. **`IsUnicodeEscapeStart`**（:81-135）：
   - 旧：`while (at < count && digits < 6 && IsHexDigit(...))`，末尾 `return value <= 0x10FFFF`；
   - 新：去位数上限；每收一位就判 `if (value > MaxUnicodeCodePoint()) return false;`
     —— 前导零把串拉任意长而值仍是 0；一旦越界后续只会更大，当场判非法，
     同时把乘法限制在 `0x10FFFF * 16` 之内，**不会数值溢出**；末尾只判 `}` 收口。
4. **`UnicodeBraceEscapeDigits`**（:137-165）：删 `body.length > 6` 那半条（只保留 `}` / 非法 hex 判据），
   位数本身不再设限。
5. **新增 `UnicodeBraceEscapeValue`**（:167-196）：从 `Temp` 尾部（最后一个 `\` 起的 `\u{hex*}`）
   累计码点；越界即封顶返回 `MaxUnicodeCodePoint + 1`（调用方只做 `* 16 <= 上限` 判断，不会溢出）。

### 3.2 `typescript/tokens/names/identifier-shape.xl.md`（解码侧同步）

`DecodeIdentifierEscapes`（:40-80）：
- 花括号形正则 `/^[0-9a-fA-F]{1,6}$/` → `/^[0-9a-fA-F]+$/`（位数不限）；
- 上限比较改用 `Common.MaxUnicodeCodePoint()`（与 token 侧同一常量，不再写字面量 `0x10ffff`）；
- 超长串 `parseInt` 得到的巨数 / `Infinity` 只参与 `<= 上限` 比较，越界就保留原文，
  `String.fromCodePoint` 只会在 `[0, 0x10FFFF]` 内被调用（防 `RangeError` 与数值溢出）。

## 4. 非法形 / 边界证据（不入尺子，只证明「不接受 / 不崩」）

TS 对这些形态 `parseDiagnostics ≠ 0`（`Invalid character.` / `Unterminated Unicode escape sequence.`），
所以不写活跃用例；探针记录本仓行为（`tmp/cases-unicode-before.report.json`）：

| 输入 | TS | 本仓（修后） |
|---|---|---|
| `\u{110000}` / `\u{110001}` / `\u{FFFFFFFF}` | Invalid character（码点越界） | 落回符号层，抛语法异常（「变量声明缺少标识符」），**不接受、不崩进程** |
| `\u{000000000000000110000}` | Invalid character（越界，长前导零） | 同上 |
| `\u{}` | Invalid character | 同上 |
| `\u{ 61}` / `\u{G}` | Invalid character | 同上 |
| `\u{61` / `\u{0000061`（未闭合） | Unterminated Unicode escape sequence | 抛「表达式语句没有读完」 |
| `\u{10FFFF}` / `\u{FFFF}` / `\u{D7FF}` / `\u{0000}` | Invalid character（解出的 code point **不是标识符字符**，如 noncharacter / 控制字符） | 本仓接受为转义标识符（与修前一致：本仓不校验 ID_Start/ID_Continue，只校验 ≤ 0x10FFFF）——这是既有边界，本轮不扩大范围 |

`\u{10FFFF}` 因此**不能**作为 AST 活跃用例（TS 侧就非法）；「上限附近 + 位数不限」的合法形用
星面标识符 U+1D400 与前导零长串覆盖（见 §5），上限比较本身由 `\u{110000}` 探针与代码判据覆盖。

## 5. 测试增量

1. **`typescript/cases/basic-token.ts`**（末尾唯一标记
   `// ══ cover6 core（F `\u{…}` 位数 / code point 边界）══`，只追加、不重排/不删其它段）：
   +26 条（108 → 134），`ast-json basic-token` 134/134、`ast-json-diff basic-token` 全一致，
   快照 `basic-token.ts-ast.json` / `basic-token.cj-ast.json` 已随分支重新生成。
   覆盖：1–6 位 base（`\u{61}` / `\u{0061}` / `\u{000061}`）、7/9/35 位前导零、`_`/`$` 长前导零、
   `a\u{…}c`、连续转义、`\uXXXX` 与 `\u{…}` 混排（两个方向）、属性名 / 方法名 / 成员访问 / 类型位 /
   函数名，以及星面 U+1D400 的 6/7/9/23 位变体。
2. **token 语料夹具** `tests/cases/token/lexical/lex-unicode-escape-brace-long.ts`（新文件，1 条用例）：
   带 `// xl:note` + `// xl:expect`，一份多行合法源文件（1–6 位 base、长前导零、星面、各标识符位置）。
   `token-ast lexical/lex-unicode-escape-brace-long` → `ok`；全量 total 1704 → 1705、ok 1694 → 1695。
3. **探针**（tmp，不进 git）：`tmp/probe-unicode.mjs` + `tmp/cases-unicode-before.json`（41 条）与
   `tmp/cases-unicode-boundary.json`（17 条）：修前 12+16 红 → 修后 **0 红**；TS-invalid 19 条行为如上表。

## 6. 构建 / 复现

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover6-core-unicode
# xl_build(cwd=..., paths=["core/syntax/basic-tokens/common.xl.md",
#          "typescript/tokens/names/identifier-shape.xl.md"], targets=["ts"], out="dist")
.\node_modules\.bin\tsc.cmd -p tsconfig.json
node typescript/cases/ast-json.mjs basic-token
node typescript/cases/ast-json-diff.mjs basic-token
node typescript/cases/token-ast.mjs lexical/lex-unicode-escape-brace-long
node typescript/cases/ast-json.mjs; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
```

`xl_build` 摘要：`2 written / 0 error(s)`（只重建两页 + 依赖），其余 warning 为既有噪音。

## 7. 遗留 / 接口

1. **字符串字面量里的 `\u{…}`（项 G，另一条分支）**：`core/syntax/basic-tokens/string/translate.xl.md:185`
   仍写死 `hex.length > 6`（越界只按 `> 0x10ffff` 返回原文）。它不在本任务 write scope，本轮**未改**；
   若 G 分支没有覆盖位数上限，合并后需把字符串路径也改成「位数不限 + `Common.MaxUnicodeCodePoint()`」，
   与标识符侧同一口径（改动点：同一个 `hex.length > 6` 判据）。
2. **ID_Start / ID_Continue 校验**：本仓只校验「≤ 0x10FFFF」，不校验解出的 code point 是不是合法标识符字符
   （`\u{10FFFF}` / `\u{0000}` 这类 TS 非法的形态本仓会接受）。属既有边界（本轮前后一致），
   是否收紧交后续轮次裁定。
3. **`\u{…}` 位数上限的默认值开关**：本轮选择「去上限 + `SupportUnicodeEscapeIdentifier` 开关照旧（默认
   `false`）」，没有新增 `MaxUnicodeEscapeDigits` 之类的模板字段 —— 因为该语法默认对所有语言关闭，
   其它语言默认行为零影响；`0x10FFFF` 是 Unicode 定义，留在 core 不构成 TS 专用常量。
