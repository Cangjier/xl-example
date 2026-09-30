# TypeScript 解析一致性验收集

目的：把「`Dawn/Text` 离完整解析 TypeScript 还差什么」变成可回归的事实。

```
tests/parse/
  cases/<area>/<id>.ts   用例本体（一个用例一个文件，期望值写在文件头的指令注释里）
  known-gaps.json        已知缺口台账：登记在案的失败用例，修好后必须从台账里删掉
  validate.mjs           用例体检（只检查用例本身合不合格，不评判解析器）
  run.mjs                跑全部用例，与台账比对，输出缺口清单
  differential.mjs       用 TypeScript 自带 AST 做差分，自动找没人想到的缺口（比**构造个数**）
  matrix.mjs             构造矩阵：`上下文 × 构造` 全组合（比**构造在不同上下文里的行为**）
  lossless.mjs           无损性：源码里的标识符与字面量值是否还出现在产物里（比**内容**）
  gap-dashboard.mjs      逐文件对账「TS 侧构造集合 vs 产物侧标签集合」（比**净额的方向**）
  probe.mjs              最小片段探针：并排打印 TS AST 与产物 XML，用来定位单条缺口
  suggest.mjs            从差分结果里挑出还没写用例的构造
```

四把尺子是互补的，**任何一把红都不算「完整解析」**：

| 工具 | 口径 | 抓的是什么 |
| --- | --- | --- |
| `run.mjs` | 手写期望值 | 已经想到的构造有没有做对 |
| `differential.mjs` | 源码构造数 − 产物节点数 | 哪一类节点整片没产出（净额） |
| `matrix.mjs` | 上下文 × 构造 | 同一构造换到别的上下文里会不会翻车 |
| `lossless.mjs` | 名字与字面量的值 | 产物里有没有内容被吃掉（不需要标签映射） |

`matrix.mjs` 与 `lossless.mjs` 不需要手写期望值：前者把候选先交给 TypeScript 判定是不是合法 TS
（非法的直接跳过），合法的才查「不抛异常 / 内容不丢 / XML 嵌套良好 / 没有未转义的 `<`」；
后者直接拿 TypeScript 的 AST 抽名字与字面量，逐字找。

## 加一条用例

在 `cases/<area>/` 下新建一个 `.ts` 文件即可，文件名就是用例 id。开头写指令注释：

```ts
// xl:note 可选方法的签名（interface I { m?(): void }）
// xl:expect Method,TypeDefine
// xl:absent TernaryOperator
interface I {
  m?(): void
}
```

| 指令 | 含义 |
| --- | --- |
| `xl:note <一句话>` | 这条用例在测什么，会出现在报告里 |
| `xl:expect A,B` | 产物里**必须**出现这些节点标签（完整解析 TypeScript 时应当有的结构） |
| `xl:absent A,B` | 产物里**不允许**出现这些标签（用来钉住已知的错位，例如 `m?()` 被认成 `TernaryOperator`） |
| `xl:ts-invalid` | 故意写非法 TS；不加这条时用例必须是合法 TS，否则体检不过 |
| `xl:bom` | 这条用例故意以 UTF-8 BOM 开头（只给 BOM 用例用；其余带 BOM 的文件体检会报错） |

`<area>` 只允许：`declarations` / `statements` / `expressions` / `types` / `modules` / `lexical` / `ambiguous`。

### 写期望值的三条规矩

1. **`expect` 只写「TypeScript 解析正确时本该有的结构」，不要写「当前产物长什么样」。**
   把现状写进期望值，缺口就被固化成规范了。
2. **`expect` 只能用下面这张标签表里的标签。** 构造没有对应标签时留空——留空的用例仍然有意义：
   它至少断言「必须不抛异常」。
3. **一条用例只测一件事。** 需要对比「有 / 没有某种写法」时，拆成两个文件。

### 允许出现在 `expect` / `absent` 里的标签

