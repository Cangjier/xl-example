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
  ast-json.mjs           AST JSON 尺子：**两个出口同源**——`ToXmlString()` 与 `ToJsonString()`
                         折算成同一种形状后逐节点比对（比**XML 出口与 JSON 出口是否说同一棵树**）
  ts-ast.mjs             TS AST 对拍尺子：**直接拿 `ts.createSourceFile` 当基准**，逐节点比
                         kind / 区间 / **字段名**（比**产物节点集合与 TS 的语义节点集合是否同一套**）
  ts-shape.mjs           TS 形状投影：把产物树投成 TS AST 的形状（换名 + 补壳 + 字段名），
                         供上面那把尺子量成绩——它是「完全 follow TS 形状」的落点
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

另有第九把，问的是**另一件事**：产物自己的两个出口（XML 与 AST JSON）是不是同一棵树——
那不属于「解析对不对」，而属于「规范里两处拼串有没有漂开」。它挂在
`Token.ToDictionary` 上（见 [docs/ast-json.md](../../docs/ast-json.md)）：

```bash
node tests/parse/ast-json.mjs --self-test   # 变异自检：改坏 JSON / XML，尺子必须抓到
node tests/parse/ast-json.mjs cases         # 只跑用例语料
node tests/parse/ast-json.mjs               # 真实语料 + 用例语料
```

### `ast-json.mjs` 的口径

`Token.ToDictionary` 是照 `Token.ToXmlString` 抄的第二套拼串，两处不同步**不会有任何别的尺子看得见**：
节点数、名字、括号归属、语句边界全都正常，只是 JSON 少了一个键或少了一个节点。
上游 Cangjie 的这两个出口之间就已经漂开了（`MethodName` → `methodName`、
`StartBracketChar` → `startBracketChar`），所以这里补一把只问这一件事的尺子。

折算要抹掉的只是**排版差异**，一共三类，全部写在尺子顶部的两张表里：

| 差异 | XML | JSON |
| --- | --- | --- |
| 叶子 | `<Identifier>x</Identifier>` | `{"type":"Identifier","value":"x"}` |
| 空节点 | `<LineWrap />` | `{"type":"LineWrap"}` |
| 具名分段 | `<For><ForInitial>…</ForInitial>…` | `{"type":"For","initial":[…]}`——**段元素自己不成为节点** |

第三类是最容易看走眼的：`Switch.segments` 装的是 `<SwitchSegment>` **元素本身**（`unwrap: false`），
而 `For.initial` 装的是 `<ForInitial>` 的**内容**（`unwrap: true`）。表里写错一行，尺子立刻报节点名不符。

值的类型走一张类型表（`BOOL_KEYS` / `NUMBER_KEYS`）：布尔在 XML 里是 `"true"`、在 JSON 里是真布尔，
数字同理。**「JSON 有、XML 没有」的键要登记**（`JSON_ONLY_ATTRS`）——
目前只有一处：`Lamda.async`（`<Lamda>` 从来不写这个属性，而 JSON 不收它就分不出 `async x => x` 与 `x => x`）。
没登记的「多一个键」照样会红，所以它不会变成藏差异的角落。

`--self-test` 的四种变异：JSON 节点名错位、内容被改、属性键被删、分段键被删，另加 XML 标签名被改——
五种都必须被抓到。**第一版的自检在这里是假的**（它拿「根数组前两个节点互换类型」当变异，
而两个根节点本来就是同一个类型，互换等于什么都没做），现在改成「把某个节点的类型改成它父亲的」。

### `ts-ast.mjs` 的口径

这一把问的是**另一个问题**：这份产物离「和 TypeScript 的 AST 一模一样」还差多少。

| 尺子 | 比对面 |
| --- | --- |
| `cases:diff` | **个数**：源码里有几个这种构造 ↔ 产物里有几个对应标签 |
| `cases:align` | **位置**：按源码区间对齐，双向反查标签占用 / 缺节点 |
| `cases:astjson` | **两个出口同源**：XML 与 AST JSON 是不是同一棵树 |
| `cases:tsast` | **形状**：产物节点与 TS 的**语义节点**逐个对（kind / 区间 / 属性名） |

TS 侧的基准是 `ts.createSourceFile(...)`，取的子节点是 `ts.forEachChild` 那一层——
**不含修饰符、标点、参数括号**，这是「直接 diff」最自然的一层，也是各种 AST 查看器展示的那一层。
产物侧用 `Root.ToList()`：坐标是这一把的地基，**没有坐标就只能靠文本猜位置，那种对齐一遇到壳节点就断**
（试过：`IfStatement` 那种壳节点在文本里根本搜不到）。

**当前状态：这一把是红的，而且是刻意留红的。** 它红的不是「解析出错」，
而是「产物的节点集合与 TS 不是同一套」——那正是要重构 token 层的部分。实测：

| 语料 | 产物节点 | TS 语义节点 | 同 kind 同区间 |
| --- | --- | --- | --- |
| 用例语料 1001 个文件 | 18896 | 15303 | 4327（**28.3%**） |
| 真实语料 383 个文件 | 555415 | 452849 | 203063（**44.8%**） |

这个百分比**同时量三件事**：节点集合、坐标、以及**名字的归一**（详见下一节）。
它一次就能反映三处的成绩，所以只看着它涨。

### 名字要先归一，再比

直接拿产物的标签名去比 TS 的 `SyntaxKind` 名会把两类东西混在一起：

- **假阴性**：`<Keyword>string</Keyword>` 与 TS 的 `StringKeyword` 区间一模一样，名字不同却被算成「缺节点」；
- **假阳性**：`<Keyword>const</Keyword>` 与 `ConstKeyword` 本来是一回事，可按字符串比它们凑不到一块。

所以尺子先把两侧折成**同一个名字**再比，三张表写在文件顶部：

| 表 | 作用 | 例 |
| --- | --- | --- |
| `TS_KIND_ALIASES` | 把 TS 的**枚举别名**换回真名 | `FirstStatement` → `VariableStatement`、`FirstLiteralToken` → `NumericLiteral`、`ThisType` → `ThisKeyword` |
| `PRODUCT_KIND` + `leafKindOfText` | 产物标签按**值**分名 | `<Identifier>0</Identifier>` → `NumericLiteral`、`<Identifier>true</Identifier>` → `TrueKeyword`、`<ConstString>` → `StringLiteral` |
| `KEYWORD_KIND` | `<Keyword>` 的文本 → TS 的类型关键字 | `string` → `StringKeyword`、`readonly` → `ReadonlyKeyword`、`this` → `ThisKeyword` |

有了这一层，同一批语料的匹配率当场从 39.2% 抬到 **44.8%**（真实语料）——
抬起来的那部分不是解析变好了，而是**之前被名字差异盖住的「其实已经对上」的节点**。
这张表就是「叶子按值分名」的验收标准：表里每加一条，百分比就该动一次；
不动说明那条没生效，动了说明产物确实已经能供出那个名字。

