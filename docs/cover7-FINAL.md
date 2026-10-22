# cover7 FINAL — cover7-1 字符串 `\u{…}` 位数统一（独立终验）

> 终验者：end-build 作者（独立于作者 missing-end 与合并者 infra）。
> 主仓 `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/quick-parse` @ **`3aa2370d`**
> （`merge: cover7-brace-string`，父 `1fff4711` + `89ca10d7`）；工作区干净。
> 方法：结构/审计用主仓 `git` 只读复核；行为探针与门禁在**独立验证克隆**
> `C:\Users\Admin\Documents\GitHub\xl-example-set\cover6-final-verify`（已更新到 `3aa2370d`，从 `.xl.md`
> 重新构建 `4 written / 0 error` → `tsc` 0）上实测；探针/日志只在该克隆 `tmp/`（不提交）。
> 本文档是本次终验**唯一新增**的代码外产物（`docs(cover7): final report` 提交内容：
> 本文件 + `docs/cover6-FINAL.md` 的 §8 关闭标注与 §10 附录）；未改代码/用例/夹具。

## 1. 结论

**PASS（无阻塞项）** —— cover7-1「字符串字面量 `\u{…}` 位数上限统一」实测全部达标：

- 7 类行为探针（27 条输入 + basic-token 新段抽样 3 条）**FAIL 0**（TS 6.0.3 `diag=0` 且结构/位置/字段三栏 `0/0/0`）；
- core 只改批准 **3 文件**，默认行为 = 历史行为（`AllowLongUnicodeBraceEscape = false`，运行时实测证据见 §5）；
- 全量门禁与 infra 报数一致：ast-json **5797/5797**、diff **0/0/0**、token-ast **1714**（ok 1704 / ts-invalid 10 /
  crash 0 / diff 0 / known-gap 0）、cases:check **1718/0**、real-dts **226/226**、tsc **0**、xl_check **0 error**；
- 新增用例 / 夹具：`basic-token` 183→**196**（+13）、token 语料 1713→**1714**（+1 夹具，头部标签合法）。

## 2. 结构与范围（逐条实测）

```text
HEAD                       3aa2370d6cc96f5a5a346f7b1d24d841039b8e55
git log --merges --oneline 1fff4711..HEAD
  3aa2370d merge: cover7-brace-string
git status --porcelain      （空）
git ls-files | grep '^tmp/'  → 空
git diff 1fff4711..HEAD -- typescript/IMPORTANCE.md  → 0 行
git diff 1fff4711..HEAD --stat
  9 files changed, 1265 insertions(+), 26 deletions(-)
```

范围拆解（9 文件）：

| 类别 | 文件 |
| --- | --- |
| core（**恰好批准 3 个**） | `core/syntax/templates/string-template.xl.md`（±13）、`core/syntax/basic-tokens/string/translate.xl.md`（±75）、`core/syntax/basic-tokens/string/string.xl.md`（±27） |
| ts 层启用 | `typescript/run/typescript-template.xl.md`（+9，:241 打开开关） |
| 用例/快照 | `typescript/cases/basic-token.ts`（+20 行，13 条用例）、`basic-token.cj-ast.json`/`.ts-ast.json`（各 +506） |
| token 语料 | `tests/cases/token/lexical/lex-string-unicode-brace-long.ts`（新，+8） |
| 作者文档 | `docs/cover7-brace-string.md`（+127） |

基线：cover6 终点 `1fff4711`（ast-json 5784、basic-token 183、token 1713、cases:check 1717/0）。
回滚点：`1fff4711`；cover7-1 可单独 `git revert -m 1 3aa2370d`。

## 3. 行为实测（自写探针，不采信作者报告）

探针口径与 `typescript/cases/ast-compare.mjs` 一致：TS 6.0.3 `ts.createSourceFile`（`parseDiagnostics=0`）vs
`SourceFileRunner.Parse`，比较结构 / 位置 / 字段；**27 条输入 + 抽样 3 条 = 30 条，FAIL 0**。

### 3.1 主目标（全部 PASS）

