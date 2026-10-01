# TypeScript 解析一致性验收集

目的：把「`typescript/tokens` 离完整解析 TypeScript 还差什么」变成可回归的事实。

```
tests/parse/
  cases/<area>/<id>.ts   用例本体（一个用例一个文件，期望值写在文件头的指令注释里）
  known-gaps.json        已知缺口台账：登记在案的失败用例，修好后必须从台账里删掉
  validate.mjs           用例体检（只检查用例本身合不合格，不评判解析器）
  run.mjs                跑全部用例，与台账比对，输出缺口清单
  differential.mjs       用 TypeScript 自带 AST 做差分，自动找没人想到的缺口（比**构造个数**）
                          —— 它**没有退出码**（探针，怎么跑都是 0），表要逐行读：
                          **正项**才是缺口，「没有正项」这句话依赖 `MAP` 与标签表同源；
                          第 68 轮实测过一处失配（索引签名有了 `<IndexSignature>` 之后
                          `IndexSignatureDeclaration` 仍映射到 `Field`，凭空 119 处正项）
  matrix.mjs             构造矩阵：`上下文 × 构造` 全组合（比**构造在不同上下文里的行为**）
  lossless.mjs           无损性：源码里的标识符与字面量值是否还出现在产物里（比**内容**）
  structure.mjs          结构尺子：产物的**括号归属**是否就是源码的形状（比**嵌套形状**）
  boundaries.mjs         语句边界尺子：相邻两条 TS 语句有没有被并成一条（比**边界**）
  noise.mjs              噪声尺子：产物里有没有空的 `<Statement></Statement>`
  gap-dashboard.mjs      逐文件对账「TS 侧构造集合 vs 产物侧标签集合」（比**净额的方向**）
  align.mjs              对齐探针：用**源码区间重叠**把产物单元与 TS AST 节点对齐，双向反查
                         （产物有标签 / 源码没构造，或反过来）——形状换错语义时八把尺子全绿
  probe.mjs              最小片段探针：并排打印 TS AST 与产物 XML，用来定位单条缺口
  sweep.mjs              广谱构造普查：198 个 TS 构造片段逐条过，只报可疑项
  recon.mjs              侦察探针：174 条高风险片段（边界 / 表达式 / 类型 / 声明）
  recon2.mjs             侦察探针（第二轮）：94 条 TS 5.x / 6.x 构造与真实代码高频写法
  fuzz.mjs               组合模糊测试：9 个上下文 × 4 种分隔 × 215 个片段两两拼接，只找「抛异常」
  fuzz3.mjs              三片段组合探针：同一批片段**三个**相邻（抽样 20 万次），
                         补两两拼接够不到的第三种形状（第 67 轮它抓到一处整份文件解析失败）
  suggest.mjs            从差分结果里挑出还没写用例的构造
```

八把尺子是互补的，**任何一把红都不算「完整解析」**：
| 工具 | 口径 | 抓的是什么 |
| --- | --- | --- |
| `run.mjs` | 手写期望值 | 已经想到的构造有没有做对 |
| `differential.mjs` | 源码构造数 − 产物节点数 | 哪一类节点整片没产出（净额） |
| `gap-dashboard.mjs` | 正 / 负差额分开统计 | 净额互相抵消时看真相 |
| `matrix.mjs` | 上下文 × 构造 | 同一构造换到别的上下文里会不会翻车 |
| `lossless.mjs` | 名字与字面量的值 | 产物里有没有内容被吃掉（不需要标签映射） |
| `structure.mjs` | 括号配对的包含关系 | 节点**套在谁身上**——计数完全看不出的错位 |
| `boundaries.mjs` | 对着 TS AST 数相邻语句 | 两条语句被收进**同一个**单元——计数、内容、括号三条都不变 |
| `noise.mjs` | 空的语句单元 | 收尾口径改坏时留下的 `<Statement></Statement>` |

### `structure.mjs` 的口径

