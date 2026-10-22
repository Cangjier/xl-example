# cover9 轮次（W2）：possible compute「`type` 声明头同行判据」Z01–Z16（16 条真红）

分支 `cover9-posscompute-type`，基点 `b465cf6e`（infra 建；**不含** cover9-endcompute / missingpossible 的修复——那些在别的分支，probe 的 20 red 里混有它们，属正常基线，不是回归）。
写 scope（经 Lead 批准扩到 5 个 `.xl.md`）：`type-alias-declaration-shape.xl.md`、`type-alias-declaration-possible-shape.xl.md`、
`expression-statement-possible-shape.xl.md`、`statement-builder.xl.md`、`module-block-shape.xl.md`；
`typescript/cases/possible-compute.ts` + 两份快照、`.gitattributes`、本文件。
`core/**` 与 `typescript/IMPORTANCE.md` 零改动。不 push / 不 merge。

## 0. 一句话结论

Z01–Z16 **16/16 red→green**；新增 **16 条**用例（`possible-compute` 164 → **180**）；全量门禁无回退：
**ast-json 6006/6006（5990+16）、ast-json-diff 0/0/0、token-ast 1715、validate 1719/0、
real-dts 226/226、tsc 0、xl_check 0 error**。

## 1. 读数（基线 b465cf6e → 本轮结束）

| 项 | 基线 | 本轮结束 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5990 / 5990 cj-ok（47 构造） | **6006 / 6006 cj-ok** |
| `node typescript/cases/ast-json-diff.mjs` | 5990/5990；结构 0 / 位置 0 / 字段 0 | **6006/6006；0 / 0 / 0** |
| `node typescript/cases/token-ast.mjs --quiet` | 1715（ok 1705 / ts-invalid 10 / crash 0 / diff 0） | **同左 1715** |
| `node tests/parse/validate.mjs` | 1719 / 0 | **1719 / 0**（本轮未新增 token 夹具） |
| `node typescript/cases/real-dts-ast.mjs` | 226 / 226 | **226 / 226** |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | 0 | **0** |
| `xl_check`（core+typescript，ts） | 0 error | **0 error**（864 文件；2461 条既有 W3102/W3103） |
| `node tests/cover9/probe.mjs --quiet` | red 20 / green 68 / 24 条 stored 偏差 | **red 20 / green 68 / 24 条 stored 偏差（不变）** |
| Z01–Z16（survey 口径探针） | **red 16 / green 0** | **red 0 / green 16** |
| `core` + `IMPORTANCE.md` diff | — | **空** |

注：`tests/cover9/probe.mjs` 的 A/B/C 候选库里 12 条 endcompute + 7 条 missingpossible + 1 条 other 已
在别的分支修好但不在本克隆基线里，所以 probe 仍有 20 red / 24 条 stored 偏差并 exit 1——**这是预期基线**，
与本轮无关（本轮没有改动任何 A/B/C 候选的行为，实测 red/green 计数与基线逐项相同）。

## 2. 复现（修前）

TS 真值（TS 6.0.3 `parseDiagnostics` 全 0）：

```text
type ⏎ T = 1   → ExpressionStatement[0,4); ExpressionStatement[4,10)     （type 是标识符；T = 1 是赋值）
type ⏎ T       → ExpressionStatement[0,4); ExpressionStatement[4,6)
type ⏎ T;      → ExpressionStatement[0,4); ExpressionStatement[4,7)
{ type ⏎ T = 1 } / namespace N { … } / function f(){ … } / declare module "m" { … } 同形（体内两条语句）
```

修前本仓（16/16 红，逐条状态见 §5 表）：`type ⏎ T = 1` 等并成一条 `TypeAliasDeclaration`；
`type ⏎ T` / `type ⏎ T;` crash「表达式语句没有读完」。

## 3. 根因（实测，不只是阅读）

