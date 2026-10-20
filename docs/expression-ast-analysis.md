# expression AST 梳理（以 TS 的表达式 AST 为准）

本文回答两件事：**expression 的 AST 对拍现在到底是哪一类问题**，以及**按七类问题各自该怎么修**（何时 build / build 提什么 / 何时 close / close 提什么）。

**边界**：`core/syntax/basic-tokens/` 属于「basic token 只能由用户发起修改」（IMPORTANCE §3.1）。
本文是梳理，**本页自身没有改 basic token、没有改 shape**（basic token 的改动属于 string token 轮，见工作树 diff）。
用例等各项收掉之后再逐条进 `typescript/cases/`（先写进去会把现在的绿门打红）。

---

## 0. 直接回答

### 0.1 已经收进语料的表达式：七类问题一个都没有

> **本轮复核（模板 AST 落地之后，2026-10-21 01:10）**：`\uXXXX` / `\xNN` 在 string token 轮修好；
> **模板 AST（S3–S6）已在形状层落地**，`string.ts` 75/75 全绿；§0.2 的 36 条探针读数为 **14 条一致 / 22 条对不上**
> （模板 ×4 与对象字面量 ×2 转绿）。其余结论不变。

```bash
node typescript/cases/ast-json.mjs            # 重新生成 6 份快照（含 string）
node typescript/cases/ast-json-diff.mjs       # 逐条对拍
```

```
export      62 / 62        import  54 / 54        number 70 / 70
expression 265 / 265       regex  256 / 256       string  75 / 75
合计 782 条：完全一致 782 / 782；结构差 0 条、位置差 0 条、字段差 0 条
```

`expression.ts` 的 265 条（E1 原子与后缀链 / E2 一元二元优先级 / E3 三元、赋值、逗号）**全部一致**。
所以：**已收进语料的表达式 AST 不属于七类里的任何一类**，它现在就是绿的。

`string.ts` 的 75 条（S1–S7，含 S3–S6 的模板）也**全部一致**——模板的形状层与 builder 分支已落地，见 §4.1。

> 注意验收口径：本分支上 `tests/parse/*` 那套旧门（`cases:tsast` / `cases:direct`）读的仍是另一个分支的产物，
> 见 `tests/MIGRATION.md`；本分支权威的 AST 尺子只有 `typescript/cases/ast-json.mjs` + `ast-json-diff.mjs`。

### 0.2 真正的缺口在 `expression.ts` 末尾「暂缓 / 想收但收不进来」那一批

把那 36 条逐条对拍（口径与 `ast-json-diff.mjs` 相同）：**14 条一致、22 条对不上**（模板 4 条与对象字面量 2 条本轮转绿）。按七类分：

| 类别 | 条数 | 是哪几条 |
| --- | --- | --- |
| possible build 不对 | **12** | 箭头 ×5、`f<T>(a)`、`as` / `satisfies` / 实参里的 `as`、函数/类表达式 |
| 缺少 possible | **8** | `async` 箭头、`<T>(a)=>a`、`<T>a`、数组字面量 ×2、`await` / `yield` / `new.target`（被外层语句候选挡住） |
| basic token 存在问题 | **0** | 原 6 条全部清账：`\u0041` / `\x41` 修在 `Translate`；模板 4 条 token 层 + 形状层都已打通（`string.ts` S3–S6 75/75） |
| possible compute 不对 | **1** | `import.meta`（**静默建错树**，不报错） |
| 缺少 end | **1** | `a\n++b;`（ASI）——**EOF 那一族已补上并转绿**（见 §4.3） |
| end compute 不对 | 0 | ASI 的终结判据还没有；EOF 的终结候选已实现（§4.6） |
| end build 不对 | 0 | 同上；import/export + EOF 三份终结候选都是好的（54 + 62 + 23/23 绿） |

**一句话**：不是一个问题。剩下的主账是 **possible build 不对**（builder 少产生式，12 条，占 55%）
与 **缺少 possible**（候选表 / `CanStart` 没放开，8 条，占 36%）；另有 1 条 **possible compute**（import 候选不淘汰、静默错树）
与 1 条 **缺少 end**（ASI）。**basic token 这一类已经清零；模板（原本 6 条 basic token + possible build）已整组转绿。**
**EOF 一族（`a` / `a + b` / `f()` / `a; b` 无分号）已补上并 23/23 转绿**，只剩 ASI。

### 0.3 建议的修复次序

1. **缺少 end**（ASI / EOF）——影响面最大、最便宜，而且它决定后面所有构造「在哪一刻算到齐」；
2. **possible build** 的 Tier 1（数组 / 箭头 / `import.meta`）——对象字面量本轮已顺带打通；
3. **缺少 possible**（候选表 / CanStart）——要跟 2 同一批放开，否则「放开就抛」；
4. ~~**模板 AST**（形状层七页 + builder 分支）~~ **本轮已落地**（S3–S6 41 条全绿）；
5. Tier 2（`as` / `satisfies` / 泛型实参 / 尖括号断言）——先有类型解析 `ParseType` 再谈。

> **本轮已落地**：
> - 第 1 项里的 **EOF**（`Source.EOF` 哨兵 + `EndOfFileTokenShape` + `SourceFileEndPossibleShape`），
>   并删掉 `SyntaxContext.Process` 文档末尾那次 `Root.TryToClose`：EOF 一族 23/23 绿。
> - 第 4 项的**模板 AST**：模板七页形状 + `ExpressionBuilder` 的模板 / 对象 / 数组分支，
>   `string.ts` 75/75 全绿，全量 782/782 一条不坏；对象字面量（`({ a: b })`）随之转绿。
>
> 第 1 项里还剩 **ASI**；第 2 项里数组字面量还卡 `CanStart`，第 3 项未动。

---

## 1. TS 侧硬约束（实测，`ts.createSourceFile`，均为无语法错输入）