**下面 `null` 是刻意的**：标点（`SymbolToken`）、注释、软换行在 TS 的**语义子节点**里不出现，
所以它们不参与比对，也不算「产物多出来的」。`Identifier` / `Keyword` 映射到 `null`
表示「按文本再分」——它们是**一类对多类**的标签，归一名要靠 `leafKindOfText` / `KEYWORD_KIND`。

### 投影：`ts-shape.mjs`

上面那张归一表只解决**名字**。要真的产出「`ts.createSourceFile` 兼容的 JSON」，
还需要**补壳**与**字段名**——这就是 `ts-shape.mjs` 的活：

| 做什么 | 例 |
| --- | --- |
| **换名** | `Let` → `VariableDeclaration`、`BinaryOperator` → `BinaryExpression`、`<Identifier>0</Identifier>` → `NumericLiteral` |
| **补壳** | `let x = 1` 在本工程是 `Statement` + `Let` 两层，TS 是三层：补出 `VariableDeclarationList` 与 `VariableStatement` |
| **字段名** | 分段本来就叫 `initial` / `compare` / `body` / `parameters`…（这套 token 层从一开始就照着 TS 起的名字），TS 叫法不同的补上（`declarationList` / `statements`…） |
| **不猜** | 没覆盖的标签**原样透传**并记进 `unmapped`——猜出来的节点会让尺子报出假成绩 |

两个坐标细节（实测出来的，写在 `projectLet` 的注释里）：

- `VariableDeclaration` 从**名字**开始，不含前面的 `let `——TS 的 `getStart()` 跳过前导 trivia；
- `VariableDeclarationList` / `VariableStatement` 两层壳才从 `let` 那个词开始。

**尺子怎么量它**：`cases:tsast` 把投影结果与 `ts.createSourceFile` 逐节点比三样——
kind、区间、**字段名**。第三样是这一轮补的：此前只比 kind 与区间，
于是「把 `children` 改叫 `statements`」这类改动**一个数字都不会动**。
现在的数（用例语料 / 真实语料）：

| 口径 | 用例语料 | 真实语料 |
| --- | --- | --- |
| 投影节点 / TS 语义节点 | 14003 / 15303 | 465874 / 452849 |
| 同 kind 同区间 | **75.4%** | **86.0%** |
| 其中**字段名也一致** | **96.2%** | **98.1%** |

### 第 31 轮：`in` / `instanceof` 是 `Keyword`，不是 `SymbolToken`

真实语料侧「产物只有 `operatorToken`、TS 有 `left`/`right`」那 1118 处，打出来全是同一类：

```
x in o          operatorToken=in
x instanceof Y  operatorToken=instanceof
```

根因：我的运算符定位只认 **`SymbolToken`**，而 **`in` / `instanceof` 在产物里是 `Keyword`**——
于是两个操作数一个都没取到，只剩一个从 `op` 属性合成的运算符。加一个 `isOperatorUnit`
（`SymbolToken` 或 `in` / `instanceof` 关键字）之后整类消失。

**同一轮还留了个尾巴，如实记在这里**：`a && b || c` 这类**逻辑运算**在产物里是三个残缺的
`LogicalOperator`（只有 `op="And"` / `op="Or"` 属性，**运算符符号根本没进树**，
左右两块还散成了平级兄弟）——这是 **token 层的结构问题**，投影治不了根。
这轮只做了一件保守的事：**两侧都没有时不要凭空发一个空壳 `BinaryExpression`**
（退回把子单元投出来，让里面的节点还能对上）。真正的修法在 token 层，留给后面。

真实语料 85.2% → **86.0%**（字段名 97.8% → 98.1%）。

### 第 30 轮：接口成员是另一套 kind —— 真实语料 76.9% → **85.2%**

这一轮先看了**真实语料侧**的缺口表（它 45 万节点，缺口才是大头），头三名一眼就看出是同一件事：

```
18930  PropertySignature      ← 接口 / 类型字面量里的属性
 8682  MethodSignature        ← 接口 / 类型字面量里的方法
10190  QuestionToken          ← `x?: string` 与 `m?(a): void` 里那个 `?`（TS 是**子节点**）
```

而产物那边这三样与类里的成员**是同一种标签**（`Field` / `MethodDeclaration`），
`?` 则被**吞进了 `TypeDefine` 的区间**里（`TypeDefine[17,25]` = `?: string`）。所以：

1. **引入「签名上下文」**：投影接口 / 类型字面量的成员时给 `ctx` 打一个标记，
   同一个产物标签在那个上下文里换成 `PropertySignature` / `MethodSignature`
   （`projectEachIn`，用 `try/finally` 存还标记）；
2. **`?` 从类型段的第一个字符切出来**，做成 `QuestionToken` 子节点（属性与形参两处）。

顺带把 `MethodDeclaration` / `MethodSignature` 的 `children → parameters` 补上
（字段表里原来只登记了 `GenericType`，于是这个字段名一路错下去——真实语料 6k+ 处）。

**真实语料 76.9% → 85.2%，字段名 96.1% → 97.8%**；用例语料 74.3% → 75.3%。

**这一轮的教训**：前几轮我一直盯着**用例语料**的缺口表——它挑的是语法难点，条目分散；
而真实语料（`.d.ts` 为主）的缺口**极其集中**，一处上下文差异就是几万个节点。
**两个语料要分别看缺口表**，它们指向的问题完全不同。

### 第 29 轮：字段名前三，三种不同的病因

按上一轮的教训，对这轮的三类各问了一句「产物里真的没有吗」，答案是**三种不同情况**：

| 字段名差异 | 产物里有没有 | 修法 |
| --- | --- | --- |
| `ExpressionWithTypeArguments` 缺 `typeArguments`（15） | **有**（平级的 `[Identifier(B), GenericType(<T>)]`） | 字段表只把 `children` 整体映射成 `expression`，实参被塞进去了；改成显式切两块 |
| `SwitchStatement` 的 `compare`/`segments`（16） | 段名不同、且**缺一层** | 改名为 `expression`，并把 `segments` **合成**一个 `CaseBlock`（TS 在中间有这层壳） |
| `TypeParameter` 的 `modifiers`/`constraint`（17） | **有**，但名字找错了 | 见下 |

`TypeParameter` 那一处最值得记：**`out` 在产物里是 `Identifier`**（不是 `Keyword`——README 的
「已知口径」早就记过这条），所以我那句「名字 = 第一个 `Identifier`」把 `out` 当成了名字本身，
于是 `modifiers` 空掉、`name` 也指错。修法是**找名字时排掉修饰词与 `extends`**
（`extends` 的词法身份同样不固定：本仓库记过「接口的 `extends` 永远升不成 `Keyword`」）。
顺带补了 `const` 类型参数（`<const T>`）也进 `modifiers`。

