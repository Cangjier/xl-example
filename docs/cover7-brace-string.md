# cover7-1：字符串字面量 `\u{…}` 位数上限统一

本文件记录分支 `cover7-brace-string`（从主仓 `1fff4711` 拉出）的读数、复现、core 改动、与 F 口径的一致性、
测试增量与遗留。归属：`cover7` 第 1 项——**字符串字面量路径的 `\u{…}` 位数上限**（F 项只统一了标识符路径）。

## 0. 结论

- `\u{…}` 的**位数不再有 6 位上限**：`"\u{0000061}"`（7 位）、`"\u{000000061}"`（9 位）、
  `"\u{000000000000041}"`（15 位）、`"\u{00000000000000000061}"`（20 个前导零）都按码点 cooked；
  `"\u{000000000010FFFF}"` 解成 `U+10FFFF`（UTF-16 两个 code unit `DBFF DFFF`，逐 code unit 与
  `String.fromCodePoint(0x10FFFF)` 相等）。
- 非法对照（TS 有诊断、不入尺子）行为不变：`\u{110000}` / `\u{00000110000}` / `\u{0000000000110000}` /
  `\u{}` / 未闭合 `\u{61` 都按**原文**结算（与 TS 的 `text` 相同）。
- 修前 / 修后探针：**13 条候选 13 红 → 0 红**（全是 AST 的 `text` 字段差，TS `parseDiagnostics` 均为 0）。
- 门禁：`ast-json` **5797/5797**（基线 5784 + 13）、diff **0/0/0**；`basic-token` 196/196；
  `token-ast` total **1714**（1713 + 1 夹具）、ok 1704、crash 0 / diff 0 / known-gap 0 / ts-invalid 10（未变）；
  `cases:check` **1718 条 0 不合格**；`real-dts` 226/226；`tsc` 0 error；`xl_check` 0 error。
- **默认行为不变**：core 的 `StringTemplate.AllowLongUnicodeBraceEscape` 默认 `false` = 历史 6 位上限；
  ts 模板页把它打开。已用「开关关闭的模板」复跑验证（见 §3.4）。

## 1. 改写点（core 以 `StringTemplate` 开关表达，默认 = 历史行为）

| # | 文件 | 行 | 改动 |
| --- | --- | --- | --- |
| 1 | `core/syntax/templates/string-template.xl.md` | :40 | 新增 `AllowLongUnicodeBraceEscape:bool = false`：`\u{…}` 是否允许超过 6 位十六进制。默认 false = 历史行为 |
| 2 | `core/syntax/basic-tokens/string/translate.xl.md` | :30 `Accept` | 新增可选参 `allowLongUnicodeBraceEscape`：`u{…}` 分支在打开时位数不限、逐位判「再补一位是否仍 ≤ 上限」 |
| 3 | 同上 | :97 `Append` | 新增可选参：打开时只有 `}` 才收完（历史口径仍是第 7 位强制收完、由 DecodeClear 按原文结算） |
| 4 | 同上 | :148 `DecodeClear` | 新增 `allowLongUnicodeBraceEscape` 参数：`hex.length > 6` 只在开关关闭时生效；解码改用 `UnicodeBraceValueOf` |
| 5 | 同上 | :298 新 `static UnicodeBraceValueOf` | 逐位累计、越界即封顶 `MaxUnicodeCodePoint + 1`（防乘法溢出），与 `Common.UnicodeBraceEscapeValue` 同口径 |
| 6 | 同上 | :1 依赖 | `import { Common }`：借用 `Common.MaxUnicodeCodePoint()`（F 为本轮提供的 Unicode 上限常量，core 里唯一一处） |
| 7 | `core/syntax/basic-tokens/string/string.xl.md` | :215-226 / :338-348 | 两处转义结算把 `StringTemplate.AllowLongUnicodeBraceEscape` 传给 `Translate`（模板串分支与普通引号串分支都传） |
| 8 | `typescript/run/typescript-template.xl.md` | :241 | ts 模板启用：`StringTemplate.AllowLongUnicodeBraceEscape = true` |

**没有新增 core 常量**：上限值只有一处（F 已在 `core/syntax/basic-tokens/common.xl.md:71` 提供的
`Common.MaxUnicodeCodePoint()`）；本分支只是让字符串路径也去读它。

## 2. 复现与 TS 字段

TS 6.0.3 的 `StringLiteral.text` / `NoSubstitutionTemplateLiteral.text`（`parseDiagnostics = 0`）：

| 输入 | TS `text` | 改前本仓 `text` | 改后 |
| --- | --- | --- | --- |
| `const s = "\u{0000061}";` | `"a"` | `"\u{0000061}"`（原文） | `"a"` |
| `const s = "\u{000000061}";` | `"a"` | 原文 | `"a"` |
| `const s = "\u{000000000000041}";` | `"A"` | 原文 | `"A"` |
| `const s = "\u{00000000000000000061}";` | `"a"` | 原文 | `"a"` |
| `const s = "\u{000000000010FFFF}";` | `U+10FFFF`（2 个 UTF-16 code unit） | 原文 | 同 TS |
| `const s = "\u{000000000000000}";` | `U+0000` | 原文 | `U+0000` |
| `const s = "a\u{0000061}b";` | `"aab"` | `"a\u{0000061}b"` | `"aab"` |
| `const s = "\u{00000061}\u{00000042}";` | `"aB"` | 原文 | `"aB"` |
| ``const s = `\u{0000061}`;`` | `"a"`（rawText 原文） | 原文 | `"a"` |
| ``const s = `\u{000000000010FFFF}`;`` | `U+10FFFF` | 原文 | 同 TS |
| ``const s = `a\u{0000061}b${x}`;`` | TemplateHead `"aab"` | `"a\u{0000061}b"` | `"aab"` |
| ``tag`\u{0000061}`;`` | `text="a"`、`rawText="\u{0000061}"` | `text` 原文 | `text="a"` |
| ``tag`a\u{0000061}b`;`` | `text="aab"` | 原文 | `"aab"` |