| 输入 | TS / 本仓 |
| --- | --- |
| `const s = "\u{0000061}";`（7 位） | `text="a"`，三栏一致 |
| `const s = "\u{0000000000000000000000000061}";`（27 位前导零） | `text="a"`，一致 |
| `const s = "\u{10FFFF}";` | 码点 `U+10FFFF`（UTF-16 代理对 `DBFF DFFF`），`text` 与 TS 相等 |
| `const s = "\u{000000000010FFFF}";` | 同上（长前导零） |
| `const s = "\u{000000000000000}";` | `U+0000`，一致 |
| `const s = "a\u{0000061}b\u{0000062}c";` | `"aabc"` 对应文本，一致 |
| ``const s = `\u{0000061}`;`` / `` `\u{000000000010FFFF}`; `` | cooked 正确（rawText 仍原文），一致 |
| ``const s = tag`\u{0000061}`;`` / `` tag`a\u{000000000010FFFF}b`; `` | 带标签模板：`text` cooked、`rawText` 原文，三栏一致 |

### 3.2 回归组（全部 PASS）

- 既有转义：`"\u0041"`、`"\x41"`、`"abc"`、`` `a\n\u0041` ``；
- D 行续接（cover6）：`"a\<U+2028>b"`、`"a\<U+2029>b"`、`` `a\<U+2028>b` ``；
- G 非法转义（cover6，带标签模板才合法）：`` tag`\08` ``、`` tag`\09` ``、`` tag`\101` ``、`` tag`\00` `` 全绿。

### 3.3 TS 自身非法（记录行为，不入尺子）

| 输入 | TS 6.0.3 | 本仓 |
| --- | --- | --- |
| `"\u{110000}"`（越界） | diag=1 | 按原文结算（与 TS `text` 一致） |
| `"\u{}"`（空） | diag=1 | 按原文结算 |
| `"\u{ZZ}"`（非十六进制） | diag=1 | 按原文结算 |
| `"\101"` / `"\08"` / `"\09"`（普通字符串里的 legacy octal） | **diag=1**（TS 不允许八进制转义） | 本仓按八进制解码——TS 非法，不入尺子；带标签模板版本已入 §3.2 回归 |

### 3.4 basic-token 新段抽样（3 条）

`typescript/cases/basic-token.ts` 新段从行 **320** 起（`// ══ cover7（字符串 \u{…} 位数）…`），
active 用例 **13 条**（行 326–338）。抽 3 条按 `decodeCaseText` 还原后现场对拍：
行 326 `const b1 = "\u{0000061}";`、行 332 `const b7 = "a\u{0000061}b";`、
行 338 ``tag`a\u{0000061}b`;`` → **3/3 `diag=0` + 三栏 0/0/0**。

## 4. core 改动逐文件（批准 3 文件）

| 文件 | 行 | 改动 |
| --- | --- | --- |
| `core/syntax/templates/string-template.xl.md` | :40 | 新增字段 `AllowLongUnicodeBraceEscape:bool = false`；**默认 false = 历史 6 位上限** |
| `core/syntax/basic-tokens/string/translate.xl.md` | :30 `Accept` | 新增可选参 `allowLongUnicodeBraceEscape`：关闭时保持旧 `Temp.length >= 8` 分支（第 7 位只接受 `}`）；打开时按「累计值*16+这一位 ≤ `MaxUnicodeCodePoint`」逐位收 |
| 同上 | :97 `Append` | 新增可选参：关闭时保持旧 `Temp.length >= 9` 强制收完；打开时只有 `}` 才收完 |
| 同上 | :148 / :233 `DecodeClear` | 新增 `allowLongUnicodeBraceEscape` 参数：`hex.length > 6` 只在**关闭**时生效；解码改用 `UnicodeBraceValueOf` |
| 同上 | :298 新 `static UnicodeBraceValueOf` | 逐位累计、越界即封顶 `MaxUnicodeCodePoint()+1`（不再乘 16）→ 乘法 ≤ `0x10FFFF*16`，不会溢出 |
| 同上 | :3 依赖 | `import { Common }`：借用 `Common.MaxUnicodeCodePoint()`（标识符路径同款上限常量；core 内部模块引用，**package/lock 依赖 0 变化**，无循环依赖） |
| `core/syntax/basic-tokens/string/string.xl.md` | :215-226 / :338-348 | 两处转义结算（引号内内插串 / 普通引号串）把 `StringTemplate.AllowLongUnicodeBraceEscape` 传给 `Accept/Append/DecodeClear` |
| `typescript/run/typescript-template.xl.md` | :241 | ts 模板启用 `StringTemplate.AllowLongUnicodeBraceEscape = true`（ECMAScript 口径只在 ts 侧启用） |