TS 在**语句起点**看 `type` 关键字时用
`nextTokenIsIdentifierOnSameLine()`（`isStartOfDeclaration` 的 lookahead：`TypeKeyword` / `InterfaceKeyword` 一支，
`node_modules/typescript/lib/typescript.js` 约 2010124 处）——**名字必须与 `type` 同行**，否则 `type` 是标识符。
本仓缺这条判据，且在 **4 个层次**都缺，所以只修 `IsTypeAliasHead` 不够（实测过程）：

1. **形状层 `TypeAliasDeclarationShape.IsTypeAliasHead`**：给 `expression-statement-possible-shape.IsAsiBoundary`
   的条件 5 与 `source-file-end-possible-shape.BuildTrailingDeclaration` 用；它只看「`type` 后 1 格 Common、
   第 2 格 `=`/`<`」，于是 `type ⏎ T = 1` 被当成别名。
2. **候选层 `TypeAliasDeclarationPossibleShape` 的 Stage 1**：`type` 之后见到 Common 名字就进 Stage 2，
   不看换行。实测：只修 (1) 后，`type ⏎ T = 1` 在换行处终结候选 Accept，而本候选仍活着 →
   `CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 2）`。
3. **表达式层 `ExpressionStatementPossibleShape.CanEndExpressionAt`**：`type` 在
   `CanEndExpression` 里被当「语句词」收不住表达式，所以换行处终结候选不会 Accept——要按上下文放行
   「非声明头的 `type` 是标识符」。
4. **建树层**：块 / 函数体走 `statement-builder.BuildStatement` 的 `type` 分派（`:387-395`，只问
   `Peek(1)` 是不是 Common、`Peek(2)` 是不是 `=`/`<`）；namespace / ambient module 体走
   `module-block-shape.BuildMember` 自己的 `type` 成员分支（`:413`，直接 `TypeAliasDeclarationShape.FromUnits`）。
   这两处不看换行，也不经过 (1)/(2)。

修前 `type ⏎ T = 1` 的崩溃/错树链路（trace，见 `tmp/trace.mjs` 记录）：
换行处 EndPossible 不 Accept（(1) 判成别名头 → IsAsiBoundary 条件 5 否决；`type` 收不住表达式）→
候选一路拖到 `;`/EOF → 由 TypeAlias 候选或 EOF 兜底 `BuildTrailingDeclaration` 用 (1) 建出别名。

## 4. 修法（5 个文件，file:line）

