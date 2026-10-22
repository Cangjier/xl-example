# cover9 possible-build（B1 / B3 / C 三族，8 条真红）报告

- 克隆：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-possiblebuild`
- 分支：`cover9-possiblebuild`，起点 `4d2dafe3`（`merge: cover9-prep`），不 push / 不 merge 主仓
- 范围：只改 `typescript/tokens/**` 两个 `.xl.md` + `typescript/cases/possible-build.ts` 及其两份快照 + `.gitattributes` + 本文件。
  **`core/**` 与 `typescript/IMPORTANCE.md` 零改动。**
- oracle：TypeScript 6.0.3 `ts.createSourceFile`，硬性口径 `parseDiagnostics.length === 0` 且（本仓 crash 或
  AST 三栏任一不一致）才算真红；本批 8 条全部为候选库 `tests/cover9/candidates.json` 的 red 行。
- 目标 stem：`possible-build`（基线 155 条用例，本批 **+25**）。

## 0. 读数一览（修复后）

| 门禁 | 读数 |
|---|---|
| `node tests/cover9/probe.mjs` | 88 条：**red 36 / green 52 / ts-invalid 0**（起点 red 44 / green 44；本批 8 条转绿） |
| 本批 8 条 | `B01,B02,B03,B04,B15,B16,C02,C03` 全部 `green`（probe 因 candidates.json 存储值过期 exit 1，**预期**） |
| `node typescript/cases/ast-json.mjs` | **5954 / cj-ok 5954 / cj-fail 0**（5929 + 25；47 构造） |
| `node typescript/cases/ast-json-diff.mjs` | **5954/5954；结构 0 / 位置 0 / 字段 0** |
| 单 stem `possible-build` | cases=180 cj-ok=180 cj-fail=0；180/180 完全一致（155 + 25） |
| `node typescript/cases/token-ast.mjs --quiet` | **total 1715 / ok 1705 / crash 0 / diff 0 / ts-invalid 10**（与基线一致，未回归） |
| `node tests/parse/validate.mjs` | **1719 条用例 / 0 条不合格**（该门禁分母是 `tests/cases/**`，不含 `typescript/cases/*.ts`，故 M=0） |
| `node typescript/cases/real-dts-ast.mjs` | **226 文件 / 226 成功 / 崩溃 0 / AST 完全一致 226** |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | exit 0 |
| `xl_check(typescript, targets=["ts"])` | **811 文件 / 0 error**（warnings 全是既有 W3102/W3103；新增成员都带描述，未新增 warning） |
| `git diff 4d2dafe3..HEAD -- core typescript/IMPORTANCE.md` | 空 |

## 1. 复现（修前）

`node tests/cover9/probe.mjs`（修前，克隆内实测）：

```text
candidates: 88  red=44  green=44  ts-invalid=0
B: red ids: B01, B02, B03, B04, B06, B07, B08, B09, B10, B11, B12, B13, B14, B15, B16
C: red ids: C01, C02, C03, C04, C05, C06, C07, C08
```

本批 8 条（修前实测原文）：

| id | input（`\n`=LF、`\r`=CR、`\u2028`=LS、`\u2029`=PS） | 修前现状 |
|---|---|---|
| B01 | `const x = a as T\r<b>c;` | red-crash「表达式没有读完」 |
| B02 | `const x = a as T\u2028<b>c;` | red-crash「表达式没有读完」 |
| B03 | `const x = a as T\u2029<b>c;` | red-crash「表达式没有读完」 |
| B04 | `const x = a as T\u2028<B>c;` | red-crash「表达式没有读完」 |
| B15 | `const x = a as typeof f\n<T>(1);` | red-crash「表达式没有读完」 |
| B16 | `const x = a as typeof f\r<T>(1);` | red-crash「表达式没有读完」 |
| C02 | `yield\n(1);` | red-crash「表达式语句没有读完」 |
| C03 | `await\n(1);` | red-diff：CallExpression −1 / Identifier −1 / AwaitExpression +1 / ParenthesizedExpression +1 |

修后（`tmp/cover9-green-after.txt` 同口径）：8 条全部 `diag=0 green`，其余 36 条 red 与其它组一致未变
（A 21 条、B06–B14 9 条、C01/C04–C08 6 条）。

## 2. 根因与修复（file:line）

### 2.1 B1 族（B01–B04）：`as` 类型位的行终止符口径只认 LF

- 根因：`typescript/tokens/types/type-builder.xl.md:492` 的 `HasLineBreakBeforeCurrent`（旧 `:515` 附近）
  逐字符判 `document.At(at).Value === "\n"`——CR / U+2028 / U+2029 都不算换行。
  `ParseTypeReference`（`:1828` 的类型实参同行守卫）因此认为 `<b>` 与 `T` 同一行，把它吞成类型实参；
  类型读完后表达式层还剩 `<b>c` 没人认领 →「表达式没有读完」。
- 修复：`type-builder.xl.md:12` 引入 `typescript/run/line-terminator.xl.md` 的共享 `LineTerminator`；
  `HasLineBreakBeforeCurrent` 改为 `return LineTerminator.HasBetween(previousEnd, current.SourceRange.Start);`
  （`:511`）。与 cover8 A 组 `expression-statement-possible-shape` / `statement-builder` 同源口径。
- 结果：`a as T` 在 `T` 处收口，下一行 `<b>c` 回二元层，整条语句是 TS 的比较链
  `(a as T) < b > c`（`FirstStatement[0,22)`），三栏一致。

### 2.2 B3 族（B15–B16）：`as typeof …` 之后 `<` 没回二元层

- 根因：`typescript/tokens/types/type-builder.xl.md` 的 `ParseTypeQuery`（`:1996-2005`）**无条件**
  `ParseTypeArguments()`。`typeof f` 后面换行的 `<T>` 被吃成 TypeQuery 的类型实参，于是
  `ParseFollowingType`（`expression-builder.xl.md:466` 附近）交回的 At 停在 `>` 之后，`(1)` 无人认领
  →「表达式没有读完」。LF 也红，所以不是行终止符特有。
- 修复：与 `ParseTypeReference`（`:1828`）同一条判据——**类型实参必须与实体名同一行**
  （TS 的 `parseTypeArgumentsOfTypeReference` 要求 `!scanner.hasPrecedingLineBreak()`）：
  `if (!this.HasLineBreakBeforeCurrent()) { typeArguments = this.ParseTypeArguments(); }`（`:1997`）。
- 结果：TypeQuery 只收实体名，`< / >` 落回 `ParseBinary` 的关系运算符，整条语句是
  `(a as typeof f) < T > (1)`（`FirstStatement[0,31)`），三栏一致。

### 2.3 C 族（C02 / C03）：`yield` / `await` 无上下文判据

- 根因：`typescript/tokens/expressions/expression-builder.xl.md:561` 的 `ParseUnary` 把 `yield` 直接交
  `ParseYield`、把 `await` 无条件当 AwaitExpression（旧 `:579-594`）。TS 的 `isYieldExpression` /
  `isAwaitExpression` 是「**在上下文里**才是关键字表达式；否则只有
  `nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine` 成立才是，否则是普通 Identifier」：
  脚本顶层 `yield\n(1)` = 调用 `yield(1)`，`await\n(1)` = 调用 `await(1)`。
- 修复（`expression-builder.xl.md`）：
  - `:693` `EnclosingFunctionFlags(start)`：沿原文往回找包住 `yield` / `await` 的**函数边界**，
    返回 `1`=generator / `2`=async / `3`=async generator / `0`=无（普通函数 / 顶层）。
    函数边界**重置**上下文（非 async 函数体 / 非 generator 体里不是上下文），块语句 / 对象字面量 /
    类体不重置（继续往外找）；箭头表达式体（`=>`，无花括号）也认。
    辅助：`:775` `ArrowBodyFlags`、`:809` `FunctionBodyFlags`、`:873` `IsControlKeyword`、
    `:882` `MatchParenBackward`、`:904` `ReadWord`。
  - `:630` `ParseYield`：先按 `generatorContext || (同行的标识符/关键字/字面量 lookahead)` 决定
    建不建 `YieldExpression`；不建就回落成 Identifier（`:645` 起）。
  - `:936` `IsAwaitExpressionStart`：async 上下文（flags 2/3）或同行 lookahead 才是 AwaitExpression；
    `:575/:590` 的 `ParseUnary` 在它不是关键字表达式时回落成 Identifier。
  - `:980` `ParsePostfix` / `:988` `ParsePostfixSuffix`：把后缀链（`.` / `?.` / `!` / 泛型调用 / 调用 /
    下标 / 模板 / 自增 / 单标识符箭头）抽成独立方法；回落成 Identifier 后继续走后缀链，于是
    `yield\n(1)` / `await\n(1)` 得到 `CallExpression(Identifier, NumericLiteral)`，与 TS 同形。
- 结果：C02/C03 三栏一致；同时修正了同族的非红线形（`yield (1);`、`await (1);`、`yield\n[1];`、
  `yield* 2;`、普通函数体里的 `await (1);` 等，均已入用例并验证修前红、修后绿）。

## 3. 四问（IMPORTANCE §3.3 候选 / 终结候选模型）

### 3.1 B1（`as T` 类型位行终止符）

1. **何时 build**：候选判定（语句候选 + 表达式候选）在本批**没有改**——`a as T` 的类型在 `T` 处即完整，
   表达式候选的 Accept 与终结候选的收口沿用现口径；本批改的是 build 期读类型实参时的「同一行」判据。
2. **build 提什么**：`ParseTypeReference` 的 build 只提类型名（`T`）与**同一行**的类型实参；
   `HasLineBreakBeforeCurrent` 是「这里还能不能长类型实参」的判据（行终止符 = LF / CR / LS / PS / CRLF
   整体一次），不再只认 `\n`。`<` 与 `>` 不投影。
3. **何时 close**：类型（`TypeReference`）在 `T` 末 close；`AsExpression` 在其类型末 close；语句在
   `c` 末 close（TS 的 `FirstStatement[0,22)`），下一条语句/表达式从下一行起算。
4. **close 提什么**：close 只提区间端点——`AsExpression` 区间到 `T` 末（不含下一行 `<`），
   语句区间到比较链右端 `c` 末；行终止符本身是 trivia，不进任何节点区间。

### 3.2 B3（`as typeof f` 后的 `<`）

1. **何时 build**：不变——`as` 与 `satisfies` 在 `ParseBinary` 里按关系运算符优先级处理，
   右操作数交 `ParseFollowingType`；`TypeQuery` 只在实体名读完后判「还能不能长类型实参」。
2. **build 提什么**：`TypeQuery` 只提实体名（Identifier / QualifiedName），**同一行**的
   TypeArguments 才作为 children 追加；换行后的 `<` 交还表达式层作为比较运算符。
3. **何时 close**：`TypeQuery` 在实体名末 close（本例 `[14,23)`）；`AsExpression` 在其末 close；
   外层 `BinaryExpression` 在 `(1)` 末 close（TS `FirstStatement[0,31)`）。
4. **close 提什么**：close 提各层的区间端点：`TypeQuery` 不含 `<T>`；比较链的 `FirstBinaryOperator`
   （`<`）与 `GreaterThanToken`（`>`）按运算符单元投影，`(1)` 是 `ParenthesizedExpression`。

### 3.3 C（`yield` / `await` 上下文）

1. **何时 build**：`yield` / `await` 词的候选在 `ParseUnary` 入口判定——先问「是否在 generator/async
   上下文」与「下一 token 是否标识符/关键字/字面量且同一行」（TS `isYieldExpression` /
   `isAwaitExpression` 的 lookahead）；两条都不成立就不 build 关键字表达式，改 build `Identifier`。
2. **build 提什么**：上下文/lookahead 成立时：`YieldExpression` 提可选 `*`（AsteriskToken）与可选操作数
   （受限产生式：关键字后出现行终止符即无操作数）；`AwaitExpression` 提操作数（一元前缀）；
   `yield` / `await` token 本身不投影。不成立时：只提一个 `Identifier`（文本就是词本身），
   后缀由 `ParsePostfixSuffix` 继续 build（调用 / 下标 / 成员 / 模板 / 箭头）。
3. **何时 close**：上下文/lookahead 成立：关键字表达式在其操作数末 close（无操作数时在关键字末）；
   不成立：Identifier 在词末 close，随后由后缀链决定更外层的 close 点（`yield⏎(1)` 在 `)` 末 close）。
4. **close 提什么**：`YieldExpression` / `AwaitExpression` 区间覆盖关键字到操作数末；`CallExpression`
   区间覆盖被调用者（Identifier）到实参 `)`，`(` / `)` 不投影；裸 `yield;` / `await;` 的 `Identifier`
   区间只覆盖词本身。

## 4. 新增用例（`typescript/cases/possible-build.ts` 末尾 cover9 段，**25 条**）

- 段落位置：`:284` 起（B1 族 `:288-301`，B3 族 `:306-315`，C 族 `:322-337`）。
- 一行一例；base 先行 + 变体；`\n` 用转义，**CR / U+2028 / U+2029 用行内字面字符**（不写 `\r` /
  `\u2028` / `\u2029` 转义）。CRLF 形写成「真 CR + `\n` 转义」（`:314`）。
- 逐族条数：B1 **7**（CR / LS / PS / LS+大写 + 实参位 / 限定名 / return 位）、B3 **6**
  （LF / CR + 限定实体名 / 注释后换行 / CRLF / 实参位）、C **12**（`yield` 5 + `await` 5 + CR 行终止符
  变体 2；含 `yield* 2;` 与普通函数体上下文）。
- 质量证据：把两个 `.xl.md` 用 `git stash` 还原到基线、重建后跑同一批 25 行——
  **25/25 red（crash 或结构差）**；恢复修复、重建后 **25/25 green**。原始读数见
  `tmp/cover9-red-before.txt` / `tmp/cover9-green-after.txt`（tmp 不提交）。
  逐条红前形：B1 除实参位（结构差 BinaryExpression）外全 crash「表达式没有读完」；B3 全 crash；
  C02 族 crash「表达式语句没有读完」/ 结构差，C03 族结构差（CallExpression / ElementAccessExpression /
  Identifier 方向）。
- 同 stem 去重：与本 stem 现有 155 条无精确重复；`const x = a as T\n<b>c;`（LF 对照）已在
  `possible-compute` 的 cover8-D 段，本 stem 只收 CR / LS / PS 形（跨 stem 重复仅登记，不再抄一遍）。

### 4.1 `.gitattributes` 改动（必须）

lone CR（U+000D）在 `typescript/cases/possible-build.ts` 的 cover9 段里是**行内字面字符**
（`:294` / `:300` / `:301` / `:310` / `:314`（CRLF 的 CR）/ `:336` / `:337`），而文件名不含 `-cr`；
`* text=auto eol=lf` 会在提交/检出时做文本归一化。按 `tests/cases/README.md` 的做法在
`.gitattributes:15` 追加：

```text
typescript/cases/possible-build.ts -text
```

提交后用 `node -e` 逐字节核过：文件 17734 字节、CR 7 个、LS 3 个、PS 1 个、无 BOM；ast-json 的
`decodeCaseText` 不会碰这些行内字面字符（只展开普通代码里的 `\n` 转义），25 条用例在
`ast-json.mjs possible-build` 下全部 ok。

## 5. basic-token 是否牵涉

**不牵涉、未改 `core/**`**（basic token 只能由用户发起修改）。登记两条事实：

1. U+2028 / U+2029 早在 cover6 已由 ts 模板配置收进 trivia（`TypeScriptSymbolTemplate.IsWhiteSpace`），
   本批只改**运行层的「这里是不是换行」判据**（`LineTerminator` / `TypeBuilder.HasLineBreakBeforeCurrent`），
   不触碰 basic token 的字符承接。
2. 新增用例里的 CR / LS / PS 是**输入字节**，不是 basic token 规则变化；token-ast 门禁 1715 与基线一致
   （crash 0 / diff 0），说明词法层产物未变。

## 6. 遗留 / 风险（登记，不属本批 8 条）

1. **块体 / 顶层表达式语句的 ASI 仍与 TS 有差**（statement 层，不是本批 8 条）：
   - `function f() { yield\n(1); }` 本仓切成两条语句（TS 是一条 `yield(1)` 调用）；
   - `await\nx;` 顶层本仓现在报「表达式语句没有读完」（修前是 red-diff；两种都红，不在候选库）。
   本批只改了 `yield` / `await` **表达式层**的关键字判定，没有动 `expression-statement-possible-shape`
   的 ASI 边界，留给下一轮。
2. **模块顶层 `await`（bracket 操作数）**：`import "m"; await (1);` 在模块里 TS 是 AwaitExpression；
   本仓的 `EnclosingFunctionFlags` 不做「文件是不是模块」判定，顶层按脚本口径当 Identifier + 调用。
   候选库与现有用例语料未覆盖该形（token 夹具里的 `await (h())` 都在 async 函数体内，实测未回归）。
3. **上下文扫描是原文启发式**：`EnclosingFunctionFlags` 沿字符往回找函数边界（与 cover8 的
   `IsInsideGeneratorBody` 同风格），字符串 / 注释里出现括号字符时理论上可能误判；本批全量门禁
   5954 + token-ast 1715 + real-dts 226 未见回归，若下一轮要收极端形需把扫描换成 token 边界。
4. probe 在修后 exit 1 是**预期**：`candidates.json` 的存储值仍是修前 red，probe 会报 8 条
   「存储值 vs 实测不一致」——这不是回归，是基线已前进的提示（probe 不改候选库）。
5. 本批未改其它 stem 的 case / 快照；快照由 `ast-json.mjs possible-build` 重新生成，无手工合并。

## 7. 改动文件清单

| 文件 | 改动 |
|---|---|
| `typescript/tokens/types/type-builder.xl.md` | `:12` 引入 `LineTerminator`；`:492` `HasLineBreakBeforeCurrent` 改用 `LineTerminator.HasBetween`（`:511`）；`:1996` `ParseTypeQuery` 的类型实参加「同一行」守卫（`:1997`） |
| `typescript/tokens/expressions/expression-builder.xl.md` | 新增 `EnclosingFunctionFlags`（`:693`）/ `ArrowBodyFlags`（`:775`）/ `FunctionBodyFlags`（`:809`）/ `IsControlKeyword`（`:873`）/ `MatchParenBackward`（`:882`）/ `ReadWord`（`:904`）/ `IsIdentifierKeywordOrLiteral`（`:921`）/ `IsAwaitExpressionStart`（`:936`）/ `ParsePostfixSuffix`（`:988`）；`ParseUnary` 的 yield/await 分派（`:575` / `:590`）；`ParseYield` 关键字判据（`:630`） |
| `typescript/cases/possible-build.ts` | 末尾 cover9 段 **+25** 条（`:284` 起） |
| `typescript/cases/possible-build.{cj,ts}-ast.json` | 由 `node typescript/cases/ast-json.mjs possible-build` 重新生成（180 条，两栏对应） |
| `.gitattributes` | `:15` `typescript/cases/possible-build.ts -text`（钉住 lone CR 字节） |
| `docs/cover9-possiblebuild.md` | 本文件 |

**cache 复用（IMPORTANCE §3.4/§7）**：本批改动都在 build 期读**已经装载的单元数组**与原文扫描，
没有新增 `ItemUtil.ItemStart` 全量重扫、没有新增 `PossibleShapeCache` 槽位、没有改
`ComputeByIndex` / 候选判定；`TypeBuilder` 的 `HasLineBreakBeforeCurrent` 只查上一次判定点附近的原文，
`EnclosingFunctionFlags` 也只在该词的位置做一次有界回溯，不进入 compute 循环。build 与 compute
仍读同一份 cache。