## 5. 默认行为证据（运行时实测 + 分支保留）

**运行时（克隆 `build/ts` 直接 import，非文档）**：

```text
new StringTemplate().AllowLongUnicodeBraceEscape                    = false
new Template().StringTemplate.AllowLongUnicodeBraceEscape          = false
TypescriptTemplate.Create().StringTemplate.AllowLongUnicodeBraceEscape = true

Translate.DecodeClear("u{000000061}", …, allowLong 省略/false) = "\\u{000000061}"（历史：按原文结算）
Translate.DecodeClear("u{000000061}", …, allowLong true)        = "a"
Translate.DecodeClear("u{000061}",     …, allowLong false)      = "a"（历史允许 1–6 位）
Translate.DecodeClear("u{10FFFF}",     …, allowLong true)       = "􏿿"（长度 2：代理对）
Translate.DecodeClear("u{110000}",     …, allowLong true)       = "\\u{110000}"（越界原文）

Translate.UnicodeBraceValueOf: "61"→97, "0000061"→97, "10FFFF"→1114111,
  "110000"→1114112（= Max+1 封顶）, "000…000110000"→1114112（不溢出）, ""→0
Common.MaxUnicodeCodePoint() = 1114111
```

**三处 6 位上限全部已分叉**：`Accept` 的 `Temp.length >= 8`、`Append` 的 `Temp.length >= 9`、
`DecodeClear` 的 `hex.length > 6` —— 三者都在 `allowLongUnicodeBraceEscape` 为真时被新分支绕过，
缺省/`false` 时逐字保留旧路径。全仓 `git grep 'length > 6|length >= 9|length >= 8|0x10FFFF|MaxUnicodeCodePoint'`
（core+typescript）无第二处漏网上限：命中的只剩上述分叉点、`Common.MaxUnicodeCodePoint` 本身、
以及注释文字。

**core 无 TS/ECMAScript 专用常量**：开关名与字段是语言无关的通用能力（默认关），ECMAScript 的语义
（位数不限）只在 `typescript/run/typescript-template.xl.md:241` 启用；上限 `U+10FFFF` 是 Unicode 标量定义
（`Common.MaxUnicodeCodePoint`，cover6-F 已存在，标识符路径共用）。IMPORTANCE 零改动；`package.json`/
lock 文件零改动。

## 6. 与 F（标识符路径）口径一致性

| 维度 | F 标识符路径（cover6） | 字符串路径（cover7-1） |
| --- | --- | --- |
| 位数 | 不限（前导零任意多） | 不限（前导零任意多） |
| 上限 | 逐位累计 ≤ `Common.MaxUnicodeCodePoint()`（`U+10FFFF`） | 同左（同一常量、同一「逐位累计、越界封顶」写法） |
| 开关 | `SymbolTemplate.SupportUnicodeEscapeIdentifier`（默认关） | `StringTemplate.AllowLongUnicodeBraceEscape`（默认关） |
| 越界 | 非法（不建转义标识符，落回符号层/原文） | 非法（按原文结算，与 TS 恢复口径一致） |
| 溢出防护 | 封顶 `Max+1`、不再乘 16 | 同左（`UnicodeBraceValueOf`） |

两条路径共用 `Common.MaxUnicodeCodePoint()` 这一个 Unicode 上限常量，没有各自写死的数字。

## 7. 测试增量与门禁