同一轮还顺手补了三处纯字段名：`NonNullExpression → expression`、`TypeQuery → exprName`、
以及 `extends` 的双身份判断。

用例语料 74.1% → **74.3%**，字段名 95.6% → **96.0%**（真实语料 96.1%）。

### 第 28 轮：解构声明的名字，产物里**本来就有**

`ObjectBindingPattern` / `ArrayBindingPattern` 的 `elements` 空着（17 + 15 处），
追下去发现**根本不是我缺信息**——产物里那个括号段本来就是结构化的：

```
Let[0,21] arrayPattern="a,1,rest"
  ArrayLiteral[6,21]                 ← 就是 TS 的 ArrayBindingPattern[6,22)，逐格一致
    BindingElement[7,11] > [Identifier(a), SymbolToken(=), Identifier(1)]
    SymbolToken(,)
    BindingElement[14,20] > [SymbolToken(...), Identifier(rest)]
```

而我早先从源码括号里**另造了一个空壳**（`bindingSpan`，只有区间、没有内容）——
于是 `elements` 空着，里面的 `BindingElement` 与那些名字全丢。这一族同时解释了三处症状：
`ObjectBindingPattern` / `ArrayBindingPattern` 的字段名差异、`BindingElement` 的字段名差异、
以及 `Identifier` 缺口里的 62 个。

修法就是**用产物自己的那个节点**，另加两张小表：

- **绑定位要换 kind**：同一个产物标签 `ArrayLiteral` 在**值位**是 `ArrayLiteralExpression`、
  在**绑定位**是 `ArrayBindingPattern`——所以按上下文显式换，不走 `KIND_BY_TAG`（那是值位的表）；
- `BindingElement` 的三种形态按标点切：`a`（只有 `name`）、`p: q`（`propertyName` + `name`）、
  `a = 1`（`name` + `initializer`）；`...rest` 的 `...` 是节点的**属性**、不是子节点，不投。

用例语料 73.2% → **74.1%**，真实语料持平（76.8%），`Identifier` 缺口 678 → **616**。

**这一轮的教训与第 25 轮同源**：症状是「缺字段」，但根因是**没用上游已经给的东西**，
反而是自己造了一份更差的。查缺口时先问一句「这个信息产物里真的没有吗」。

### 第 27 轮：类型位的点号名是 `QualifiedName`，**不是** `PropertyAccessExpression`

`Identifier` 那 700 处里有一大块压在**点号类型名**上（`A.B.C` / `N.M<T>`）。
TS 在**类型位**用的是：

```
TypeReference[7,12)
  QualifiedName[7,12)                    ← 字段是 left / right
    QualifiedName[7,10)
      Identifier[7,8)   Identifier[9,10)
    Identifier[11,12)
```

而 `projectTypeExpression` 原来遇到多单元时**只取第一个 `Identifier`**，后面的 `B`、`C`
**整个丢掉**——`Identifier` 与 `TypeReference` 两个缺口都是它。

注意这里有个容易混的地方：**同样的 `a.b`，值位是 `PropertyAccessExpression`、
类型位是 `QualifiedName`**（第 22 轮刚在值位折过点号链）。两者形状几乎一样，但 kind 与字段名都不同。

顺带补了 `VariableStatement` 的 `modifiers`：`export const q = 1` 的 TS 是
`VariableStatement(modifiers=[ExportKeyword])` + `List(flags=Const)`——
**`const` / `let` / `var` 是列表的 flags，不是语句的修饰词**，混进去会多一个 `ConstKeyword`。

真实语料 75.5% → **76.8%**（它类型密集，这一轮受益最大），用例语料 73.1% → 73.2%。

### 第 26 轮：又是「产物是平级、TS 是包住」的一族

重跑差值分布表（第 24 轮总结的方法），这轮清掉两族：

**① `LabeledStatement Δ-N`（一族 10 处，最大的一块）**
产物那边 `outer: for (…) {}` 是**两个平级的单元**（`Label[0,5]` 与 `For[7,36]`），
而 TS 是 `LabeledStatement[0,37) > [Identifier, ForStatement]`——**一个包住另一个**。
早先按 `Label` 单独投出一个 `LabeledStatement`，它的区间就只盖住标签本身（Δ 从 −2 到 −125）。
改法：在**序列层**做折叠（连续标签从右往左套），标签名的 `Identifier` 区间按**名字宽度**切
（产物那个 `Label` 盖住 `outer:`，含冒号）。

**② `VariableDeclarationList / VariableDeclaration Δ-4`** —— `for (let i = 0; …)` 的头部
  产物那边 `For.initial` 是一段单元 `[Let, SymbolToken(=), 初始化式]`，而 TS 的
  `ForStatement.initializer` **直接就是 `VariableDeclarationList`**（不套 `VariableStatement`）。
  早先按单个 `Let` 投，**看不到初值**（初值是这个段里的平级兄弟）——所以 `List` / `Declaration`
  各短 4 个字符。改法：把 `projectLet` 拆出「**单元列表版**」`projectLetFrom`，
  `Statement` 壳由调用方决定（序列里要壳、`for` 头部不要壳）。

顺带把「尾部 trivia」的处理从**语句族白名单**改成**一律剪**——
第 23/25 轮按 kind 名后缀挑，还是漏了正则字面量（`Δ1`）。节点里不存在
「合法地以空白结尾」的情况，所以这条可以无条件做。

用例语料 72.6% → **73.1%**，真实语料持平（75.5%，匹配数 +214）。
差值表里剩下的都是单点个例（计算属性名、ASI 二义、点号命名空间），收益已进入长尾。

### 第 25 轮：点号链「先折、再当左操作数」

上一轮的差值表里还剩 `PropertyAccessExpression Δ6/Δ9` 与 `IfStatement Δ1`，这轮都处理了。

**点号链这一处前后改了三次，把三个错法都走了一遍**，值得完整记下来：

| 版本 | 做法 | 结果 |
| --- | --- | --- |
| 最初 | 「找第一个标点当运算符」 | `.` 被当成二元运算符 ⇒ 折出一个 `BinaryExpression`（**两头都错**） |
| 第 22 轮 | 「必须吃满整串才认这条链」 | 修好了 `a.b.c`，但 **`a.b.c = 1` 这种链后面还有运算符**的又不认了 |
| 本轮 | **先折链、再把链的结果当左操作数继续折** | 两种都成立 |

同时补上「链尾是一次调用」的分支：`console.log(1)` 的产物是
`[console, ., Method(name="log")]`——那个 `Method` 盖住的是 **`log(1)`**，
而名字只占开头的几个字符，所以按**名字宽度**切一段 `Identifier` 出来再折进
`PropertyAccessExpression`，最后把 `CallExpression` 的被调用者换成这条链
（TS：`CallExpression > PropertyAccessExpression > …`）。