前五把都看不见**形状**：`run.mjs` 只查标签在不在、几个；`differential` / `gap-dashboard` 比的是计数
（一个节点套错父亲，计数不变）；`lossless` 与嵌套无关。于是补这一把：

> 源码文本里每个配对成功的括号（`(…)` / `[…]` / `{…}`）都是一个区间。
> 产物里「一个单元 = 一对括号」的标签（`Bracket` / `ObjectLiteral` / `*Body`…）也各有一个区间。
> **不变量：两对括号在源码里是包含关系 ⇔ 它们在产物树里是祖先关系。**

它不需要标签映射——只要求两边对**同一对括号**给出同一个区间；认领不到括号的标签不参与，不会误报。

两个必须知道的取舍：

- **它是靠对齐把括号落回源码的**。办法是「把产物叶子按文档顺序与源码 token 对齐」，
  再按「开括号在第一个内容叶之前、闭括号在最后一个内容叶之后，中间只有空白」认领括号。
  注释碎片与模板串会让叶子链变稀疏，对齐会滑；**对齐可信度低于 60% 的文件直接跳过**，
  并如实报告跳过了几个。宁可少查，也不要拿错的对齐去报假缺口。
- **`--self-test` 是它的牙口证明**：把产物树里的两对括号内容故意互换，尺子必须报警。
  一个永远绿的尺子比没有尺子更危险。

```bash
node tests/parse/structure.mjs --self-test   # 变异自检：改坏的产物必须被抓到
node tests/parse/structure.mjs               # 真实语料 + 用例语料
node tests/parse/structure.mjs cases         # 只跑用例
```

### `boundaries.mjs` 的口径

`structure.mjs` 看得见「括号套在谁身上」，但看不见**语句从哪里断开**：
两条相邻的语句被收进同一个 `Statement` 时，节点一个不少、名字一个不丢、括号包含关系也不变。

> 取任意一个语句表（`SourceFile` 顶层 / `Block` / `ModuleBlock` / `CaseClause` / 类静态块），
> 里面相邻的两条语句 S1、S2 之间有一个边界位置 `B = S2` 的起点。
> 产物里**不应该**存在一个「语句级单元」横跨 `B`；横跨就说明两条语句被读成了一条。
>
> 「语句级单元」= 不是容器标签（`Root` / `*Body` / `Bracket` / `ObjectLiteral`…）、
> 且拥有自己叶子的产物元素。容器本来就该横跨，全部排除。

它要复用「产物叶子 ↔ 源码 token」的对齐来给单元定区间，而这件事有两种失败模式，所以有两条硬规矩：

- **两遍贪心取交集**：左往右一遍（认复合 token）与右往左一遍各定位一次，
  **只有两遍一致的叶子才参与判定**。不一致说明至少一遍贴错了，而错的位置正是假缺口的来源
  （实测：`expr-compound-assign-all.ts` 里 `a >>= b;` 的叶子被贴到下一行，凭空造出一个跨行单元）。
- **判不了就报「跳过」**：一致率低于 60% 的文件如实计入「对齐不可信跳过」，不混进「通过」里。
  所以它跳过的文件比 `structure.mjs` 多——**宁可少查，也不要拿错的对齐去报缺口**。

```bash
node tests/parse/boundaries.mjs --self-test   # 变异自检：把相邻两条语句并成一条，必须被抓到
node tests/parse/boundaries.mjs               # 真实语料 + 用例语料
node tests/parse/boundaries.mjs cases         # 只用例语料
XL_BOUNDARY_DEBUG=1 node tests/parse/boundaries.mjs --file <路径>   # 打印判定依据
```

### `noise.mjs` 的口径

空 `<Statement></Statement>` 不携带任何信息。它的来源只有两种：收尾口径把该留的换行收走了，
或者反过来该收的没被收掉。所以它是**改收尾口径时的哨兵**——改 `DeclarationEnd` 一类东西前后，
这个数字必须仍然是 0。