| # | 文件 | 改动 |
|---|---|---|
| 1 | `typescript/tokens/declarations/type-alias-declaration-shape.xl.md` | `IsTypeAliasHead` 加**名字必须与 type 同行**判据：`LineTerminator.HasBetween(code[typeIndex].SourceRange.End, code[typeIndex+1].SourceRange.Start)`（`:117-121`）；导入 `LineTerminator`（`:17`）；文档 `:89-95` |
| 2 | `typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md` | Stage 1 在把下一格当名字之前，回退到 `type` 那一格用 `HasLineBreakBetween(units, typeAt, at)` 判同行，换行即 `Rejected`（`:201-212`） |
| 3 | `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | `CanEndExpressionAt` 增第三格上下文规则：`keywordText === "type"` 时把「从 `type` 起的代码单元」交给 `IsTypeAliasHead`，不是别名头就返回 true（`type` 是标识符，可收住表达式）（`:255-275`，文档 `:238-243`） |
| 4 | `typescript/tokens/statements/statement-builder.xl.md` | 块 / 函数体的 `type` 分派加 `StatementScanner.NoLineBreakBetween(unit, afterType)`（`:387-402`，与同文件 `declare` 分派 `:294` 同款） |
| 5 | `typescript/tokens/declarations/module-block-shape.xl.md` | 模块体成员层：新增 `typeAliasMember` 判据（`:199-215`，`type` 与名字同行才进别名分支；`declare type` 形也看 `type` 与名字同行），`:413` 的分支条件改为 `else if (typeAliasMember)`（`:428-432`）；不同行的 `type` 落回 `inner.BuildStatement()` |

**为什么 `LineTerminator.HasBetween` / `NoLineBreakBetween` / `HasLineBreakBetween` 就够**：这几个助手都按
**源位置**扫原始文本（`left.End.Index + 1 … right.Start.Index - 1`），所以 LF / CR / U+2028 / U+2029、
行注释后面的换行、块注释**内部**的换行全部算（与 TS 的 `hasPrecedingLineBreak` 口径一致）；
`code` / `Units` 数组里就算已经被滤掉 trivia 单元也不影响。

未改 `core/**`、`IMPORTANCE.md`、`type-builder`、enum/interface shape（W3 的区域）。

## 5. 四个问题的回答

1. **正确的应该什么时候 build**
   - 名字与 `type` **同行**、且名字后紧跟 `=` / `<` 时，`type` 才是声明头：根级由
     `TypeAliasDeclarationPossibleShape` 在 `;` / 行末 ASI / EOF 收口建树；块/体级由
     `BuildTypeAliasDeclaration` 建。
   - 否则 `type` 只是标识符：**根级**在换行处由根终结候选 Accept（此时 TypeAlias 候选已在 Stage 1 因同行判据
     Reject、表达式语句候选也因 ASI 让位，`Candidates == 0`），把 `type` 建为 `ExpressionStatement`，
     `T = 1` 由后续候选 / EOF 兜底建；**块/体级** `type` 分派让位给 `BuildExpressionStatement`，
     由 `IsAsiBoundary` 在 `type` 之后切句。
2. **build 时应该提取哪些信息**
   - 别名侧不变：名字 / 类型参数 / 类型；`type` 与名字之间的 trivia 只影响名字 `Pos`。
   - `type` 作标识符时：`ExpressionStatement` 的表达式是 `Identifier`，区间 `[type 起点, type 终点)`，
     `Pos` 按表达式语句口径（前一个非 trivia 单元 `End.Index + 1`）。
3. **什么时候 close**
   - `type` 单句：换行后第一个代码单元处（ASI 边界，`IsAsiBoundary`）；`T = 1` 在 `;` / EOF 收口。
   - 真别名：`;` / 行末 ASI / EOF（交给根终结候选或模块成员的无分号路径）。
4. **close 时应该提取哪些信息**
   - 本判据不改区间提取：End = 最后一个非 trivia 代码单元（`;` 计入语句 End）；换行判断一律按**源位置**，
     所以 CR / LS / PS / 注释换行天然覆盖。

## 6. 逐条红→绿证据（Z01–Z16）

修前 = 基点原样重建（`xl_build` + `tsc` 到 b465cf6e 内容）；修后 = 本分支；口径与 survey-probe / 官方 probe 一致
（TS 6.0.3 `parseDiagnostics` + `ast-compare` 三栏）。16 条修前全红、修后全 green：

| id | input（转义写法） | 修前 | 修后 |
|---|---|---|---|
| Z01 | `type\nT = 1`（base LF） | red-diff：结构 ExpressionStatement -2 / Identifier -1 / BinaryExpression -1 / EqualsToken -1 / TypeAliasDeclaration +1 / LiteralType +1 | green |
| Z02 | `type\rT = 1`（CR） | 同 Z01 | green |
| Z03 | `type\u2028T = 1`（LS） | 同 Z01 | green |
| Z04 | `type\u2029T = 1`（PS） | 同 Z01 | green |
| Z05 | `type /* \n */ T = 1`（块注释含换行） | 同 Z01 | green |
| Z06 | `type // c\nT = 1`（行注释后换行） | 同 Z01 | green |
| Z07 | `type\nT`（无 `=`） | red-crash：表达式语句没有读完 | green |
| Z08 | `type\nT;` | red-crash：表达式语句没有读完 | green |
| Z09 | `type\nT = { a: 1 }`（对象类型） | red-diff：结构 … ObjectLiteralExpression -1 / PropertyAssignment -1 / TypeLiteral +1 / PropertySignature +1 … | green |
| Z10 | `type\nT<U> = U`（泛型） | red-diff：结构 … ExpressionWithTypeArguments -1 / TypeParameter +1；位置 TypeReference ts[7,8] cj[11,13] | green |
| Z11 | `type\nT = 1;\nconst x = 2;`（后接语句） | red-diff：同 Z01 | green |
| Z12 | `{ type\nT = 1 }`（块体） | red-diff：同 Z01 | green |
| Z13 | `namespace N { type\nT = 1 }`（namespace 体） | red-diff：结构 Identifier -1 / ExpressionStatement -2 … TypeAliasDeclaration +1 / LiteralType +1 | green |
| Z14 | `type\nT = 1\ntype\nU = 2`（两条连排） | red-diff：结构 ExpressionStatement -4 / Identifier -2 / BinaryExpression -2 / EqualsToken -2 / TypeAliasDeclaration +2 / LiteralType +2 | green |
| Z15 | `function f(){ type\nT = 1 }`（函数体） | red-diff：结构 Identifier -1 / ExpressionStatement -2 … TypeAliasDeclaration +1 | green |
| Z16 | `declare module "m" { type\nT = 1 }`（ambient module 体） | red-diff：同 Z01 | green |