```
Root Statement BlockToken Let Field
Symbol Common Keyword String ConstString InterpolationString
VerbatimQuoteGuide InterpolationGuide InterpolationExitGuide RawQuoteExitGuide RegexToken
LineAnnotation AreaAnnotation PreprocessorDirectives Bracket WrapSymbol
GenericType Method Signature TypeDefine TypeAssign As LogicalOperator NullConditionalOperator
TernaryOperator TernaryOperatorCondition TernaryOperatorTrueStatement TernaryOperatorFalseStatement
Lamda LamdaParameters LamdaParameter LamdaBody
New NewType NewArguments
Class ClassBody Interface InterfaceBody Namespace NamespaceBody TypeLiteral TypeLiteralBody Enum EnumBody
Function FunctionBody MethodDeclaration MethodBody ReturnType Decorator Label Import Export
IfSet IfSegment IfCondition IfStatement
Switch SwitchCompare SwitchSegment SwitchCase SwitchStatement
Try TryBody CatchDefine CatchBody FinallyBody
For ForInitial ForCompare ForNext ForBody
Foreach ForeachDefine ForeachEnumable ForeachBody
While WhileCompare WhileBody DoWhile
JsonObject JsonArray
```

## 跑

```bash
node tests/parse/validate.mjs          # 用例体检：3 条不合格就退出码 1
node tests/parse/run.mjs               # 用例对解析器：有新增缺口 / 台账过期就退出码 1
node tests/parse/run.mjs --verbose     # 打印每条用例的产物
node tests/parse/run.mjs --json out.json
node tests/parse/run.mjs --adopt       # 把当前失败用例写进台账（新增用例时用）
node tests/parse/differential.mjs      # 差分找缺口（真实语料，无需期望值）
node tests/parse/matrix.mjs            # 上下文 × 构造 全组合（真实语料，无需期望值）
node tests/parse/matrix.mjs --filter arrow --show
node tests/parse/lossless.mjs          # 内容无损（真实语料 + 用例语料，无需期望值）
node tests/parse/lossless.mjs real     # 只跑真实语料
```

`matrix.mjs` 与 `lossless.mjs` 的退出码是「有问题 = 1」，可以直接当 CI 判据。

## 写用例的几条实战经验

- **`xl:absent Statement` 基本用不了**：指令注释自己会形成 `Statement`
  （`<Statement><LineAnnotation>…</LineAnnotation></Statement>`），
  所以「某节点不该被包进 `Statement`」这类断言要用**计数**表达——
  `xl:expect Statement:2`（两条指令注释各占一个）而不是 `xl:absent Statement`。
- **计数断言要按当前产物校准**，但期望值写的仍是「TypeScript 解析正确时本该有的结构」：
  两个数字决定的是**能不能区分对错**，不是「现状是什么」。
  例如 `const a = .5;` 里 `Symbol` 只有 `=`（`;` 本来就不进产物），
  被拆坏时 `.` 会多出一个 `Symbol`——于是 `Symbol:1` 正好钉住它。
- **拿不准就往 `matrix.mjs` / `lossless.mjs` 上加料**，别硬写成例：
  那两把尺子不需要维护期望值，回归时自己会红。

## 台账怎么用

- 用例失败且**不在**台账里 → `NEW GAP`，退出码 1。说明要么这是新发现的缺口，要么是回归。
- 用例成功且**在**台账里 → `STALE`，退出码 1。说明缺口修好了，把台账条目删掉（或跑 `--adopt` 重写）。
- 台账条目的 `group` 用来给缺口归类（如 `namespace-body`、`lex-single-quote`），报告按 group 聚合。

这样做的用意：**台账是一份逐步清空的缺口清单**。套件本身永远是绿的（只差台账里的条目），
而「能不能完整解析 TypeScript」这件事，等价于「台账里的**在案用例**变成 0 条」
（`_notes` 是不占用例的信息性记录，比如「标签表表达不了的缺口」）。