```bash
node tests/parse/noise.mjs          # 真实语料 + 用例语料；空 Statement 必须为 0
```

### `sweep.mjs` 的口径

它不当判据，只当**普查表**：198 个覆盖 TypeScript 各构造的片段逐条喂给两边，
打印 TS AST 与产物并标出可疑项（抛异常 / 标识符在产物里既不在元素文本也不在任何属性值里）。
`--all` 打印全部（含正常的），`--filter <子串>` 只看某个构造。

```bash
node tests/parse/sweep.mjs                    # 只打印可疑项
node tests/parse/sweep.mjs --filter using     # 只看名字里带 using 的
```

`matrix.mjs` / `lossless.mjs` / `boundaries.mjs` / `noise.mjs` 与两把尺子的 `--self-test`
退出码都是「有问题 = 1」，可以直接当 CI 判据。

### `align.mjs` 的口径

它问的是「**形状与语义对不对得上**」：用 `SourceRange` 里的源码区间把产物单元与 TS AST 节点
按**区间重叠**对齐，然后双向反查：

1. 产物里有某个标签，源码里却没有任何对应构造 ⇒ 标签被别的形状占用（语义换错了）；
2. 源码里有某个构造，产物里却没有对应标签 ⇒ 缺节点。

前八把尺子看不见 (1)：`const f = (a) => { return a }` 的块体被收成 `TypeLiteral` 时，
节点计数、名字、括号归属、语句边界、空节点**全都正常**——里面每条语句只是悄悄退化成
`Field` / `MethodDeclaration`。差分账上只表现为几处「真多」，而「真多」从来不是判据。

它**是探针不是判据**（退出码恒为 0）。两个方向都带口径：

- `ALLOWED_EXTRA`：一个标签被多个 TS 构造共用（`ArrayLiteral` 同时是数组字面量、元组类型、
  计算属性名…），以及少数位置两边读法不同（构造签名的 `new`、映射类型按 `Field` 收…）。
  `--all` 才打印。
- `MISSING_IGNORED`：本工程**本来就不产节点**的 TS 构造，或**另有归属**的那些
  （`yield` / `await` 按 `Keyword` 收、多声明符变量列表只产出一个 `Let`…）。
  类型层曾经是最大的已知缺口，逐轮补到了第 66 轮：
  **函数类型 → `FunctionType`**（第 54 轮）、**条件类型 → `ConditionalType`**（第 55 轮）、
  **类型位的 `typeof` → `TypeQuery`**（第 57 / 66 轮）、**联合 / 交叉 → `UnionType` / `IntersectionType`**
  （第 58–59 轮）、**映射类型 → `MappedType`**（第 60 轮）、
  **数组 / 元组 / 下标访问 → `ArrayType` / `TupleType` / `IndexedAccessType`、
  `keyof` / `readonly` / `unique` → `TypeOperator`**（第 66 轮）。
  仍然只有散单元的是**类型引用**（`Foo` / `Array<T>` 由 `TypeDefine` / `GenericType` 承接）
  与**值位成员访问**（`a.b` 由 `Identifier` + `SymbolToken` 平铺承接）——
  内容与位置都对，只是没有专属标签（第 67 轮把标签表里的宽别名收干净之后核过：这两类是**登记在案**的取舍，
  不是漏收；`TupleType` / `MappedType` / `ConditionalType` / `Satisfies` / `ImportType` / `TypeQuery`
  的旧别名全部删掉了，删完「缺节点」仍是 0）。

```bash
node tests/parse/align.mjs            # 真实语料 + 用例语料
node tests/parse/align.mjs cases      # 只用例语料
node tests/parse/align.mjs --all      # 连登记过的口径一起打印（只有计数）
node tests/parse/align.mjs --samples  # 连登记过的口径也打印样本
node tests/parse/align.mjs --top 10   # 每类最多列 10 个样本
```