| 构造 | 源码 | TS 的语义节点（pos, end；叶子带 text） |
| --- | --- | --- |
| 箭头 | `(a) => a;` | `ArrowFunction[0,8)` → `Parameter[1,2)`→`Identifier[1,2) "a"`、`EqualsGreaterThanToken[3,6)`、`Identifier[6,8) "a"` |
| 箭头（无参） | `() => 1;` | `ArrowFunction[0,7)` → `EqualsGreaterThanToken[2,5)`、`FirstLiteralToken[5,7) "1"` |
| 箭头（单参无括号） | `a => a;` | `ArrowFunction[0,6)` → `Parameter[0,1)`、`EqualsGreaterThanToken[1,4)`、`Identifier[4,6)` |
| 箭头（async） | `async (a) => a;` | `ArrowFunction[0,14)` → **`AsyncKeyword[0,5)`**、`Parameter[7,8)`、`EqualsGreaterThanToken[9,12)`、`Identifier[12,14)` |
| 泛型调用 | `f<T>(a);` | `CallExpression[0,7)` → `Identifier[0,1)`、**`TypeReference[2,3)`**→`Identifier[2,3)`、`Identifier[5,6)` |
| 泛型箭头 | `<T>(a) => a;` | `ArrowFunction[0,11)` → `TypeParameter[1,2)`、`Parameter[4,5)`、`EqualsGreaterThanToken[6,9)`、`Identifier[9,11)` |
| 尖括号断言 | `<T>a;` | `TypeAssertionExpression[0,4)` → `TypeReference[1,2)`、`Identifier[3,4)` |
| as | `a as T;` | `AsExpression[0,6)` → `Identifier[0,1)`、`TypeReference[4,6)`→`Identifier[4,6)` |
| satisfies | `a satisfies T;` | `SatisfiesExpression[0,13)` → `Identifier[0,1)`、`TypeReference[11,13)` |
| 函数表达式 | `(function () {});` | `ParenthesizedExpression[0,16)` → `FunctionExpression[1,15)` → `Block[12,15)` |
| 类表达式 | `(class {});` | `ParenthesizedExpression[0,10)` → `ClassExpression[1,9)` |
| 数组字面量 | `[a, b];` | `ArrayLiteralExpression[0,6)` → `Identifier[1,2)`、`Identifier[3,5)`（逗号不进 AST） |
| 对象字面量 | `({ a: b });` | `ParenthesizedExpression[0,10)` → `ObjectLiteralExpression[1,9)` → `PropertyAssignment[2,7)` → 两个 `Identifier` |
| 模板（无插值） | `` `t`; `` | `FirstTemplateToken[0,3) text="t"`（= `NoSubstitutionTemplateLiteral`；text **不含**反引号） |
| 模板（插值） | `` `a${b}c`; `` | `TemplateExpression[0,8)` → `TemplateHead[0,4) "a"`、`TemplateSpan[4,8)`→`Identifier[4,5)` + `LastTemplateToken[5,8) "c"` |
| 标签模板 | `` tag`t`; `` | `TaggedTemplateExpression[0,6)` → `Identifier[0,3)`、`FirstTemplateToken[3,6)` |
| import.meta | `import.meta;` | `ExpressionStatement[0,12)` → `MetaProperty[0,11)` → `Identifier[7,11) "meta"`（**没有** import 关键字节点） |
| ASI | `a\n++b;` | **两条** `ExpressionStatement`：`[0,1)` 与 `[1,6)`；第二条是 `PrefixUnaryExpression[1,5)` |

从表里能读出四条对产物有约束的事实：

1. **箭头函数不是「二元表达式加个壳」**：它自带 `Parameter` / `EqualsGreaterThanToken` / `AsyncKeyword` / `TypeParameter` 四种子节点；无参箭头**没有** Parameter。
2. **`as` / `satisfies` / 泛型实参 / 尖括号断言都要求类型节点**（`TypeReference` / `TypeParameter`）——这是 builder 目前完全不存在的子系统。
3. **模板的 `text` 是「去掉定界符之后的内容」**，而且 `TemplateHead` / `LastTemplateToken` 是两个不同的 kind；`NoSubstitutionTemplateLiteral` 与它们是三套节点。
4. **ASI 是语义层（语句边界）的事，不是词法**：`a\n++b;` 的两条语句在所有 token 都正确的前提下才分得出来。

---

## 2. 现在这条链路是怎么走的（读完代码后的三段职责）

| 层 | 谁 | 现在做什么 |
| --- | --- | --- |
| 起始判定 | `SourceFileShape.CreatePossibleShapes()` | 只有 **Import / Export / ExpressionStatement** 三个候选；其余 27 个（Function / Class / Variable / Block / Empty / If / …）**注释掉了** |
| 语句边界 | `ExpressionStatementPossibleShape` | `ComputeByIndex` 扫到 `Symbol ";"` 就 `Done`；`IsBuildable` 要求 `DoneAt === tokenIndex` |
| 建 | `BuildByIndex` → `ExpressionStatementShape.FromUnits` → `ExpressionBuilder` | **整段在 `;` 处一次性交给手写递归下降解析器**（箭头 / as / 数组 / … 全会落到这里）；`*-possible-shape` 那些表达式候选桩**不参与**（`ArrowFunctionPossibleShape` 等全部 `throw 未实现`，也没有任何消费者） |
| 挂载型 | `ImportDeclarationShape` | **第一个单元就建壳**（`MountedUnit`），后续单元流进来；`ImportDeclarationEndPossibleShape` 在 `;` 处 Accept → `SignOut` → `TryToClose` → `Quit`；字段在 `Close` 里从子形状提取 |

由此七类问题的落点就清楚了：