`IfStatement Δ1` 则是第 23 轮那个病因的漏网：当时只修了 `ExpressionStatement` 与
`VariableStatement` 两个**具体 kind**，而语句是一整族。这轮改成按 **kind 名后缀**
（`…Statement` / `Block` / `ModuleBlock`）统一剪尾部 trivia——省得每加一个语句 token 就回来补一条。

用例语料 72.1% → **72.6%**，真实语料 74.2% → **75.5%**。
（字段名那一栏略降是**分母变了**：新匹配上的节点里有一部分字段名不同。）

### 第 24 轮：把「尾巴差几个字符」这类问题**一次量完**

上一轮修「语句尾巴的换行」时是逐类猜的。这一轮换了个量法：**同 kind、同起点、但终点不同**
的节点按「kind + 差值」归类——一次就把所有「差几个字符」的类都排出来了：

```
    16  DeclareKeyword   Δ-7    TS[26,33) 我[26,26) «declare»
    11  StaticKeyword    Δ-6    TS[66,72) 我[66,66) «static»
    10  ReadonlyKeyword  Δ-8    TS[77,85) 我[77,77) «readonly»
     9  ExportKeyword    Δ-6    TS[356,362) 我[356,356) «export»
     9  PublicKeyword    Δ-6    …
     6  AsyncKeyword     Δ-5    …
```

**全是修饰词，而且全是零宽**：产物把修饰词记成 `modifiers="export,const"` 字符串，
我按字符串合成节点时一律写了 `pos = end = v.start`——于是整类节点的**终点差 5~9 个字符**。

修法：**每个修饰词的区间从原文里量出来**。能这样量是因为（探针确认过）
**带修饰词的节点，自己的起点就是第一个修饰词的起点**——实测 `Field[12,34]` 的
`modifiers="private,readonly"`，12 正是 `private` 的开头。所以从 `v.start` 起按顺序
`indexOf` 每个词即可。

用例语料 70.8% → **72.1%**，真实语料 71.9% → **74.2%**。

**方法上的收获**：与其「看到一个差异类修一个」，不如先按
「kind + 起点差 / 终点差」做一张**差值分布表**——它把**同一病因的所有症状**一次摊开，
这一轮的 5~9 字符之差全是同一条 `pos = end = v.start`。这张表以后每轮都可以先跑一遍。

### 第 23 轮：语句尾巴上那个换行（用例语料 65.8% → 70.8%）

`ExpressionStatement` 那 285 处，按探针归类之后只有两类，第二类占绝大多数且非常好修：

| 归类 | 例 | 说明 |
| --- | --- | --- |
| **区间差一位** | `A.x = 1`（无分号、下一行是 `}`） | 产物给 `[82,90)`，TS 给 `[82,89)`——**差的就是那个换行** |
| 没有节点 | `x => x [1, 2, 3]` | ASI 二义（`x [1,2,3]` 被读成数组下标），是解析形状问题，另算 |

根因：**本工程的语句区间含尾部的换行**（ASI 断句时那一行软换行算在语句里），
而 **TS 的语句从不含尾部 trivia**。所以给语句的投影终点加了一道
`stmtEndOf`（往回剪空白），`ExpressionStatement` 与 `VariableStatement` 都用它。

两个必须注意的口径（否则会修出新错）：

- **不能顺手剪分号**：TS 的语句**是含**分号的（`x = 1;` ⇒ `ExpressionStatement[0,6)`，
  含 `;`）——分号的归属只在 `let` 那三层的**内两层**上有另一套口径（`List` / `Declaration` 不含）；
- 因此 `let` 那边是**先剪 trivia、再看分号**（`stmtWhole` → `stmtEnd`），顺序反了会把
  尾随换行留在内两层上。

一处改动值 5 个百分点——语句是数量最多的一类节点，**尾巴上多一个字符就整类对不上**。

### 第 22 轮：点号链要折成 `PropertyAccessExpression`，**而且不能丢尾巴**

产物那边 `a.b.c` 是**平铺**的 `[a, ., b, ., c]`，而 `projectExpression` 原来按
「找第一个标点当运算符」处理——于是 `.` 被当成二元运算符，折出一个 `BinaryExpression`。
**两头都错**：TS 既没有那个 `BinaryExpression`，也没有 `.` 这个运算符节点
（TS 是左结合的嵌套 `PropertyAccessExpression`）。

同一轮把一元也分清前后缀：`y++` 的 TS 是 `PostfixUnaryExpression`、`-x` 是 `PrefixUnaryExpression`，
而产物两边都叫 `UnaryOperator op="…"`——判据是**运算符单元排在操作数之前还是之后**。

**这一轮最值得记的是中间那次「改对了却量出变差」**：折了点号链之后用例语料 +0.5，
但真实语料 **71.8% → 71.6%（掉了）**，节点总数一下少 5583 个。原因是链的分支写成
「折到链尾就 `return`」——`a.b(c)` 的链只到 `b`，**尾巴上那个实参括号连同里面的节点整片被丢掉**。
加一条「必须吃满整串才认这条链，否则退回去走通用形状」的守卫之后：
用例 65.8%、真实 **71.9%**，两边都超过了改动前。**宁可少折一层，也不能丢节点。**

### 第 21 轮：类型位要**递归投影**（真实语料 69.1% → 71.8%）

`TypeReference` 那 487 处的落点：缺的都发生在**类型实参里**（`X<string>`、`Map<string, Array<number>>`）。
原来 `projectTypeDefine` 只在冒号后面找一个 `Identifier` / `Keyword`——碰到 `GenericType` 就漏。

TS 的形状（`let a: Map<string, number>`）：

```
TypeReference[7,26)            ← `Map<string, number>`（**整个**）
  Identifier[7,10)             ← `Map`（**同一区间的第二层**）
  typeArguments: StringKeyword[11,17) NumberKeyword[19,25)
```

而产物那边是 `TypeDefine > [Identifier(Map), GenericType(<string, number>)]`——
`GenericType` 在那里的身份是**实参表**、不是节点。所以新增了一个递归的
`projectTypeExpression`，把三条规则收在一处：

1. 头是 `Identifier` / `Keyword`，后面跟 `GenericType` ⇒ `TypeReference` + `typeArguments`（逐段递归）；
2. 头是原始类型名 ⇒ **直接是关键字节点**（见 `PRIMITIVE_TYPE_KIND`，与第 18 轮同一条）；
3. 后面还跟 `ArrayType` ⇒ 再折一层 `ArrayType`——**TS 的 `ArrayType` 从基名起**
   （`Foo<Bar>[]` 是 `ArrayType[35,45) > TypeReference[35,38)`），而产物的 `ArrayType` 只盖住后缀那一段。

这一轮真实语料涨得最多（+2.7 个百分点），因为它以 `.d.ts` 为主——**类型密集**。
用例语料只 +0.4，它挑的是语法难点而不是类型难点。