**`--samples` 是这一族里最值钱的一把**：口径（`ALLOWED_EXTRA` / `MISSING_IGNORED`）是
「这条差额我们认了」的记录，可**登记本身可能是错登记**——第 61 轮靠它一眼扫出三处真 bug
（成员的前导 `|` 多行联合被切断、`-` / `+` 不在泛型实参字母表里、`-readonly` 被折成一元运算）。

### `recon*.mjs` / `fuzz*.mjs` 的口径

这几把是**找缺口的探针**，不当判据（只打印可疑项，退出码恒为 0）：

- `recon.mjs`：174 条高风险片段（语句边界 / 表达式 / 类型 / 声明 / 模块），逐条比对
  「TS 有没有语法诊断」「产物里找不找得到源码里的标识符」「有没有抛异常」。
- `recon2.mjs`：第二轮 157 条——TS 5.x / 6.x 的新构造（`satisfies` / `using` / 装饰器 /
  `const` 类型参数 / 元组变长 / `infer` 约束 …）与真实代码里的高频写法，
  外加「结尾没有换行」「换行风格」「三片段探针抓到的两族形状」。
- `fuzz.mjs`：**组合**测试——9 个上下文（顶层 / 块 / 函数体 / 类体 / 命名空间 / 模块 / `if` / `for` / 箭头函数）
  × 4 种分隔（换行 / `;` / 空格 / 双换行）× 215 个片段两两拼接，约 7 万组合，
  只用 TypeScript 自己判断「这是不是合法 TS」，然后找**抛异常**的那些。
  它在「无分隔」这一类里抓到过 `{ A }a += 1` 那种「块紧跟着表达式」的形状。
- `fuzz3.mjs`：**三片段**组合——同一批片段的**三个**相邻（抽样 20 万次，固定种子可复现）。
  两两拼接够不到的第三种形状只有它能碰到：第 67 轮它抓到
  `type H = number` 换行 `try { } catch { }`（`TryReorganization` 抛「next is not Bracket」，
  **整份文件解析失败**）与 `{` 换行 `x => x` 换行 `[1, 2, 3]` 换行 `a += 1` 换行 `}`
  （`JsonArrayReorganization.Process` 抛「没有父单元」）两处。

```bash
node tests/parse/recon.mjs                     # 174 条高风险片段
node tests/parse/recon2.mjs                    # 157 条新构造 / 真实写法
node tests/parse/fuzz.mjs                      # 组合模糊测试（约 7 万组合，几十秒）
node tests/parse/fuzz.mjs --verbose            # 每个可疑组合打印源码与产物
node tests/parse/fuzz3.mjs                     # 三片段抽样 20 万次
node tests/parse/fuzz3.mjs --rounds 500000     # 换抽样规模（固定种子，同规模必得同结果）
node tests/parse/recon.mjs --all               # 连正常的也打印
```