修后 TS 真值（逐条与实现一致）：

```text
Z01–Z06/Z11/Z14：两条（或四、六条）ExpressionStatement；Z07/Z08：ExpressionStatement(type) + ExpressionStatement(T/T;)
Z09/Z10：ExpressionStatement(type) + ExpressionStatement(T = …)；Z12/Z15：Block/FunctionDeclaration 内两条 ExpressionStatement
Z13/Z16：ModuleDeclaration 体内两条 ExpressionStatement
```

## 7. 新增用例（16 条）

追加在 `typescript/cases/possible-compute.ts:264-296`（「cover9（W2）」段；164 → **180**，只 append、未改历史行）：

- base 1 条：`type\nT = 1`；
- 行终止符 3 条：CR / U+2028 / U+2029（**行内字面字符**）；
- trivia 2 条：`type /* \n */ T = 1`（块注释内换行）/ `type // c\nT = 1`（行尾注释）；
- crash 形态 2 条：`type\nT` / `type\nT;`；
- 类型形态 2 条：对象类型 / 泛型参数；
- 重复形 2 条：后接第三条语句 / 两条连排；
- 宿主变体 4 条：块体 / namespace 体 / 函数体 / ambient module 体。

`node typescript/cases/ast-json.mjs possible-compute` → `cases=180 cj-ok=180 cj-fail=0`；
`ast-json-diff.mjs possible-compute` → 180/180、结构 0 / 位置 0 / 字段 0。
同 stem 内无重复行；`\n` 用转义、CR/LS/PS 用行内字面字符（`ast-json.mjs` 的 `decodeCaseText`
只展开 `\n`/`\v`/`\f`，注释里的 `\n` 也会展开，所以 Z05/Z06 用转义写法即可）。