要点：带标签模板里**合法**的长花括号转义仍然 cooked（`text="a"`），G 的「非法转义取原文」不受影响
（`rawText` 始终是原文）。区间 / 结构两侧本来就一致，只有 `text` 字段差。

## 3. 修法与 F 口径的一致性

### 3.1 判定口径（与 F 完全相同）

- 位数**不限**（前导零任意多）；
- **逐位累计**校验：`value = value * 16 + 当前位`，一旦 `value > Common.MaxUnicodeCodePoint()` 立即判非法；
- **防溢出**：`UnicodeBraceValueOf` 越界即封顶 `MaxUnicodeCodePoint + 1`、不再继续乘 16；
  `Accept` 里的 `value * 16 + 当前位` 也只在封顶值上做，乘法上限 `0x10FFFF * 16`，不会溢出；
- 越界 / 非法一律**按原文结算**（与 TS 的恢复口径一致），不抛错。

### 3.2 与标识符路径的关系

F 项的标识符路径（`core/syntax/basic-tokens/common.xl.md` 的 `UnicodeBraceEscapeDigits` /
`UnicodeBraceEscapeValue` / `IsUnicodeEscapeStart`，开关 `SymbolTemplate.SupportUnicodeEscapeIdentifier`）
已经实现了这套口径；本分支把同一套口径搬进字符串转义结算（`Translate`），
**共用** `Common.MaxUnicodeCodePoint()` 与同一份「累计封顶」写法，只是开关不同
（`StringTemplate.AllowLongUnicodeBraceEscape`）。两者默认都是关，所以打开之前行为都与历史一致。

### 3.3 三处 6 位上限都拆掉了

改动前 `\u{…}` 的 6 位上限写在三个地方，本分支逐个处理（全部按开关分叉，默认路径仍走历史分支）：

| 位置 | 历史行为 | 开关打开后 |
| --- | --- | --- |
| `Accept` | `Temp.length >= 8`（`u{` + 6 位）后只收 `}` | 位数不限，逐位判码点是否越界 |
| `Append` | 第 7 位时 `Temp.length >= 9` 强制收完 → 非法 | 只有 `}` 才收完 |
| `DecodeClear` | `hex.length > 6` → 原文 | 只判 `IsHex` + 累计值 ≤ 上限 |

### 3.4 默认行为验证（开关关闭 = 历史行为）

```
core StringTemplate().AllowLongUnicodeBraceEscape = false | LineTerminatorChars = ["\n","\r"] | StrictTemplateEscapes = false
ts 模板 StringTemplate.AllowLongUnicodeBraceEscape = true
  ts 模板（开关打开）  : "a"
  core 默认（开关关闭）: "\u{0000061}"（原文 = 历史行为）
```

## 4. 非法对照（TS 有诊断，不入尺子，行为记录）

| 输入 | TS 诊断 | 本仓 `text`（改前 / 改后一致） |
| --- | --- | --- |
| `"\u{110000}"` | An extended Unicode escape value must be between 0x0 and 0x10FFFF inclusive. | 原文 `\u{110000}` |
| `"\u{00000110000}"` | 同上 | 原文 |
| `"\u{0000000000110000}"` | 同上 | 原文 |
| `"\u{}"` | Hexadecimal digit expected. | 原文 `\u{}` |
| `"\u{61"` | Unterminated Unicode escape sequence. | 原文 `\u{61` |

语义上这与「越界立即非法、按原文结算」一致；TS 的 `text` 也是原文。

## 5. 测试增量

1. `typescript/cases/basic-token.ts` **append-only**（本分支 +13）：末尾唯一标记段
   `// ══ cover7（字符串 \u{…} 位数）…`。base 先行（7 位 → 9 位 → 15 位 → 20 个前导零 → `U+10FFFF` → 全零），
   再做变体（与普通字符混排、一条串两个长转义、无内插模板、带 `${}` 的 TemplateHead、
   带标签模板两种），共 13 条；快照 `basic-token.{cj,ts}-ast.json` 已重生成。
2. 新夹具 `tests/cases/token/lexical/lex-string-unicode-brace-long.ts`（5 条 + `xl:note` / `xl:expect`）：
   普通串 3 条 + 无内插模板 1 条 + 带标签模板 1 条；`cases:check` 通过（0 不合格）。
3. `token-ast` 1713 → **1714**（新夹具 ok、非 ts-invalid）。

## 6. 遗留

1. **`\u{}`（零位）**：core 侧沿用历史路径（`hex` 为空 → `IsHex` 为假 → 原文），与 TS 的
   `text="\u{}"` 相同；TS 有诊断，未入尺子、未建用例（token 夹具里也不放，避免增加 ts-invalid 计数）。
2. **`\u` + 4 位 / `\x` + 2 位**：完全未动（`Temp.length === 5` / `=== 3` 两条不变）。
3. **标识符路径**：F 已实现同口径；本分支没有改 `common.xl.md`，只 import 它的上限常量。
4. **core 的其它字符串形态**（逐字 / 原始串 / 前缀内插）：`AllowLongUnicodeBraceEscape` 默认 false，
   这些路径不会发生可观测变化（且 TS 模板里它们也不经过本开关的打开分支——
   打开后两者的差异仅限 `StringTemplate` 的配置值，`Translate` 只在被调用时读参数）。