**为什么它们值得留着**：`sweep.mjs` 是「一个构造一条片段」，只看单点；
`recon*.mjs` 补的是「构造的变体」，`fuzz.mjs` 补的是「构造与构造相邻」，
`fuzz3.mjs` 补的是「三个构造相邻」。本仓库的真缺口里，
`a.import` 的 `TypeError`、`Lamda` 没签出范围导致的克隆抛错、`{ A }a += 1` 的「没有父单元」
是被前三把抓到的，第 67 轮那两处（类型别名紧跟 `try`、块里箭头体续数组再复合赋值）
是被 `fuzz3.mjs` 抓到的——八把尺子里没有一把看得见它们
（计数、内容、括号、边界、空节点都正常）。

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
SymbolToken Identifier Keyword String ConstString InterpolationString
VerbatimQuoteGuide InterpolationGuide InterpolationExitGuide RawQuoteExitGuide RegexToken
LineAnnotation AreaAnnotation PreprocessorDirectives Bracket LineWrap
GenericType Method Signature TypeDefine TypeAssign As Satisfies FunctionType ConditionalType UnionType IntersectionType LogicalOperator NullConditionalOperator
ArrayType TupleType IndexedAccessType TypeOperator TypeQuery LiteralType ImportType TypeParameter InferType TypePredicate EnumMember OptionalType RestType NamedTupleMember IndexSignature ParenthesizedType HeritageClause ExpressionWithTypeArguments BindingElement
TernaryOperator TernaryOperatorCondition TernaryOperatorTrueStatement TernaryOperatorFalseStatement
Lamda Parameters Parameter LamdaBody
New NewType NewArguments
Class ClassBody Interface InterfaceBody Namespace NamespaceBody TypeLiteral TypeLiteralBody MappedType Enum EnumBody
Function FunctionBody MethodDeclaration MethodBody ReturnType Decorator Label Import Export NamespaceExport StaticBlock
IfSet IfSegment IfCondition IfStatement
Switch SwitchCompare SwitchSegment SwitchCase SwitchStatement
Try TryBody CatchDefine CatchBody FinallyBody
For ForInitial ForCompare ForNext ForBody
Foreach ForeachDefine ForeachEnumable ForeachBody
While WhileCompare WhileBody DoWhile
ObjectLiteral ArrayLiteral
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
node tests/parse/structure.mjs         # 括号归属（真实语料 + 用例语料）
node tests/parse/structure.mjs --self-test
node tests/parse/boundaries.mjs        # 语句边界（真实语料 + 用例语料）
node tests/parse/boundaries.mjs --self-test
node tests/parse/noise.mjs             # 空的 <Statement> 必须为 0
node tests/parse/sweep.mjs             # 198 个构造片段普查（只报可疑项）
```

`matrix.mjs` / `lossless.mjs` / `structure.mjs` / `boundaries.mjs` / `noise.mjs`
与两把尺子的 `--self-test` 退出码都是「有问题 = 1」，可以直接当 CI 判据。

## 写用例的几条实战经验

- **`xl:absent Statement` 基本用不了**：指令注释自己会形成 `Statement`
  （`<Statement><LineAnnotation>…</LineAnnotation></Statement>`），
  所以「某节点不该被包进 `Statement`」这类断言要用**计数**表达——
  `xl:expect Statement:2`（两条指令注释各占一个）而不是 `xl:absent Statement`。
- **数 `Statement` 时别忘了嵌套的那一层**：`declare module "x" { const a: number }` 外面一个
  `Statement`、`NamespaceBody` 里那个 `const` 又是一个，所以两条这样的声明 + 两条指令注释 = `Statement:6`。
- **计数断言要按当前产物校准**，但期望值写的仍是「TypeScript 解析正确时本该有的结构」：
  两个数字决定的是**能不能区分对错**，不是「现状是什么」。
  例如 `const a = .5;` 里 `SymbolToken` 只有 `=`（`;` 本来就不进产物），
  被拆坏时 `.` 会多出一个 `SymbolToken`——于是 `SymbolToken:1` 正好钉住它。
- **拿不准就往 `matrix.mjs` / `lossless.mjs` / `boundaries.mjs` 上加料**，别硬写成例：
  那几把尺子不需要维护期望值，回归时自己会红。

## 台账怎么用

- 用例失败且**不在**台账里 → `NEW GAP`，退出码 1。说明要么这是新发现的缺口，要么是回归。
- 用例成功且**在**台账里 → `STALE`，退出码 1。说明缺口修好了，把台账条目删掉（或跑 `--adopt` 重写）。
- 台账条目的 `group` 用来给缺口归类（如 `namespace-body`、`lex-single-quote`），报告按 group 聚合。

这样做的用意：**台账是一份逐步清空的缺口清单**。套件本身永远是绿的（只差台账里的条目），
而「能不能完整解析 TypeScript」这件事，等价于「台账里的**在案用例**变成 0 条」
（`_notes` 是不占用例的信息性记录，比如「标签表表达不了的缺口」）。