- **能不能起头** → possible（候选表 / `CanStart`）；
- **在哪儿结束** → end（终结候选）；
- **这一段怎么解析成树** → `BuildByIndex`（在表达式语句这里就是 `ExpressionBuilder`）；
- 挂载型还要多一条：**壳什么时候签名关闭**。

---

## 3. 实测：36 条探针 → 28 条对不上

探针与 `ast-json.mjs` 同口径（`tsAst` / `cjAst` 逐字段比 kind、pos、end、text、name）。

| 构造 | 现状（CJ 侧） | 类别 |
| --- | --- | --- |
| `(a) => a;` | 「表达式语句没有读完」 | possible build |
| `(a, b) => a;` | 同上 | possible build |
| `a => a;` | 同上 | possible build |
| `() => 1;` | 「括号内没有表达式」 | possible build |
| `async (a) => a;` | 仍缺 possible（`CanStart` 不认 `async`） | 缺少 possible |
| `(a) => ({ x: a });` | 「表达式语句没有读完」 | possible build |
| `f<T>(a);` | **静默错树**：`BinaryExpression` 链（`f < T > (a)`）+ 多出 `FirstBinaryOperator` / `GreaterThanToken` / `ParenthesizedExpression` | possible build |
| `<T>(a) => a;` | 仍缺 possible（`CanStart` 不认 `<`） | 缺少 possible |
| `<T>a;` | 同上 | 缺少 possible |
| `a as T;` | 「表达式语句没有读完」 | possible build |
| `a satisfies T;` | 同上 | possible build |
| `f(a as T);` | 静默错树：`f(...)` 里多出 3 个 `Identifier`（`a` / `as` / `T`），缺 `AsExpression` / `TypeReference` | possible build |
| `(function () {});` | 「括号内的表达式没有读完」 | possible build |
| `(function f() {});` | 同上 | possible build |
| `(class {});` | 同上 | possible build |
| `[a, b];` | 仍缺 possible（`CanStart` 不认 `[`；builder 的数组分支已就绪） | 缺少 possible |
| `[];` | 同上 | 缺少 possible |
| `({ a: b });` | **一致**（本轮随对象字面量分支打通） | — |
| `({ a: 1, b: 2 });` | **一致**（同上） | — |
| `` `t`; `` | **一致**（模板形状层已落地） | — |
| `` `a${b}c`; `` | **一致**（同上） | — |
| `` tag`t`; `` | **一致**（同上） | — |
| `` tag`a${b}c`; `` | **一致**（同上） | — |
| `async function f() { await g(); }` | 仍缺 possible（外层语句候选没启用） | 缺少 possible |
| `function* f() { yield 1; }` | 同上 | 缺少 possible |
| `function f() { new.target; }` | 同上 | 缺少 possible |
| `import.meta;` | **静默错树**：产出**空的** `ImportDeclarationShape`（不报错） | possible compute |
| `a\n++b;` | 「表达式语句没有读完」 | 缺少 end（ASI） |
| `"\u0041";` | **一致**（string token 轮已修） | — |
| `"\x41";` | **一致**（同上） | — |
| `/a/;` `/a/g;` `1n;` `a\n+b;` `"";` `"a\nb";` | **一致** | — |

> **写探针时踩到的坑（值得记下来）**：`ts.forEachChild` 的公开重载**在回调返回真值时停止遍历**。
> 写成 `node.forEachChild((c) => arr.push(tsAst(c)))` 时 `push` 返回数组长度（真值），
> 于是每个节点**只走第一个孩子**——第一次跑出来的 TS 侧少了一半节点，读数全错。
> `ast-json.mjs` 用的是块体 `(child) => { children.push(...) }`，所以它没这个坑；新写尺子照块体写。

探针之外另测的两族（不在 36 条里）：

| 输入 | 现状 | 类别 |
| --- | --- | --- |
| `a` / `a + b` / `f()` / `a; b`（无 `;`） | ✅ **已修**：EOF 哨兵 + 根终结候选建出 `ExpressionStatement`（`tmp/probe-eof.mjs` 23/23） | 缺少 end（EOF）**已补** |
| `a\nb;` | 「表达式语句没有读完」（应为两条语句） | 缺少 end（ASI，仍缺） |
| `import.meta;` / `import .meta;` | 一律静默产出空的 `ImportDeclarationShape`（`import .meta` 是 TS 合法输入） | possible compute + build |
| `import;` / `import x;` | 同样静默产出 `ImportDeclarationShape`（TS 侧本身有诊断，不属于合法用例，仅作旁证） | possible compute + build |

---

## 4. 七类问题逐条判定

### 4.1 basic token 存在问题（已清零；模板形状层也已落地）

**结论先说**：36 条探针里原来归在这一类的 6 条，**现在全部一致**——`\u` / `\x` 修在 string token 轮，
模板 4 条在随后的形状层轮打通（`string.ts` S3–S6 41 条、75/75 全绿）。
expression AST 现在**没有一条是因为 basic token 本身错了**而红的。

**场景 1（已修）：`\uXXXX` 少收一位。** `Translate.Append` 原来在 `Temp` 以 `u` 开头时
`return Temp.length === 4`，收到的是 `"u004"`；`DecodeClear` 的十六进制分支要求的也是 `"u004"`。
string token 轮把两处判据一起改成 5（`u` + 4 位），并补了 `\u{…}` / NonEscapeCharacter / 八进制等。
**复核：`"\u0041";` 现在与 TS 一致。**

**场景 2（已修）：`\xNN` 完全不认。** 转义字母表里没有 `x`，且「非 `u` 开头」按 1 个字符即完成。
string token 轮补了 2 位十六进制分支。**复核：`"\x41";` 现在与 TS 一致。**

**场景 3（已定案 + 已落地）：反引号模板串。**
原来 `String` 产出的 token 与普通字符串**类型不可区分**，所以七页模板形状一页都收不到输入。
string token 轮的结论是不新增第 9 种 basic token，而是用 `String` 现有字段区分：