### 第 20 轮：接口 / 枚举的名字单元，以及「两条路径都要写」

按上一轮定下的规矩（**先问「名字后面那个单元是什么」**），给 `Interface` 与 `Enum` 补名字单元。
两家的名字后面都是 `<` / `extends` / `{`，与 `Class` 同样安全，但仍统一用**稳的做法**
（`TryToClose()` 之后 `Data.unshift`），免得再踩一次 `Function` 那个坑。

两处值得记下来的：

1. **接口有两条解析路径**：带 `extends` 的走 `ScanHead`，不带的走 `Process` 里的内联分支。
   第一版只补了 `ScanHead`，于是 `interface J<T> extends K {}` 有名字单元、`interface I {}` 没有——
   量出来才发现（两种形状各自打一次 XML 就能看见）。
2. **期望值要跟着改**：`types/type-union-leading-bar-in-member` 记的是 `Identifier:3`，
   而 `interface I` 现在多一个名字单元 → 4。这是**有意的形状变化**，不是回归；
   `cases:run` 的「新增/过期」栏正是为这种情况设计的（改完仍是 1014 条全通过）。

用例语料与真实语料在这一轮都只小幅变化（64.9% / 69.1%）：
说明**声明名这一类已经不再是主要瓶颈**——缺口表首位仍是 `Identifier` 745 与 `TypeReference` 487，
它们更集中在 `BindingElement` / `PropertyAccessExpression` / 类型引用那几处。

### 第 19 轮：函数名进树要**绕过重组队列**（一次真踩到的坑）

沿用第 14 轮给 `Class` 的做法，把 `Function` 的名字单元收进 `Data`——**当场炸了**：

| 源码 | 期望 | 用 `AddAndCloseLast` 加名字的实际结果 |
| --- | --- | --- |
| `function f() {}` | `<Function><Identifier>f</Identifier>…` | `<Function><Method name="f"></Method>…` |
| `function* g() {}` | `<Function><Identifier>g</Identifier><SymbolToken>*</SymbolToken>…` | `<Function><BinaryOperator op="*">…` |

根因：名字（`f`）后面**紧跟参数表那个 `(`**，而重组队列里有一条
「`Identifier` + `Bracket(paren)` ⇒ `Method`（调用表达式）」的规则——加进去的瞬间就被当成一次调用。
`Class` 那边没这个问题**纯属运气好**：类名后面跟的是 `<` / `extends` / `{`。

修法是**绕过重组队列**：`result.TryToClose()` **之后**再 `result.Data.unshift(nameUnit)`。
那时本单元自己的重组已经跑完，`Data` 不会再被自己扫描一遍，位置又正好与 TS 的
`FunctionDeclaration.name`（排在最前的 `Identifier`）一致。匿名函数（`function ()` / `function* ()`）
的 `nameUnit` 不是 `Identifier`，自然不收。

**这一条是「改 token 层」的真实代价**：同一个手法在 `Class` 上成立、在 `Function` 上不成立，
差别只在「名字后面那个单元是什么」。以后给 `MethodDeclaration` / `Interface` / `Enum` / `Field`
补名字单元时，都要先问这一句。

用例语料 64.4% → **64.9%**（`Identifier` 826 → **745**）；真实语料基本不动（那批 `.d.ts`
里的函数大多是 `declare function`，另有路径）。

### 第 18 轮：原始类型**不套** `TypeReference`，而类型标注在**上一层**

两条都是实测出来的形状差（`NumberKeyword` 224 + `StringKeyword` 149 那 373 处）：

| 源码 | TS 的形状 | 我原来的做法 |
| --- | --- | --- |
| `let a: string` | `VariableDeclaration > [Identifier(a), **StringKeyword**]` —— 原始类型**直接**是关键字节点 | 一律套一层 `TypeReference`（多一层，且 kind 错） |
| `let b: Foo` | `VariableDeclaration > [Identifier(b), **TypeReference > Identifier(Foo)**]` —— 具名类型才有 `TypeReference`，且它在**同一区间**上又套一个 `Identifier` | 同左（这一半是对的） |

落点是一个 `PRIMITIVE_TYPE_KIND` 表：**在类型位上**才把 `string` / `number` 这些叫关键字。
它与 `KEYWORD_KIND` 的区别是语义而非内容——产物在类型位把 `string` 标成的是 `<Identifier>`，
所以同一个文本在值位与类型位的 kind 不同。

第二条更朴素：`let a: string;` 的产物是

```
Statement > [ Let(`let a`), TypeDefine(`: string`) ]
```

**`TypeDefine` 是 `Let` 的兄弟**，不在 `Let` 里面（`Field` 那种才在自身里面）。
TS 那边 `VariableDeclaration[4,13)` = `a: string`，`type` 挂在声明上——所以要从**外层**找它。
（第一次改时我按 `Field` 的样子往 `Let` 里面找，量出来没动，才发现这一层。）

用例语料 62.1% → **64.4%**，真实语料 61.3% → **69.1%**。

### 第 17 轮：`projectLet` 一直在读**外层的**属性

`VariableDeclaration` 那 505 处的根因很朴素：顶层形态是

```
Statement > [ Let(`const f`), SymbolToken(=), 初始化式 ]
```

`fieldName` / `modifiers` 在 **`Let` 子单元**上，而 `projectLet` 拿到的是外面的 `Statement`
（`projectStatement` 直接把容器传了下去），于是 `fieldName` 永远是空、名字位置一路退到 `const`。
**`List` 那一层完全看不出来**——所以第 15 轮我只核对了 `List` 就宣称「全部吻合」，是我的疏忽；
这一轮按缺口表回头查 `VariableDeclaration` 才发现。

同一轮顺带修了三处：

- `synthName` 的上界：`const f` 里那个 `f` **正好落在 `Let` 的末字符上**，
  用 `found < v.end` 会把它判成越界（`const f = <T>(x: T): T => x` 就是这一例）；
- 解构声明的**绑定模式区间**：产物只记了 `arrayPattern="a,1,b,a"` 这种**属性**（连括号都没记），
  所以从源码里把 `[` / `{` **配对扫出来**（宁可窄，不要凭空盖住整条声明）；
- `ArrayBindingPattern` / `ObjectBindingPattern` 的字段名 → `elements`。

用例语料 **57.4% → 62.1%**，真实语料 59.3% → **61.3%**。

### 第 16 轮：三处**文件边界**的口径，两处反直觉

`SourceFile` + `EndOfFileToken` 在缺口表里占 2000 个节点（TS 节点的 13%），一轮修掉之后
用例语料 44.4% → **57.4%**。三条口径都是实测出来的：