## 8. 构建与门禁（命令）

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-posscompute-type
# 1) 改 5 个 .xl.md 后重建（xl 自动带依赖；首次/回滚验证可用 force）
#    xl_build(cwd=<clone>, paths=[5 个改过的 .xl.md], targets=["ts"], out="dist")
.\node_modules\.bin\tsc.cmd -p tsconfig.json
# 2) Z 组探针（本克隆 tmp 内，survey-probe 同口径；官方 probe 不含 Z 组）
#    node tmp/zprobe.mjs tmp/z01-z16.json --full
# 3) 全量门禁
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node tests/parse/validate.mjs
node typescript/cases/real-dts-ast.mjs
# 4) 静态检查
#    xl_check(cwd=<clone>, paths=["core","typescript"], targets=["ts"])
```

`xl_build` 摘要：5 written / 0 error（只有改过文件原有的 W3102 / W3103 文档类 warning）。
`xl_check`：**864 files / 0 error / 2461 warning**（与基线同数，全是既有 W3102 / W3103）。

## 9. basic-token 是否牵涉（只登记）

**不牵涉**。`type` / `T` / 行终止符 / 注释都是既有 basic token；本轮只改 ts 层的「是否同行」判据
（`LineTerminator` 是 cover8 已建立的共享助手），没有改 `core/syntax/basic-tokens/**`、没有改字符归类。
若将来把「`type` 后是否换行」做成 basic-token 级信息，那属于 basic-token 改动，需用户批准，本轮不需要。

## 10. `.gitattributes` 改动

`typescript/cases/possible-compute.ts` 含 1 个行内 lone CR（Z02 用例），为保证 commit / checkout 后字节不变，
在 `.gitattributes:13-15` 追加：

```text
# cover9 W2: possible-compute.ts carries an inline lone CR (Z02) as a line terminator
# inside one physical case line; pin -text so the CR bytes survive commit/checkout.
typescript/cases/possible-compute.ts -text
```

写入前该文件 CR=0 / LS=0 / PS=0；写入后 CR=1 / LS=1 / PS=1（LS/PS 是普通 UTF-8 字符，只有 CR 需要钉字节）。
文件仍是无 BOM 的 UTF-8、LF 换行。

## 11. 遗留风险 / 给 merger 的冲突点

1. **合并冲突点（3 处 + 快照）**
   - `module-block-shape.xl.md`：W2 改 `:199-215`（`typeAliasMember` 计算）与 `:413/:428` 分支条件；
     W4（`5f2df43a`）改 `:556` 附近的 namespace/module 体 class 成员 `HasNoName` 判据——**两处不重叠**，
     three-way 预期自动合并；若冲突，按「双方语义都保留」（class 成员恢复 vs type 成员同行判据互不影响）。
   - `statement-builder.xl.md`：W2 改 `:387-402`（`type` 分派）；W4 改 `:562` 附近 `BuildClassDeclaration`；
     另有 endbuild / missingpossible 的历史区域。预期不重叠。
   - `typescript/cases/possible-compute.ts`：W2 在 EOF 追加自己的段（`:264-296`），W3 也往同文件 append
     不同段 → 两边都在文件尾，纯 append 冲突；**取法：两段都保留（先后不限）**，然后
     `node typescript/cases/ast-json.mjs possible-compute` 重生成快照，**禁止手工合并 JSON**。
   - `.gitattributes`：W3 若也加 `possible-compute.ts -text`，重复行无害，留一条即可。
2. **`declare type ⏎ T` / `export type ⏎ T` 是 ts-invalid**（TS diag=1）：本判据对它们同样返回「非别名头」，
   但这类输入不进尺子（不进 case）；行为上可能与本轮前不同（crash 位置可能变化），不影响门禁。
3. **`type` 同行但名字后不紧跟 `=`/`<`**（如 `type T;` / `type T`）：修前/修后都由 `IsTypeAliasHead` 的前缀判据
   判「不是别名」，行为不变（已有覆盖）。
4. **判据前提**：`IsTypeAliasHead` 新增的同行判据假设 `code` 里相邻两个单元之间只有 trivia（同一次切段、
   同一文件源区间）；若将来有「合成 token / 重放副本」落进 `type` 与名字之间，`HasBetween` 可能读到别的区间——
   `FromUnits` 已有重放副本去重，当前无此形。
5. **未做**：Z17–Z24（enum/interface `declare` 同行、`readonly`/`new` 成员修饰词）属 W3/W4 与本轮范围外；
   `tests/cover9/candidates.json` 未更新（本批 Z 组不在官方 candidates.json 里，探针用 survey 候选库复跑）；
   未 push / 未 merge 主仓；`tmp/` 未提交。