- 三种形态由**引号**决定：`"` / `'` 是普通串，`` ` `` 是模板串（`StringChar`）；
- ts 模板串在 `StringGuide.Transit` 时置 `IsSupportInterpolation = true` / `InterpolationCount = 1`；
- `${…}` 段挂在 `InterpolationString` 子单元里，`ConstString` 与它交替出现，**没有空 `ConstString`**。

token 层复核（`tmp/verify-string-tokens.mjs` 18/18）：

```
`a${b}c`  →  <String IsSupportInterpolation=True …><ConstString>a</ConstString>
             <InterpolationString><Common>b</Common></InterpolationString>
             <ConstString>c</ConstString></String>
```

**形状层（本轮）**：一个 `String` 单元带 `Data = [ConstString, InterpolationString, …]`，据此切出

| 形状 | 来源 |
| --- | --- |
| `NoSubstitutionTemplateLiteralShape` | 无 `InterpolationString`，`Text` = 所有 `ConstString` 的串接 |
| `TemplateHeadShape` / `TemplateMiddleShape` / `TemplateTailShape` | 每段 `ConstString`，区间按 `String.Start` / `InterpolationString.Start`（`{`）/ `InterpolationString.End`（`}`）/ `String.End` 取 |
| `TemplateExpressionShape` / `TemplateSpanShape` / `TaggedTemplateExpressionShape` | 容器，按 TS 的 children 顺序装 |

`ExpressionBuilder` 补了 `IsTemplateToken` / `ParseTemplateToken`，`ParsePostfix` 认「表达式 + 模板」= 标签模板；
判据是 `String.IsSupportInterpolation` **且**引号在 `StringTemplate.InterpolationQuoteChars` 里（ts 只有反引号），
所以 C# 的 `$"…"` 不会被误当模板。**S3–S6 全绿（75/75），且全量 782/782 一条不坏。**

**留给 basic token 的潜在问题（当前 AST 口径不需要，先记着）**：TS 的模板节点还有 `raw`（带定界符的原文），
`String` 的 `Data` 只保留 cooked（`ConstString.TempToString()`），没有 raw 串。
本仓 AST 对拍只比 `text`，所以现在不用动；哪一天要输出 `raw`，那才是一次新的 basic token 需求（要用户决定）。

**参照（同类问题已经解决过两次，模式一样）**：
- 正则：`RegexToken` 由 basic token **整体收走**，形状层只做「把收好的 token 转成形状」；
- 数字：`1e-3` / `1_000` / `.5` 原来被 `Common` 在符号处断开，8e9aad5f 用 `NumberTemplate` 让 basic token 整体收走。
模板走的就是同一个模式（`String` 整体收走、形状层切分），只是它落在 `String` 这条既有路径上。

**不属于 basic token 的那一条**：`"a\nb"`（源码里真换行）TS 自己就报语法错；用例生成器把行内 `\n` 还原成换行是**生成器**的限制，不是 token 问题。

### 4.2 缺少 possible（8 条 + 整类语句）

两处，性质不同：

1. **`SourceFileShape.CreatePossibleShapes()` 只启用了 3 个候选**（Import / Export / ExpressionStatement），
   其余 27 个全部注释掉。于是以 `function` / `class` / `const` / `let` / `var` / `type` / `interface` /
   `enum` / `if` / `switch` / `try` / `throw` / `return` / `;`（空语句）/ `{`（裸块）开头的文件，
   全部在**下标 0** 就抛「没有候选形状可以构成（宿主 SourceFileShape，下标 0）」。
   `await` / `yield` / `new.target` 三条也是被这一层挡住——它们只在函数体里合法，而函数语句候选没启用，
   连进去测的机会都没有。
2. **`ExpressionStatementPossibleShape.CanStart` 不认几个合法的语句起点**：`[`（数组字面量）、
   `<`（尖括号断言 / 泛型箭头）、`async`、`import`（`import.meta`）、`{`（块/对象二义）。
   于是 `[a];`、`<T>a;`、`async (a) => a;` 也在下标 0 抛。

**注意「放开就抛」**：`CanStart` 与 `ExpressionBuilder` 必须**同一批**放开。只放开 `CanStart` 认 `[`，
`builder.ParsePrimary` 仍会抛「表达式里出现了不支持的括号」——错误只是从「没有候选」变成「括号不支持」。

### 4.3 缺少 end（EOF 已补，ASI 仍缺）

原来两处都是「到哪儿算到齐」的问题；**第 1 处（EOF）已在本轮落地**：

1. ✅ **EOF**：`SyntaxContext.Process` 不再在文档结束后手动 `Root.TryToClose`，改为再喂一个 EOF 哨兵位置
   （`Source.EOF`：下标 `-1`、`IsEOF`、`Value == "\0"`）。`SourceFileShape.Process` 收到 `source.IsEOF` 后：
   先关掉挂载单元与最后一个开着的子单元，再造一个 `EndOfFileTokenShape` 签入签出、加进根并 `TryToClose`；
   它的关闭触发根候选重算，根新加的终结候选 `SourceFileEndPossibleShape` 认下 EOF：
   把「还没建完的最后一条语句」按边界收尾建成 `ExpressionStatementShape`（`FromUnits(..., requireSemicolon=false)`），
   签出根、关闭根。`SourceFileShape.Close` 过滤掉 EOF 单元，所以它不进 XML / AST。
   普通候选在 EOF 单元上 `Reject`（`ExpressionStatementPossibleShape.ComputeByIndex` 见到 EOF 单元就退出），
   于是 `Candidates == 0`，正好满足 `CatalogGuide` 「终结候选只在普通候选全退后才建」的契约。
   **实测**：`a` / `a + b` / `f()` / `a; b`（末条无分号）、空文件、只有空白 / 注释、无分号 import / export 全部与 TS 一致
   （`tmp/probe-eof.mjs` 23/23）。
2. ❌ **ASI**：`ExpressionStatementPossibleShape.ComputeByIndex` 仍然只认 `;`。
   后果：**ASI 分不开**。`a\n++b;` 被当成一条语句拉到 `;`，build 时「表达式语句没有读完」；`a\nb;` 同样。
   （`a\n+b;` 没事，因为 `+b` 合法延续。）

**为什么 ASI 仍归「缺少 end」而不是「possible compute 不对」**：扫描器只认 `;` 是**设计使然**，
而「换行也是终结」这件事还没有判定点表达——EOF 的判定点是「EOF 单元 + 根终结候选」，
ASI 需要在「换行后第一个代码单元到来时」判「上一个语句能不能延续」，这是下一个终结候选（或同一候选的第二条判据）的活。
`;` 那条路径一行都不用动。

### 4.4 possible compute 不对（1 条，但最坏：静默错树）

`import.meta;` 与 `import .meta;` 都**不报错**，产出**空的 `ImportDeclarationShape`**。链路：

1. `ImportDeclarationPossibleShape.ComputeByIndex` 的 `Stage` 状态机只认括号：`import` 之后
   遇到 `Symbol "."`、`Common "meta"`、`Symbol ";"` 都不改变 `Stage = 1`，于是候选**永远 Uncertain**、不淘汰；
2. `ExpressionStatementPossibleShape.CanStart` 显式拒绝 `import` → 候选集只剩 import 一个；
3. `IsBuildable` 是 `Stage !== 0` → 在**第一个单元**（`import`）就挂载建壳（挂载型本身是对的）；
4. 后续单元流进壳里，`ImportDeclarationEndPossibleShape` 在 `;` 处 Accept → 关闭；
5. `ImportDeclarationShape.Close` 只把认得的子形状（`ImportClause` / `StringLiteral` / 修饰词 / `ImportAttributes`）
   收进 `kept`，**其余一律丢弃**；随后那句「Data 里还有 basic token 就抛错」检查的是**过滤后的** `kept`，
   所以永远看不到被丢掉的 token。

⇒ 修法两处一起：
- **compute**：`Stage 1` 里遇到紧邻的 `Symbol "."` 必须 `Reject`（合法 import 声明里 `import` 后面不可能紧跟 `.`）；
- **close 自检**：`Close` 里「未识别的单元」必须报错，而不是静默丢弃（自检要放在过滤**之前**）。

淘汰掉之后 `import.meta` 仍然建不出来（表达式语句候选拒绝 `import`、builder 也没有 `MetaProperty`），
所以这一条还要带上 §4.5 的 `MetaProperty` 产生式与 `CanStart` 放开——但**首要的错在 compute**：
它现在连「这不是 import 声明」都不说。

### 4.5 possible build 不对（12 条，主账）

`ExpressionStatementPossibleShape.BuildByIndex` → `ExpressionStatementShape.FromUnits` → `ExpressionBuilder`。
**build 的时机本身是对的**（`;` 到齐才建），问题在建出来的是错的 / 建不出来：

| 缺的产生式 | 现状 | 备注 |
| --- | --- | --- |
| 箭头函数 | 「没有读完」/「括号内没有表达式」 | `()` 空括号会先在 `ParseBracketExpression` 抛「括号内没有表达式」 |
| `as` / `satisfies` | 「没有读完」 | 需要类型节点 |
| 泛型实参 `f<T>(a)` | **静默建成比较链** | `<` / `>` 被 `ParseBinary` 当关系运算符吃掉，这是最坏的一类静默错树 |
| 尖括号断言 `<T>a` | 现在进不来（缺 possible）；放开后同样会被当比较链 | 需要类型节点 |
| 函数表达式 / 类表达式 | 「没有读完」 | 这两条要靠语句级候选（Tier 3） |
| 数组字面量 | 现在进不来（缺 possible）；**builder 的 `[` 分支本轮已就绪**（`f([1, 2])` 已能建对） | 只差 `ExpressionStatementPossibleShape.CanStart` 放开 `[` |
| `import.meta` | 见 §4.4 | 需要 `MetaProperty` 分支（`import` + `.` + `meta`） |
| ~~对象字面量~~ | ✅ **本轮已打通**：`ParsePrimary` 的 `{` 分支 + `PropertyAssignmentShape` | `({ a: b })` / `f({ a: 1 })` 已与 TS 一致 |
| ~~模板（无内插 / 有内插）~~ | ✅ **本轮已打通**（见 §4.1） | `string.ts` S3–S6 全绿 |
| ~~标签模板~~ | ✅ **本轮已打通**：`ParsePostfix` 认「表达式 + 模板」 | `tag\`t\`` / `` a.b`t` `` / `` f()`t` `` 都已一致 |

**依赖分档（决定先做哪批）**：

- **Tier 1（不依赖新子系统）**：数组字面量（只差 `CanStart`）、箭头函数（参数只收标识符）、`import.meta`；
- ~~Tier 1.5（模板）~~ ✅ **本轮已落地**；
- **Tier 2（依赖类型解析 `ParseType`）**：`as` / `satisfies` / 泛型实参 / 尖括号断言 / 泛型箭头；
- **Tier 3（依赖语句级候选）**：函数 / 类表达式、`await` / `yield` / `new.target`。

### 4.6 end compute 不对 / 4.7 end build 不对

**EOF 这一支已经有两格了（本轮实现，23/23 绿）**：

- **end compute**：`SourceFileEndPossibleShape.ComputeByIndex` 认「最后一个非 trivia 单元是 `EndOfFileTokenShape`」→ `Accept`；
  其余时候 `Reject`（所以 `;` 那条路径、import/export 的终结候选都不受影响）。
- **end build**：`SourceFileEndPossibleShape.BuildByIndex`：
  若 `ItemUtil.ItemStart` 到最后一个真实代码单元之间还是 basic token，说明最后一条语句永远等不到 `;`，
  用 `ExpressionStatementShape.FromUnits(..., requireSemicolon=false)` 按边界建出来；然后 `SignOut` 根（没签过时）、
  `TryToClose` 关闭根。EOF 单元在 `SourceFileShape.Close` 里被过滤，不进 XML / AST。

**ASI 这一支还没有**：它要的「换行 + 下一个代码单元不能延续」判据还没写，所以 `a\n++b;` / `a\nb;` 仍落「缺少 end」。
等 ASI 的终结判据落地，它自然落进这两格：
- **end compute**：ASI 判据；
- **end build**：建最后一句（同一套 `FromUnits` 边界收尾）→ 签名 → `TryToClose`。
现有的 import / export 两份终结候选仍然是好的（62 + 54 条全绿，`;` 处签名、关闭、`Quit` 都正确）。

---

## 5. 解决问题思路（逐条回答那五个问题）

### 5.1 basic token 哪些场景存在问题（交用户决定）

**本轮复核结论：expression AST 在 basic token 这一类已经清零，没有需要用户新拍的板。**
原来三个场景的去向：

1. `\uXXXX` 少收一位 —— **已修**（string token 轮改 `Translate.Append` / `DecodeClear`）；
2. `\xNN` 不认 —— **已修**（字母表 + 2 位十六进制分支）；
3. 反引号模板与普通字符串不可区分 —— **已定案并已落地**：不新增 basic token，用 `String` 的
   `IsSupportInterpolation` / `StringChar` 区分（`docs/string-template-analysis.md` 的结论）。
   token 层复核 18/18；七页模板形状与 builder 分支在形状层轮落地，`string.ts` 75/75 全绿（§4.1）。

唯一留给用户的**潜在**（不是现在）：模板节点的 `raw` 原文目前不在 token `Data` 里；
当前 AST 口径只比 `text`，所以不用动。哪一天 AST 要输出 `raw`，那才需要一次新的 basic token 决定。
参照已经收过的两例：正则（`RegexToken` 整体收走）、数字（`NumberTemplate`）。

### 5.2 正确的应该什么时候 build

原则：**单元到齐的那一刻 build**。到齐有三类，别混：

| 到齐的类型 | 判据 | 现在有没有 |
| --- | --- | --- |
| 固定终结符 | `;` / `}` 到齐 | ✅ 表达式语句用 `DoneAt === tokenIndex`，import 用终结候选 |
| **语法边界：EOF** | 文档结束后喂一个 `Source.IsEOF` 哨兵 | ✅ **本轮已实现**（根终结候选，§4.3-1） |
| **语法边界：ASI** | 换行 + 下一单元不能延续 | ❌ 仍缺（§4.3-2） |
| 挂载型的第一个单元 | 壳先建出来，字段等单元流进来 | ✅ `ImportDeclarationShape` |

具体到本次的问题：

- `a\n++b;`：正确时机是**换行处**（第一条语句到齐），现在被当成「`;` 到齐」→ 建早了整段、解析失败。→ ASI 终结判据仍待补。
- `a` / `a; b`（末尾无 `;`）：正确时机是 **EOF**，**已修**——根终结候选在 EOF 单元上建最后一条语句并关闭根。
- `import.meta;`：挂载型在第一个单元建壳**没错**；错在候选没在 `.` 处淘汰（§4.4）。
- `f<T>(a)`：`;` 到齐这个时机没错；错在 `BuildByIndex` 建出了比较链。

**两条硬规矩**（IMPORTANCE §3.4 / §3.3）：build 必须在同一次判定内完成并 `Reset()`；
build 复用 `PossibleShapesComputeCache` 里的扫描态（`Start` / `Stage` / `DoneAt`），不许重扫。

**补 end 候选时绕不开的一个机制冲突（EOF 已按 (a) 落地，ASI 沿用同一套）**：
`CatalogGuide.ComputePossibleShapesByIndex` 的规则是「终结候选 `Accept` 且 `Candidates > 0` → 抛错」，
也就是说 end 候选只在**普通候选全部退出**之后才能建。而边界那一刻表达式语句候选其实还活着
（它只是「还没见到 `;`」）。两条路：

- **(a) 让普通候选在边界上主动 `Reject`**（**已采用**）：`ExpressionStatementPossibleShape.ComputeByIndex`
  见到 `EndOfFileTokenShape` 就 `Reject`；`Candidates == 0` 之后由 `SourceFileEndPossibleShape`
  `Accept` 并 `BuildByIndex`。`CatalogGuide` 的契约一个字没改。
- **(b) 把边界做成真实单元**：EOF 走的就是这个形态（`EndOfFileTokenShape` 作为 real unit 进根 `Data`，
  `Close` 时触发父单元重算）；ASI 用不了这一招（换行本来就是 trivia），所以 ASI 仍要写 (a) 的判据。

`ExpressionStatementShape.FromUnits` 已经补了 `requireSemicolon?:bool`（缺省 `true`），所以
「允许在边界处收尾」这条代价已经付掉；ASI 落地时只需要补「换行 + 下一单元不能延续」的判据。

### 5.3 build 时应该提取哪些信息

**原子型（一次性建完，如字面量、表达式语句）**——在 `BuildByIndex` / `FromUnits` / `FromBasicToken` 里一次取完：

- **区间**：`SignIn(首个 basic token 的 Start)`、`SignOut(末个 basic token 的 End)`（shape 是闭区间）；
- **`Pos`**：前一个非 trivia 单元的 `End.Index + 1`（`ExpressionBuilder.Positions` 已经按这个口径算，新产生式照抄）；
- **语义字段**：`Text` / `Name` / `IsTypeOnly` / `Modifiers` / 操作符种类 —— 从 basic token 取一次就落库，
  **不要留 token 到 close 再取**（数字 `NumberBody` + 规范化、字符串按 `ConstString` 拼、正则 `ToText` 都是这个形态）；
- **子形状**：按 AST children 顺序 `Add` 进 `Data`（`BinaryExpression` = `[left, operator, right]`）；
- **消费掉的 basic token 从宿主 `Data` 移走**：`host.Data.splice(start, tokenIndex - start + 1, built)`；
- **未真实消费的 basic token 一律 `ReloadMessage`**，不许丢掉、也不许留着（IMPORTANCE §3.3）。

**挂载型（壳先建、单元陆续流入，如 `ImportDeclarationShape`）**——`build` 只建壳，字段在单元流入时/`Close` 里从**子形状**取
（`ImportClause` / `ModuleSpecifier` / `Modifiers` / `Attributes` 都是子形状，不是 basic token），
basic token 在 `Close` 过滤，且必须**断言不残留**。

### 5.4 什么时候 close

| 类型 | 时机 | 现在 |
| --- | --- | --- |
| 原子型 | `build` 末尾立即 `TryToClose()` | ✅ `StringLiteralShape` / `NumericLiteralShape` / `ExpressionStatementShape` 都是 |
| 挂载型 | 终结候选 Accept → `SignOut(最后一个代码单元)` → `TryToClose()` → `Quit()` | ✅ `ImportDeclarationEndPossibleShape` |
| EOF | EOF 哨兵单元关闭 → 根终结候选建最后一条语句 → `SignOut` → `TryToClose` | ✅ **本轮已实现**（`SourceFileEndPossibleShape`） |
| ASI | 换行边界到齐那一刻 close（不能等 `;`） | ❌ 缺（§4.3-2） |

禁止用 `ExitOrPre` 结束自己（IMPORTANCE §3.3）；shape 也不许覆盖 `ComputePossibleShapes`。

### 5.5 close 时应该提取哪些信息

- **只做收尾**：`Closed = true`、过滤 trivia（`SourceFileShape.Close`）、过滤/丢弃 basic token、
  把 `Parent` 挂上、把 `Data` 归一成「只等于 AST children」。
- **字段不该等到 close 才提取**：如果某个字段只有 close 时才知道，说明 build 时机不对——
  应当把 build 推后，而不是把提取搬进 close。挂载型是唯一例外（字段来自子形状，子形状要到齐才有）。
- **区间不在 close 改**：shape 的 `SourceRange` 是闭区间；AST 的 `Pos` / `End` 只在 `ParseFromShape` 里换算
  （`Pos = shape.Pos`、`End = shape.SourceRange.End.Index + 1`，IMPORTANCE §4）。
- **现在实现的偏差**：`ImportDeclarationShape.Close` 把「不认识的单元」静默丢弃，然后才对**过滤后的**
  `kept` 自检「Data 里还有 basic token」——这条自检恒过，于是 `import.meta` 变成空 `ImportDeclaration`。
  close 的正确姿态是：**未识别的单元必须报错**，不是丢。

---

## 6. 改动清单（按依赖顺序）

| # | 文件 | 改动 | 对应 |
| --- | --- | --- | --- |
| ✅ | `core/syntax/source.xl.md` + `core/syntax/syntax-context.xl.md` + `typescript/tokens/trivia/end-of-file-token-shape.xl.md` + `typescript/tokens/files/source-file-end-possible-shape.xl.md`（新增）+ `typescript/tokens/files/source-file-shape.xl.md` + `typescript/tokens/statements/expression-statement-shape.xl.md` | EOF 哨兵（`Source.EOF` / `IsEOF` / `Value=="\0"`）；删掉文档结束后的 `Root.TryToClose`；EOF 单元关闭 → 根终结候选建最后一句（`FromUnits(..., false)`）→ 签出并关闭根 | **EOF 的缺少 end（§4.3-1）✅ 本轮已落地，实测 23/23** |
| 1 | `typescript/tokens/statements/expression-statement-possible-shape.xl.md`（或新增 ASI 终结候选） | ASI 判据：换行 + 下一个代码单元不能延续 → 普通候选 `Reject`，由终结候选按边界建那一句 | 缺少 end（§4.3-2） |
| 3 | `typescript/tokens/declarations/import-declaration-possible-shape.xl.md` | `Stage 1` 遇紧邻 `Symbol "."` → `Reject` | possible compute（§4.4） |
| 4 | `typescript/tokens/declarations/import-declaration-shape.xl.md` | `Close` 的「Data 里还有 basic token」自检放到过滤**之前**；未识别单元报错 | possible build 的静默丢弃（§4.5） |
| ✅ | `typescript/tokens/expressions/expression-builder.xl.md` + `typescript/tokens/{literals,expressions,members}/*template*-shape.xl.md`（7 页）+ `property-assignment-shape.xl.md` + `object-literal-expression-shape.xl.md` + `array-literal-expression-shape.xl.md` | 模板七页补 `Text` / `FromBasicToken`；builder 补 `IsTemplateToken` / `ParseTemplateToken`（head/span/tail 切分）、`ParsePostfix` 收标签模板、`ParsePrimary` 认 `{` / `[`（对象 / 数组字面量）。**只动 shape / builder 层，core 一行没改** | **模板（S3–S6）✅ 本轮已落地：`string.ts` 75/75；对象字面量同时转绿** |
| 5 | `typescript/tokens/expressions/expression-builder.xl.md` | Tier 1 剩余：`import.meta`（`MetaProperty`）；`ParsePostfix` 认箭头（`(params) => body` / `a => body` / `async` 前缀） | possible build（§4.5） |
| 6 | `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | `CanStart` 放开 `[`（数组字面量；builder 已就绪）/ `<` / `async` / `import` | 缺少 possible（§4.2-2） |
| 7 | Tier 2：`ParseType` 入口（`typescript/tokens/types/` 下的形状或 builder 内新方法） | `as` / `satisfies` / 泛型实参 / 尖括号断言 / 泛型箭头 | possible build（§4.5 Tier 2） |
| 8 | `typescript/tokens/files/source-file-shape.xl.md` | 逐批启用其余 27 个语句候选（`function` / `class` / `block` / `empty` / `if` / …） | 缺少 possible（§4.2-1） |
| 9 | `core/syntax/basic-tokens/string/translate.xl.md` + `string.xl.md` | `\u` / `\x` / `\u{…}` / NonEscape / 模板 token 归属 | ✅ **已在 string token 轮落地**（等提交） |
| 12 | `typescript/cases/expression.ts` | 上表每收一项，把探针里的对应条目收进语料；**一条一条收**，不要先混进 265 条 | 度量 |

**不要动**：`*expression-possible-shape.xl.md` 那些桩（`ArrowFunctionPossibleShape` 等）。
当前架构下表达式语句是整段交给 `ExpressionBuilder` 重解析的，给这些桩写 `BuildByIndex` 会与
`ExpressionStatementShape` 抢建——正则那一轮已经踩过同一处（见 `docs/regex-token-analysis.md` §4.4 第 5 条）。

---

## 7. 验收

```bash
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
# 期望：782 条全绿（expression 265/265；string 75/75），新收的条目逐条转绿

node typescript/cases/ast-json.mjs expression
node typescript/cases/ast-json-diff.mjs expression
# 期望：完全一致 = 条数（收了哪条就 +1）

node tmp/verify-string-tokens.mjs
# 期望：18 / 18（模板 token 层；脚本改成逐字符 ProcessSingle、不喂 EOF，否则没有分号的串会被终结候选收成语句）

node tmp/probe-template-extra.mjs
# 期望：27 / 27（模板 / 对象 / 数组 / 标签模板 / 链式标签 / EOF 无分号模板的额外写法）

node tmp/probe-eof.mjs
# 期望：23 / 23（空文件 / 只有空白或注释 / 无分号表达式 / 无分号 import-export）
```

回归网：

- **265 条 expression 必须一直全绿**——尤其带注释 / 换行 / 多空格的变体（它们量的是 `Pos` 口径与 trivia 过滤，
  一改 build 时机最容易坏在这里）；
- **string 75 条必须一直全绿**（S1/S2/S7 是普通串与语句边界，S3–S6 是模板；模板的 `Pos` 口径最容易坏在
  `TemplateTail` 的「含前导 trivia」上——`a${ {x:1} }b` 那条就是它）；
- **EOF 族（已绿）**：`a`、`a + b`、`f()`、`a; b` 不带分号都要产出一条 `ExpressionStatement`；
  空文件 / 空白 / 注释-only 要产出空 `SourceFile`；无分号 import / export 也要照常收口；
- **ASI 的正反两族**：`a\n+b;`（可延续，仍一条）与 `a\n++b;` / `a\nb;`（断句，两条）都要绿——注意末条无 `;` 时靠 EOF；
- **import 的 54 条**（`import.meta` 的修法不许碰坏它们；EOF 改动后 54/54 仍绿）；
- 正则 256 条与 expression 里除号相关的那一族（basic token 的 `String` 改动已经改变了 `/` 的上下文判定，要一起重跑）。

`xl check` / `npm run compile` 不是本分支的验收（`xl` 不在 PATH 上），以 `ast-json-diff` 的读数为准。

---

## 8. 附：探针清单（36 条；本轮实测 **14 条一致 / 22 条对不上**）

```text
# 已一致（14）：/a/;  /a/g;  1n;  a\n+b;  "";  "a\nb";  "\u0041";  "\x41";
#              ({ a: b });   ({ a: 1, b: 2 });        ← 对象字面量本轮转绿
#              `t`;   `a${b}c`;   tag`t`;   tag`a${b}c`;  ← 模板本轮转绿
# possible build（12）：
(a) => a;   (a, b) => a;   a => a;   () => 1;   (a) => ({ x: a });
f<T>(a);   a as T;   a satisfies T;   f(a as T);
(function () {});   (function f() {});   (class {});
# 缺少 possible（8）：
async (a) => a;   <T>(a) => a;   <T>a;   [a, b];   [];
async function f() { await g(); }   function* f() { yield 1; }   function f() { new.target; }
# possible compute（1）：
import.meta;
# 缺少 end（1 + 探针外一族）：
a\n++b;                              （ASI，仍红）
a   （无分号，EOF）   a; b   （末条无分号）   a\nb;   （ASI）
# ↑ EOF 那一族（`a` / `a; b`）已转绿；`a\nb;` 与 `a\n++b;` 是同一件 ASI 的事，仍红。
```

**怎么重跑**：`node tmp/probe-expression-gaps.mjs`（口径 = `ast-json.mjs` 的 `tsAst` / `cjAst` + `ast-json-diff.mjs` 的三段比较）。
它把上面 36 条加上 EOF / ASI / 对照族一起打出来，每行是「判定 | 分类 | 源码 | 差异」。
额外写法（模板 / 对象 / 数组 / 标签模板 / 链式标签）用 `node tmp/probe-template-extra.mjs`（27 条，全绿）。
EOF 边界另有一份专用探针：`node tmp/probe-eof.mjs`（23 条：空文件 / 只有空白或注释 / 无分号表达式 / 无分号 import-export）。
注意该探针的 `tsAst` 是精简版（没有 import 子句的 `name` 提取），`import { a } from "m";` 这类对照行会假报字段差——
以 `ast-json-diff.mjs` 的 54/54 为准。

写这批用例时的注意：`ast-json.mjs` 的 `readCases` 会把行内任何 `\n` 还原成真换行，
所以「模板 / 字符串里的 `\n` 转义」写不进语料（正则那一轮同样的限制）。