| 口径 | TS 的实际行为 | 我原来的做法 |
| --- | --- | --- |
| `SourceFile.getStart()` | **不是 0**，是**第一个 token 的位置**（前置注释与空行都算前导 trivia） | 写死 `0` |
| `SourceFile.end` | 文件长度（含尾部换行） | 对 |
| `EndOfFileToken` | 文件末尾的**零宽**节点（`pos === end === 长度`），且在 `forEachChild` 那层**可见** | **根本没发** |

而 `getStart()` 之所以是第一个 token 而不是 0，追下去发现**是我自己的产物多出了节点**：
`// xl:expect …` 这样的注释行在本工程里是一层 `Statement` 包着注释单元，
投影原来会退回一个 `ExpressionStatement@0`——TS 那边注释是 **trivia**、`forEachChild`
完全看不见。所以这一轮真正的修法是两条：

1. **只有注释的语句不是语句**：`projectStatement` 在没有可见子单元时返回 `undefined`
   （而不是退成一个空 `ExpressionStatement`），`projectEach` 跳过 `undefined`；
2. 根的起点取**第一个语句的起点**（与「本工程区间不含前导 trivia」这条既有约定一致）。

顺带：`ExpressionStatement` 在缺口表里的 285 处也降下来了——其中不少正是这些注释行。

### 第 15 轮：`Block` 那 335 处是**提层提掉的**

按尺子的缺口表动手，最大的一块是 `Block`。根因不是缺单元，而是**投影把体节点提层提掉了**：

| 产物 | TS | 早先的做法 | 现在的做法 |
| --- | --- | --- | --- |
| `FunctionBody` / `MethodBody` | `Block`（**是节点**） | 当包装，把内容提上去、节点本身不要 | 编成 `Block` 节点，父声明那边只改字段名（`body`） |
| `NamespaceBody` | `ModuleBlock` | 同上（`KIND_BY_TAG` 里明明有 `ModuleBlock`，却被提层那条抢先生效） | 编成 `ModuleBlock` 节点 |

于是投影里多了一张**`BODY_FIELDS`** 表，与 `WRAPPER_FIELDS` 的区别是：
**前者「改字段名但自己仍是节点」，后者「把内容提上去、自己不出节点」**。
这两件事以前混在一张表里，`Block` / `ModuleBlock` 就是被混掉的。

同一轮还按 TS 的口径修了 `let` 声明的**两层区间**（差一个字符就差一个节点）：

- `VariableStatement` 含尾部分号，`VariableDeclarationList` 与 `VariableDeclaration` **都不含**；
- `VariableDeclarationList` 从**最后一个修饰词**起（`export const q = 1` 的列表从 `const` 起，
  `export` 属于外层语句），`VariableDeclaration` 从**名字**起。

三处合起来：用例语料 41.3% → **44.4%**，真实语料 58.2% → **59.1%**，
`FunctionDeclaration` / `Block` / `ModuleBlock` / `VariableDeclarationList` 在逐格核对里**全部吻合**。

### 声明名的位置：从「投影层补偿」到「token 层记下来」

第 12 轮的一次实测把一类缺口查到了底：**缺的 `Identifier` 里绝大多数是「声明名」**
（按 TS 侧的父节点归类：`ClassDeclaration` 82、`VariableDeclaration` 33、`PropertyDeclaration` 30…）。
根因是产物把名字记成**属性**（`name="A"` / `fieldName="f"`），**没记它的位置**，
投影只能拿声明自己的区间去凑。

两次补偿（都记在 `synthName` 的注释里，症状不同）：

1. **别用声明开头当名字位置**：`export class A` 的声明从 `export` 起，名字在后面——
   用声明开头会让**整类名字的区间都错位**；
2. **搜索起点要推过修饰词**：光用 `source.indexOf(name, start)` 还不够——`const f` 里
   `f` 会在 **`const`** 里先被找到（同为 `f`）。所以先按 `modifiers` 找到最后一个修饰词的末尾再起找。

这两步把「同 kind 同区间」从 37.9% 抬到 **41.3%**。**但它终究是补偿**：
原文里那个名字到底在哪，只有词法层知道。

### 第 13–14 轮：把「解析时知道、却丢掉」的信息补回 token 层

按上一节的结论动了 token 层（本仓库第一次为这个目标改 `*.xl.md`）。**第一版做错了方向**，
第二版才对——这段弯路值得留着：

| 版本 | 做法 | 结果 |
| --- | --- | --- |
| 第 13 轮 | `Class` 加 `NameStart` / `NameEnd` 两个 `int` 字段，`ScanHead` 里把名字单元的两头抄下来 | 能用，但那是**把已经算好的东西再抄一遍**——等于绕过了「树里没有那个节点」这件事 |
| 第 14 轮 | **把名字单元本身收进 `Class.Data`**（`Identifier`，带自己的 `SourceRange`），删掉那两个字段 | 树与 TS 同形（`ClassDeclaration.name` 就是一个排在最前的 `Identifier` 子节点） |

拐点是一个提问：**「token 的 `SourceRange` 不是本来就记位置吗？」** ——是的。
`SignIn` / `SignOut` 会把范围填好，`TryToClose` 前面还有「两头不能是 null」的断言，
所以**能进树的单元一定带范围**。丢的从来不是范围，而是**那个单元本身**：
`ScanHead` 把名字记成 `TempToString()` 之后没把它收进 `Data`，重组结束时它随旧列表一起消失。
第 13 轮补的是「范围」，第 14 轮补的才是「单元」。

第 14 轮的实现要点（都写进了 `class.xl.md` 的注释）：

- 名字单元放在 `Data` 的**第一个**，与 TS 的 `ClassDeclaration.name` 的位置一致；
- 收与不收的判据只用**这个单元自己**（是 `Identifier` 且文本不是 `extends`）——
  `isAnonymous` 是 `ScanHead` 的局部量，`Process` 里取不到；这样 `class {}`（`Bracket`）、
  `class extends B {}`（文本是 `extends`）两种反例自动排除；
- 投影里 `structuralProps` **首选树里那个子单元**（按文本与 `name` 属性配对），
  `synthName` 的 `indexOf` 补偿降级为「还没补子单元的 token 的兜底」；
- 名字单元要从 `children` 那一趟里**排除**，否则同一个名字会被收两遍。

**实测：两版都没有移动 `cases:tsast` 的百分比**（两次都是 6313 / 41.3%）。
逐格核对了 `am-class-modifier-order.ts`：`export class A` 的 `A` 在 TS 与投影两侧都是 `[386,387)`——
`indexOf` 的旧法在这里碰巧也对，所以尺子看不见差别。这说明**这一类不是当前瓶颈**：
缺口表里 `Identifier` 那 1307 处主要不是类名。两版的价值在**正确性**：
`indexOf` 在「同一声明里有同名标识符」「修饰词里含名字片段」时必错，而树里那个单元不会错——
它也顺带把「同一区间两层节点」这类 TS 形状（`TypeReference > Identifier`）变成**可以照抄**的，
而不是每处都合成。