| 项 | cover6 终点 `1fff4711` | cover7-1 `3aa2370d` | 增量 |
| --- | --- | --- | --- |
| ast-json（47 构造） | 5784/5784 | **5797/5797** | +13（basic-token 新用例） |
| ast-json-diff | 0/0/0 | **0/0/0** | — |
| basic-token 单 stem | 183/183 | **196/196**（diff 0/0/0） | +13 |
| token-ast | 1713（ok 1703 / ts-invalid 10） | **1714（ok 1704 / ts-invalid 10 / crash 0 / diff 0 / known-gap 0）** | +1 夹具 |
| cases:check | 1717 / 0 不合格 | **1718 / 0 不合格** | +1 夹具 |
| real-dts | 226/226 | **226/226**（crash 0 / diff 0） | — |
| tsc（`-p` 与 `--noEmit`） | 0 | **0** | — |
| xl_check（main，core+typescript） | 0 error | **863 文件 0 error**；2464 warning = 既有 W3102/W3103 + 3 条既有 E2004 | 无新增 error |

新夹具头合法性：`tests/cases/token/lexical/lex-string-unicode-brace-long.ts` 的 `xl:expect`
`Statement,Let,String,ConstString,Identifier` **全部 ∈ TAGS**、无幽灵标签、非覆盖层（无 `xl:round`，无需 `xl:end`）
（用 `validate.mjs` 导出的 `TAGS`/`GHOST_TAGS` 程序化核对，BAD 0）。

## 8. 遗留（本轮未动，均沿用 cover6-FINAL §8 的 2–6 项）

1. **G 的严格化落点**：tokenizer 不知道 tagged，当前统一产出原文（超集口径）；无标签 `` `\8` `` TS 非法（diag=1），
   不建用例、不入尺子；严格区分需 token 携带非法转义区间 + 形状层投影。
2. **F 的 TS 非法边界**：`\u{110000}`/`\u{}` 本仓 crash（TS 自身非法、不入尺子）；
   `\u{10FFFF}`/`\u{FFFF}`/`\u{D7FF}`/`\u{0000}` 标识符路径本仓接受（只校验 ≤ 0x10FFFF）。
3. **ID_Start / ID_Continue 不校验**：只校验码点上限（既有边界）。
4. **U+2028/29 的 ASI**：仍属 end 类遗留（本轮 core 只让 LS/PS 成 trivia；ASI 换行判据未改）。
5. **`tests/gates` 环境性失败**：不在本轮门禁口径，未纳入 PASS/FAIL 判定。

## 9. 合并记录与回滚点链

```text
1fff4711  docs(cover6): final report addendum     ← cover6 终点（5784 / 183 / 1713 / cases:check 1717-0）
   │
3aa2370d  merge: cover7-brace-string              ← 本轮 HEAD（父 1fff4711 + 89ca10d7）
          └ 89ca10d7 cover7(brace-string): 字符串 \u{…} 位数上限统一
                       （位数不限 + 逐位累计 ≤ U+10FFFF，+13 用例 +1 夹具）
```

- 整体回滚：`git reset --hard 1fff4711`（撤本轮唯一 merge）。
- 单项回滚：`git revert -m 1 3aa2370d`（只撤 cover7-1，保留 4 条 cover6 core 改动与夹具头修复）。
- 文档提交：位于 `3aa2370d` 之后的独立 `docs(cover7): final report` commit
  （本文件 + `docs/cover6-FINAL.md` 的 §8.1 关闭标注与 §10 附录）；`git revert <该提交>` 只撤文档。

## 10. 复跑方法（任意克隆，勿在主仓写产物）

```powershell
git rev-parse HEAD; git log --merges --oneline 1fff4711..HEAD
git diff 1fff4711..HEAD --stat; git diff 1fff4711..HEAD -- core
git diff 1fff4711..HEAD -- typescript/IMPORTANCE.md

xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node typescript/cases/ast-json.mjs && node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet && node typescript/cases/real-dts-ast.mjs
node tests/parse/validate.mjs
```