**这一段的教训**：补信息之前先问「它是真丢了，还是只是没被引用」。前者要补单元，后者只要接上引用。

字段名这一维是**逐轮涨**的，七轮的动作记在这里：

| 轮次 | 动作 | 用例语料字段名一致率 |
| --- | --- | --- |
| 第 4 轮 | 给尺子补上「字段名」这一维（此前只比 kind 与区间，改字段名一个数字都不动） | 63.3% |
| 第 5 轮 | ① 属性数组（`modifiers` / `imports`）不再被当成子节点字段；② `TypeAliasDeclaration` / `Parameter` / `TypeParameter` 补 `name` + `type`；③ 按 kind 改名的字段表 | 74.8% |
| 第 6 轮 | ① **`view()` 把标量属性也存下来**（这一条最关键）；② **包装节点提层**；③ 类型位三段的字段名 | 82.1% |
| 第 7 轮 | ① `ConditionalType` 按 `?` / `:` 切成四段；② `BindingElement` → `name`；③ **`GenericType` 条件提层**；④ `modifiers` 补成节点数组；⑤ `FunctionType` / `TupleType` / `EnumMember` | 86.4% |
| 第 8 轮 | ① `EnumMember` 补 `name`；② `PropertyDeclaration` 补 `initializer`；③ **去掉 `PrefixUnaryExpression.operator`**；④ `SpreadElement` → `expression`；⑤ `ConditionalExpression` 改用 `whenTrue` / `whenFalse` | 88.4% |
| 第 9 轮 | 修 `ClassDeclaration` / `InterfaceDeclaration` 的字段映射 + 查清「表里重复定义 kind 会静默覆盖」 | 89.0% |
| 第 10 轮 | ① `ArrowFunction` 补 `equalsGreaterThanToken`（**合成**）；② `ConditionalExpression` 补 `questionToken` / `colonToken`（**合成**）；③ 分段取值要**先摊平包装**（`TernaryOperatorCondition` 那一层） | 89.5% |
| 第 11 轮 | ① `NewExpression` 的 `name` → `expression`；② `FunctionType` 切成 `parameters`（**摊平括号**）+ `type`；③ `TypeParameter` 补 `constraint` / `default` / `modifiers`——其中 `in` / `out` 变型修饰词要**按两种词法身份认**（`in` 是 `Keyword`、`out` 是 `Identifier`） | 90.9% |
| 第 12 轮 | **查清「缺的 Identifier 大多是声明名」**，并在投影层做两次位置补偿（① 别用声明开头 ② 搜索起点推过修饰词）；字段名顺带涨到 92.2% / 95.0% | 92.2% |
| 第 13–14 轮 | token 层：`Class` 的名字单元收进 `Data`（第 13 轮先做成了两个 `int` 字段，第 14 轮改回真单元）；投影首选树里的子单元 | 92.2% |
| 第 15 轮 | 投影层：**`Block` / `ModuleBlock` 不再被提层**（新增 `BODY_FIELDS`），`let` 的两层区间按 TS 口径剥分号 / 推修饰词 | 93.5% |
| 第 16 轮 | 投影层：**文件边界**三处（`SourceFile.getStart` 取第一个 token、`EndOfFileToken` 零宽补发）＋**只有注释的语句不收**（TS 那边是 trivia） | **95.0%** |
| 第 17 轮 | 投影层：`projectLet` 原来一直在读**外层 `Statement`** 的属性（`fieldName` 在 `Let` 子单元上）＋ `synthName` 上界 ＋ 解构绑定模式区间 | 94.8% |
| 第 18 轮 | 投影层：原始类型**不套** `TypeReference`、类型标注在**上一层**（`TypeDefine` 是 `Let` 的兄弟） | 95.2% |
| 第 19 轮 | token 层：`Function` 名字单元进树（**踩到重组队列**，改用 `TryToClose()` 之后 `unshift`） | 95.2% |
| 第 20 轮 | token 层：`Interface` / `Enum` 名字单元进树（**接口有两条路径，都要写**）＋ 更新一条过期期望值 | **95.2%** |
| 第 21 轮 | 投影层：**类型位递归投影**（`projectTypeExpression`）——类型实参、数组后缀、原始类型三条规则收在一处 | **95.2%** |
| 第 22 轮 | 投影层：点号链折成 `PropertyAccessExpression`（**并且不能丢尾巴**）、一元分前后缀 | **95.2%** |
| 第 23 轮 | 投影层：**语句尾巴上的换行**要剪（`stmtEndOf`）——产物语句含尾部 trivia、TS 不含；注意分号归属的先后顺序 | **95.3%** |
| 第 24 轮 | 投影层：**修饰词的区间从原文量出来**（原先是零宽，整类终点差 5~9 字符）；方法上改用「kind + 起止差值」分布表一次量完 | **95.4%** |
| 第 25 轮 | 投影层：点号链**先折、再当左操作数**（第三个版本才对）＋链尾调用的切法；语句族按 **kind 名后缀**统一剪尾部 trivia | **95.1%** |
| 第 26 轮 | 投影层：**标签折叠**（产物里 `Label` 与语句是平级、TS 是包住）＋ `projectLetFrom`（`for` 头部的列表不套 `Statement`）；尾部 trivia 改成**一律剪** | **95.2%** |
| 第 27 轮 | 投影层：类型位的点号名折成 **`QualifiedName`**（值与类型位同名不同 kind）＋ `VariableStatement` 的语句级 `modifiers` | **95.4%** |
| 第 28 轮 | 投影层：解构声明**用产物自己的 `ArrayLiteral` / `ObjectLiteral`** 当绑定模式（原先是自己造的空壳）＋ `BindingElement` 三形态 | **95.6%** |
| 第 29 轮 | 投影层：`ExpressionWithTypeArguments` 切 `expression` + `typeArguments`；`SwitchStatement` 合成 `CaseBlock`；`TypeParameter` 找名字时**排掉修饰词**（`out` 是 `Identifier`） | **96.0%** |
| 第 30 轮 | 投影层：**签名上下文**（接口 / 类型字面量的成员是 `PropertySignature` / `MethodSignature`）＋ `?` 切成 `QuestionToken` 子节点；`MethodDeclaration`/`MethodSignature` 补 `parameters` | **96.1%** |
| 第 31 轮 | 投影层：运算符定位认 **`in` / `instanceof` 是 `Keyword`**（原来只认 `SymbolToken`，整类丢两侧）；两侧皆无时**不发空壳** `BinaryExpression` | **96.2%** |

**第 10 轮的关键认识：有些 TS 子节点在产物树里根本没有单元，只能「合成」。**
`Lamda` 只收 `parameters` 与 `body` 两段——**`=>` 不是一个 token 单元**；
`TernaryOperator` 只收三段——**`?` / `:` 也不是**。而 TS 那边这三个都**在** `forEachChild`
那一层（`equalsGreaterThanToken` / `questionToken` / `colonToken`）。所以投影要按相邻两段的位置
**算**出它们的位置——`endOf(前一段)` 只是那个标点位置的下界（前面可能还有空白），
**位置是估算的、字段名是准的**。这一条与第 7 轮的 `ConditionalType` 正好相反：
类型位那两个标点 TS **不收**，值位这两个**收**。同形不同口径，是这一带最容易写错的地方。

**第 6 轮那条最关键的 bug**：`view()` 原来只把**数组**存进 `segments`，
**标量属性（`name` / `fieldName` / `op` / `modifiers` / `namespace`）全被丢掉**——于是「按属性给 `name`」
那条规则**从未生效**：投影出来的类 / 接口 / 方法全部没有 `name` 字段，
而尺子报的是「TS 多了 `name`」这种看不出根因的差异。修好之后 `unmapped` 也清空了。

**第 7 轮那条最需要小心的**：`GenericType` **不能无条件提层**。它既可能是类型参数段
（`type A<T> = …` 的 `<T>`），也可能是类型实参（`Array<T>` 的 `<T>`）——
前者是包装（内容进 `typeParameters`），后者是**真节点**（投成 `TypeReference`）。
判据用「里面有没有 `TypeParameter`」：类型实参里不会出现它。搞错这一处会**凭空少一片节点**。

**已知的不精确（如实记在这里）**：`modifiers` 是按字符串补出来的节点数组，
**位置是合成的**（宽度为零、落在声明开头），因为产物没记每个修饰词的区间。
字段名与数组形状对得上，区间对不上——尺子比的是字段名，所以这里「够用但不算精确」。

剩下字段名不一致的按次数排前面的是：`FunctionType`（缺 `type`）、`PropertyDeclaration`（缺 `initializer`）、
`MethodDeclaration`（缺 `body`）、`EnumMember`（缺 `name`）、`SwitchStatement`（vs `caseBlock,expression`）、
`PrefixUnaryExpression`（产物多了 `operator`，TS 那边运算符是节点属性不是字段）。

### 缺口（TS 有、产物没有）

按 kind 聚合的前几名，正好是三类东西：

| 缺什么 | 例 | 为什么缺 |
| --- | --- | --- |
| **语句 / 声明壳**：`VariableDeclarationList` `VariableStatement` `ExpressionStatement` `Block` `PropertySignature` `MethodSignature` `Parameter` | `let x = 1` 在 TS 那边是三层（语句 → 声明列表 → 声明） | 本工程把它们摊成了 `Statement` + `Let`，中间那两层壳没有节点 |
| **类型引用**：`TypeReference` `QualifiedName` | `T` / `A.B` | TS 那边 `T` 是**同一个区间上两层节点**（`TypeReference` 套 `Identifier`），本工程只有一个标识符节点 |
| **叶子按值分名**：`NumericLiteral` `StringLiteral` `EndOfFileToken` | `1` / `"big"` / 文件末尾 | 本工程的 `Identifier` 是「标识符 + 数字 + 布尔」的通用文本块，`SymbolToken` 是符号块——**一类对 TS 的多类**；文件末尾也没有节点 |

`SourceFile` 也一直挂在缺口上：TS 的语义节点是 `SourceFile` 的**子节点**那一层，
而本工程的 `Root` 在产物里是一个元素，比对时**根那一格对不上**（固定每文件 1 处）。

另外两处必须知道的口径（都是 TS 自己的坑，不是本工程的）：

- **枚举别名**：`ts.SyntaxKind[node.kind]` 会给出 `FirstStatement`（其实是 `VariableStatement`）、
  `FirstLiteralToken`（`NumericLiteral`）、`FirstCompoundAssignment`（`PlusEqualsToken`）、
  `ThisType`（`ThisKeyword`）、`LastTypeNode`（`ImportType`）这类别名——**同一个枚举值印出错误的名字**。
  `cases:diff` / `cases:align` 早就为这一类打过补丁；这一把的做法是把它们**换回真名**
  （`TS_KIND_ALIASES`），否则「本工程缺什么」和「TS 印错了什么」会混在一起。
- **`pos` vs `getStart()`**：TS 的 `pos` **含前导 trivia**（注释、空白），`getStart()` 才是实义起点；
  `end` 是开区间。本工程的 `SourceRange` 是**闭区间**且不含前导 trivia，所以坐标换算只有一条：
  `[Start.Index, End.Index + 1)` ↔ `[getStart(), end)`。实测样板：`VariableDeclaration` 的 `pos=3`
  而 `getStart()=4`（`let answer` 里 `answer` 前面那个空格）。

```bash
node tests/parse/ts-ast.mjs cases --top 12 --samples 1   # 用例语料，约 2 秒
node tests/parse/ts-ast.mjs real                         # 真实语料，约 50 秒
```

### 坐标完整性（地基）

**它顺带量一件地基上的事：坐标完整性。** TS 的每个节点都带 `pos` / `end`，
所以「投影成 TS 形状」的先决条件是**产物每个节点都有区间**。这条以前不成立——
`range` 原来只在 `ToList()` 那一层补，`children` 里的节点一个坐标都没有。
第 70–71 轮把它清干净了，一路踩了三个坑，都记在这里：

1. **必须以 `ToDictionary()` 的结果为底**，不能从 `Data` 重新拼——重拼会把叶子的 `value`、
   `Import` 的 `imported` 这些**不在 `Data` 里的键**全丢掉（`cases:astjson` 当场报出
   1000 个文件「XML 有文本、JSON 是空串」）。
2. **字典项与子单元要按类型名配对，不能按下标**。段数组有两种形态：摊平的
   （`While.body` 装的是段元素的**内容**）与不摊平的（`Switch.segments` 装的就是段元素本身），
   按下标配对会在摊平那一侧整段失配——**255 个节点缺坐标全是这一类**。
   同一个集合里还有同名的多个节点（`Statement` 里两条 `Identifier`），所以要**边配边销**。
3. **终点缺失时要能从子节点兜底**。`else if` 的 `IfSegment` 只有起点、终点从来没签过
   （`End` 兜底成 `0`），父区间于是是 `[55,0]`、比所有子节点都小——**18 处「子节点区间越界」全是它**。

现在两个语料都是 **缺 range 0 / 区间越界 0**（用例 18896 个节点、真实 555415 个节点）。
这一块是下一步做「kind 集合对齐」的前提，所以它与 kind 缺口并列打印。

性能上有一条硬要求：**不许经过 `JSON.stringify` / `JSON.parse`**。第一版走的是 `ToJsonString()`，
每个文件把整棵树序列化一遍再解析回来，真实语料要跑十分钟以上；改成直接用 `ToList()` 的 Map
之后是 2 秒 / 50 秒。这把尺子的价值在于**能反复跑**，慢十倍就等于不会跑。

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
