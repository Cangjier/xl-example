# 逐格比较：XML 与 JSON 摊平对齐 → 定「动哪一格」

**目的**：`README.md` 量的是「形状差多少」，这一份要回答的是**「差在谁身上、该动 token 还是动投影」**。
每一格都拿三条证据对齐看：**出口 1（XML）**、**出口 3（`--ts-ast`）**、以及那一格自己的 `PrintAst` 代码。

工具：`node tmp/pa-flow.mjs <token> [用例前缀]`
它把两棵树**按区间配在一起**（XML 的 `range="[起,止]"` 是闭区间，AST 的 `pos/end` 是半开，
所以按 `起` 与 `止+1` 配），逐行打印「这个产物节点变成了哪个 AST 节点 / 还是压根没成节点」，
再把「AST 有、产物那棵树上没有对上的」单独列一遍。

## 0. 一条必须记住的系统差：闭区间 vs 半开区间

产物 `range` 是**闭区间** `[起, 止]`（含止），TS 的 `pos/end` 是**半开区间** `[起, 止)`

| 用例 | 产物首格 | TS 首格 | 长度 |
| --- | --- | --- | --- |
| `array-literal/01-two-elements` | `[0,5]` | `[0,6)` | 6 / 6 |
| `array-literal/02-empty` | `[0,1]` | `[0,2)` | 2 / 2 |
| `let/01-simple`（`VariableDeclaration` 那一格） | `[0,12]` 的 `Let` 自己 | `[4,13)` | — |

**这条差不需要「修」，但它会污染读数**：`array-literal` 那两格的产物与 TS **长度完全一样**，
所以「多一个 `Bracket` 节点」那种说法是**错的**（我先前误记过一次，见本文件末尾的订正）。
`if (起 === 起 && 止 + 1 === 止)` 这一套配对口径就是为了把这条差从读数里去掉。

## 1. 优先级一：token 已经算出来了，却没印出去

**判据**：这一格在**成形期**已经算过答案（字段在手），但 XML / JSON 里没有它，于是投影只能**重新推**。
本仓自己的口径是「token 出字段、投影直读」——这几格是那句话漏掉的地方。

### 1.1 `Method.ParenAt`（最干净的一处）

```ts
// method.xl.md 第 227 行：成形期当场记下实参表那个 `(` 的位置
method.ParenAt = bracketUnit.SourceRange.Start!.Index;
```

- **`## field ParenAt:int = -1`**（第 595 行）在类上；
- `ToDictionary` 里 `result.ParenAt = this.ParenAt`（第 684 行）**在 `Clone` 里**，不是印出去；
- `ToXmlString` 只印 `name`（第 649 行）：`<Method range="…" name="f">`；
- 于是投影只能回原文找：`method.xl.md` 第 502–520 行那段——
  `const parenAfterCallee = this.ParenAt;` 读的是**投影自己上下文里的 `ParenAt`**，
  而第 601 行那条注释写着另一处从前是 `ctx.source.indexOf("(", calleeEnd)`「**那是第二份位置答案**」。

**动作**：`Method.ToXmlString` 印 `parenAt`、`Method.ToDictionary` 补 `parenAt` 键；
配对：投影那一支直接读字段，把回原文找 `(` 的那条路删掉。
**验收**：`cases:tsast`（`expr-optional-call-nodes` / `expr-nonnull-callee` / IIFE 那几条）+ `cases:astjson`。

### 1.2 `Method` 的被调用者被降级成字符串

```ts
// method.xl.md 第 224–237 行
if (nameUnit instanceof Identifier) {
  method.name = nameUnit.TempToString();      // ← 只留了文本
} else if (nameUnit instanceof Bracket) {
  method.AddAndCloseLast(nameUnit);           // ← 括号类的被调用者**留了节点**
} else if (nameUnit instanceof Method) {
  method.AddAndCloseLast(nameUnit);           // ← 内层调用**留了节点**
}
```

对齐视图（`method/01-one-arg`，源码 `f(x)`）：

```
<Method range="[0,3]" name="f">  → CallExpression
  <Identifier range="[2,2]">x          → Identifier
AST 有、产物没有：[0,1] Identifier     ← 被调用者那个节点整格不在产物里
```

`nameUnit` 是 `Identifier` 那一支**只有它没进 `Data`**，另外两支都进了。
于是投影只能 `calleeEnd = v.start + calleeText.length` 反推终点——`f` 是单字符才刚好对，
而 `name` 里装的**没有长度语义**（换行、Unicode、`$` 都得另说）。

**动作**：`Identifier` 那一支也 `AddAndCloseLast(nameUnit)`，`name` 标量留着不删（两级出口的断言核它，
且「名字为空」这件事靠它表达）。被调用者从此是**第一格子单元**，
与「括号被调用者 / 内层调用被调用者」那两支**同一条路**。
**验收**：`expr-nonnull-callee`、`expr-optional-call-nodes`、`f()()`、`a.b(c).d`、`this.#n` 那一族。

### 1.3 同类：`Class` / `MethodDeclaration` / `Field` 的 `name`

三处都是 `name="C"` / `name="m"` 这种**标量加区间旁证**，而 `PrintAst` 里要**合成一个 `Identifier` 节点**：

```ts
// field.xl.md 的 PrintAst 那一支（同类写法）
const nameStart = v.attrs.get("nameStart");
const nameEnd = v.attrs.get("nameEnd");
```

`Let` 那一格已经把这条走到了半步：`field fieldName` + `NameStart` / `NameEnd` **都印**
（`ToDictionary` 第 177–180 行那条注释写着「投影合名字节点时直读，不再回原文 `indexOf` 猜」）。
所以对 `Let` 来说这不是要修的东西，是已经修过的样板。

**动作**（要不要做取决于收益）：按 `Let` 那条口径给这三格补位置字段，**或者**学 1.2 直接留节点。
两条路都行，**不能一半留节点一半留标量**——本轮先不动，登记在这里。

## 2. 优先级二：区间口径差（投影在补偿，不是缺陷）

`let/01-simple` 的实测：

```
<Let fieldName="x" modifiers="let" range="[0,4]">   → **没有对应的 AST 节点**
AST：VariableDeclaration [4,9)   ← 从名字起，不含 `let `
```

产物的 `Let` 区间**含前导 `let `**，TS 的 `VariableDeclaration` **从名字起**
（`print-ast-common.xl.md` 第 87–92 行写着这一条，并且说明投影要把起点推到第一个子节点）。
所以这一格的「对不上」是**两条口径的差**，不是丢了东西；投影那一层已经在补偿。

**动作**：**不动**。但它是「`TS 有产物没有`那一栏里有多少是假信号」的样板——
看那一栏时要先问一句：这是丢节点，还是闭区间/前导 trivia 的口径差。

## 3. 优先级三：flat 是**刻意**的，搬不动（也不该搬）

| 那一格 | 产物 | TS | 为什么留着 |
| --- | --- | --- | --- |
| `BinaryOperator` / `LogicalOperator` | 嵌套已经与 TS 一致（8/8 内核同形） | `BinaryExpression{left, operatorToken, right}` | 差的是「平 `children` → 具名三格」；`op` 里装的是产物自己的词（`And` 对 `AmpersandAmpersandToken`） |
| `PropertyAccess` | 一串 `Identifier . Identifier`（**平**） | 嵌套的 `PropertyAccessExpression` | `PrintAst` 只有一句 `ctx.Expression(...)`；折链在投影层，是第 181–198 轮搬完之后刻意留的形状 |
| `NullConditionalOperator` | `Identifier` + `NCO` **两个平级兄弟** | 一条 `PropertyAccessExpression` + `QuestionDotToken` | 同上；归属（谁是被调用者、`?` 落在哪）**token 层按文本判不出来** |
| `ArrayLiteral` | `children` 是元素（逗号也在里面） | `elements`（具名） | 闭/半开区间已对上（长度 6/6、2/2），只差具名 |

**动作**：这一档的结论是**不搬形状**，只搬**归属**（1.1 / 1.2 那两条）。
理由写在 `README.md` 的「加一格」那节与 `typescript/print-ast-common.xl.md` 的表头：
token 层只能记「文本上可知的事实」，把 AST 形状搬下去等于在 token 层再长一个 `print-ast-common`。

## 4. 一张定案表

| # | 格子 | 差额 | 动谁 | 判据 |
| --- | --- | --- | --- | --- |
| 1 | `Method.ParenAt` | token 记了、**两级出口都没印** | **token**（两处拼串各加一个键）+ **投影**（改成读字段） | `cases:tsast` + `cases:astjson` |
| 2 | `Method` 被调用者 | `Identifier` 那一支没进 `Data` | **token**（一行 `AddAndCloseLast`） | `cases:tsast`，重点看 `f!()` / `x?.y?.(1)` / `f()()` |
| 3 | `TernaryOperator` 的 `questionPos` / `colonPos` | 只印下标、没印节点 | token（登记；与 ②/④ 同一条口径） | `cases:tsast` 的 `ternary` 一族 |
| 4 | `Class` / `MethodDeclaration` / `Field` 的 `name` | 标量 + 区间旁证 | token（先登记，本轮不做） | 同上 |
| 5 | `Let` 区间含 `let ` | 口径差，投影已补偿 | **不动** | — |
| 6 | flat 那几格 | 刻意的形状 | **不搬形状**，只搬归属 | 第 1 条与第 2 条做完再看 |

## 4b. 其余各格的逐条读数（同一条对齐视图，未逐格展开成上文那种长条目）

| 格子 | 产物（XML） | TS（JSON） | 结论 |
| --- | --- | --- | --- |
| `array-literal` | `<ArrayLiteral range="[0,5]">` 里是 `Identifier , Identifier` | `ArrayLiteralExpression{elements}`，`[0,6)` | 长度一致 ⇒ **不差壳**；只差具名（§3）。空数组那格 `[]` 两边都是 2 字符 |
| `unary-operator` | `<UnaryOperator op="-">` 里 **`SymbolToken` 在前**、操作数在后 | `PrefixUnaryExpression{operand}`（**没有**运算符节点） | 形状一致（内核同形）；`op` 是标量属性、运算符那格是个**多余**的 token ⇒ 投影要按 `op` 定 kind 并**丢掉**符号格 |
| `logical-operator` | `<LogicalOperator op="And">`，与 `BinaryOperator` 同构 | `BinaryExpression{left, operatorToken, right}` | 同 `BinaryOperator`（§3）；额外一格：`op` 装的是 **`And`/`Or`**（不是 `&&`/`\|\|`），投影要翻译回 `AmpersandAmpersandToken` |
| `not-null` | `<NotNull>` 里是 `Identifier` + `SymbolToken(!)` | `NonNullExpression{expression}` | 形状一致（内核同形）；`!` 那格在 TS 里不是节点 ⇒ 投影丢掉它 |
| `string` | `<String interpolation=… verbatim=… raw=…>` 里是 `ConstString` / `InterpolationString` | `StringLiteral` / `TemplateExpression{head, templateSpans}` | 模板那格产物是**平的三格**（`ConstString InterpolationString ConstString`），TS 是 `head` + `spans` ⇒ **投影重建结构**（与链同类，不是丢信息） |
| `new` | `<New name=[Identifier] arguments=[Identifier]>`（**都是具名段**） | `NewExpression{expression, arguments}` | 段名只差 `name` 对 `expression`；内核同形 ⇒ **一格改名就够**（投影已做） |
| `ternary-operator` | `<TernaryOperator questionPos colonPos>` + `condition`/`trueStatement`/`falseStatement` 三个**具名段** | `ConditionalExpression{condition, questionToken, whenTrue, whenFalse}` | 具名段已经就位；差的是段**名**（`trueStatement`→`whenTrue`）与两个 token 位 ⇒ 投影只做改名 |
| `lamda` | `<Lamda async arrowAt>` + `parameters` / `body` 具名段 | `ArrowFunction{parameters, body}` | 内核同形；`async` 是标量（TS 那边是 `modifiers` 里的 `AsyncKeyword`）⇒ 投影按 `async` 造一个节点 |
| `function` | `<Function name modifiers>` + `Identifier` + `Bracket` + `FunctionBody`（**平**） | `FunctionDeclaration{name, parameters, body}` | 名字是标量、参数括号是 `Bracket` 节点 ⇒ 投影改名 + 提层 |
| `class` | `<Class name extends implements modifiers>` + `ClassBody` | `ClassDeclaration{name, members}` | 名字是标量、`ClassBody` 是 TS 没有的壳 ⇒ 投影造名字节点 + 提层 |
| `property-access` | 一串平子格 | 嵌套 `PropertyAccessExpression` | §3：折链在投影层 |
| `null-conditional-operator` | `Identifier` + `NCO` 两个平级兄弟 | `PropertyAccessExpression` + `QuestionDotToken` | §3：归属要投影判 |
| `generic-type` | `<GenericType startBracket endBracket>` + 类型实参 | `TypeReference{typeName, typeArguments}` 或 `TypeParameter` | **`startBracket`/`endBracket` 已经是字段**（不用猜）；差的是「这一段是参数段还是实参段」──成形时 `ScanArguments` 分过档，投影又按子单元 `TypeParameter` 重判一次（§1.3 的同类） |
| `binary-operator` | 嵌套，与 TS 一致 | 同上 | §3 |

**从这张表能读出一条总规律**：**形状已经对上的那些格（`unary-operator` / `not-null` / `lamda` /
`ternary-operator` / `new` / `array-literal` / `binary-operator`），差额全都落在「具名」与「标量当节点」两栏**；
而**形状没对上的只有三格**：`property-access` / `null-conditional-operator` / `string` 的模板 ── 那三格是**投影在重建结构**，
不是 token 丢了信息。

## 4c. 同一族的四格：位置已经记下，却只印成一个标量

`Method.ParenAt` 不是孤例。对齐视图与探针一起看，**同一句话在四格上重复出现**：
成形期手上就有那个单元（或它的下标），但两级出口只印一个标量，于是投影把那个节点**再造一遍**。

| 格子 | 成形期手上的东西 | 出口印出来的 | TS 要的节点 | 序号 |
| --- | --- | --- | --- | --- |
| `Method` | `bracketUnit`（实参表那个 `(`） | `parenAt` **连印都没印** | 实参表的区间（投影现在回原文 `indexOf("(")` 猜） | ① |
| `Method` / `Class` / `MethodDeclaration` / `Field` | `nameUnit`（那个 `Identifier`） | `name="f"`（**纯字符串**） | `expression` / `name` 那个 `Identifier` | ② |
| `TernaryOperator` | `questionPos` / `colonPos` 两个下标 | 两个**纯标量** | `questionToken` / `colonToken` 两个节点 | ③ |
| `Let` | `fieldName` + `NameStart` / `NameEnd` | 标量 + **两个位置字段** | `VariableDeclaration.name` | ④（**已经修过的样板**） |

`Let` 那一格是**这一族该怎么做的样板**：名字是标量、位置另出两个字段，投影直读，**
不再回原文 `indexOf(fieldName)` 猜**（`let.xl.md` 第 98–110 / 177–180 行亲口写着这件事）。

**所以这一族的动作收敛成一句话**：凡是「成形期手上就有那个单元」的地方，
**要么把它作为子单元留下（像 `Method` 的 `Bracket` / `Method` 那两支），
要么像 `Let` 那样把位置字段印全** —— 不许只印一个**没有位置语义的字符串**。
四格里 ① 是「什么都没印」、② 是「只印了文本」、③ 是「只印了下标」、④ 是「印全了」。

**先做 ① 与 ②**（同一格 `Method`，一处改动覆盖两条），因为它们已经被实测钉住：
`f(x)` 的产物树里真的没有那个 `Identifier`（对齐视图第一栏），
而 `ParenAt` 真的躺在字段上没出去（`method.xl.md` 第 227 行赋值、第 649 行只印 `name`）。

## 4d. `TokenField` 是这一族**已经有的**机制——缺的是「两级出口都印」

用户口径（第 987 轮，四）：「像 `name="f"`，这类改成 `TokenField`」。查下来它不是要新造机制，
**机制已经在用**（`core/syntax/token-field.xl.md`，第 641 轮起 `BodyBrace` 那一批全换成了它）：
`TokenField<T>` = **值 + 它在源码里的区间**，而且它的类注释第 22–23 行**明确写了为什么字段里不放那个节点**：

> **为什么不是让字段直接持那个单元**：单元一旦留在 `Data` 里就是个 XML 子节点，
> 而 meta 信息进 `Data` 正是要避免的那件事。要的是**值 + 区间**这两样事实，不是那个节点本身。

所以这一族**不该**改成「留节点」，该做的是**把区间也印出去**。以 `Class` 为例（`class.xl.md`）：

| 处 | 代码 | 出来的是什么 |
| --- | --- | --- |
| 字段 | `## field name:TokenField<string>`（第 577 行） | 值 + 区间**都在手上** |
| XML | `<Class name="${this.name.Text()}">`（第 640 行） | **只有值** |
| JSON | `result.set("nameStart", …)` / `nameEnd`（第 668–669 行） | **值 + 区间** |

投影那侧（`print-ast-common.xl.md` 第 506–507 / 554–556 行）已经写着：

> `Field` / `MethodDeclaration` 都在认下名字那一刻把它的下标记成 `nameStart` / `nameEnd`……
> **有这对字段就不做任何猜测**，下面那套补偿一步都不跑。

**于是这一族的动作是机械的两条**：

1. **凡是 `TokenField`，XML 也印它的区间**（`nameStart` / `nameEnd` 这种名字，与 `Let` 同一套）。
   改的只是各 token 的 `ToXmlString` 多两个属性，**投影一行都不动**——它「有就不猜」的分支早就写好了。
   `cases:astjson` 只核「XML 属性都在 JSON 里」，反方向没核，所以这一处漏了没人响（本轮补的 §4b/§4c 之后，
   XML 与 JSON 的对称性才进了视野）。
2. **`TokenField` 表达不了的才留子单元**：`Method` 的实参括号（`ParenAt` 是 `int`，不是区间，
   要改成记区间或另加一格）、`Method` 的被调用者（TS 那边要的是**表达式节点**，
   而声明那几格根本不需要「节点」这个形状）。判据：**TS 那边要节点 ⟺ 留子单元；只要位置 ⟺ 用 `TokenField`**。

### 4d-1 全仓 `TokenField` 的扫面（生成器 `tmp/pa-tf.py`）

| 文件 | 字段 | XML 出区间 | JSON 出区间 |
| --- | --- | --- | --- |
| `class` | `name` | **已补（第 987 轮四）** | 有 |
| `class` | `extends` / `implements` / `modifiers` | — | — |
| `enum` | `name` | **缺** | 有 |
| `interface` | `name` | **缺** | 有 |
| `if-segment` | `BodyBrace` | — | 有 |
| `field` | `NameAt` | — | — |
| `try` | `TryBrace` / `CatchWord` / `CatchBrace` / `FinallyWord` / `FinallyBrace` | — | — |
| `foreach` / `for` / `while` / `do-while` / `lamda` | `BodyBrace` | — | — |

两条读法：

- **`name` 这一族（`class` / `enum` / `interface`）才需要印**：投影要合一个 `Identifier` 节点，
  名字的区间是它唯一的落点。`class` 已经补上；`enum` / `interface` 是**同一处漏**，各差两个属性。
- **`BodyBrace` / `TryBrace` 那一族不印是对的**：那些是**配对用**的位置（投影拿它去原文里找配对的括号），
  不是「某个 AST 子节点的落点」。所以别照抄「凡是 TokenField 都印」——
  判据是**这一格的区间要不要落到 AST 的一个节点上**。

`class` 这一格的试点已经做完并过门：出口 1 现在印 `nameStart="22" nameEnd="22"`（对 TS 的
`Identifier [22,23)`），**出口 3 一个字节没变**，九道门全绿。

### 4d-2 第 987 轮（五）：「两个出口的键名表必须一样」——账本清空

按用户口径（「2. `toxmlstring` 也要把属性打印齐全」）做了一次全仓对账（生成器 `tmp/pa-keys.mjs`：
逐 token 比 **JSON 的键** 与 **XML 开标签的属性**）。改之前 **20 个文件有差**，改完只剩 4 处
`value`（**误报**：叶子节点的 `value` 就是元素文本本身，XML 用「标签里的文本」表达、TS 用 `text` 键，
本来就不该是属性）。

本轮补齐的（条件**逐字照抄各自的 `ToDictionary`**，取值用同一个字段——两处各写一个条件就是两份口径）：

| 格子 | 补的属性 |
| --- | --- |
| `enum` / `interface` | `nameStart` / `nameEnd`（与 `Class` 同款） |
| `class` / `enum` / `function` / `interface` / `method-declaration` | `modifierSpans` |
| `method-declaration` / `type-assign` / `namespace-export` | `nameStart` / `nameEnd` |
| `type-assign` | `modifierSpans` |
| `let` | `nameStart` / `nameEnd` / `modifierSpans`（**投影合名字节点的样板，自己却没印**） |
| `field` | `nameStart` / `nameEnd` / `nameAt` / `nameRange` / `modifierSpans` |
| `namespace` | `nameAt` / `nameEnd` / `nameRange` / `modifierSpans` |
| `if-segment` | `ifWordAt` / `bodyBraceAt` / `emptyBodyAt` / `bodyBraceRange` |
| `switch-segment` | `colonPos` |
| `import` | `typeWordAt` |

`cases:astjson` 那一门顺带给出读数：**「JSON 比 XML 多出来的键」从 37 种降到 34 种**，
六项全 0。**没有一条投影代码要改**——它读的本来就是那对属性（`v.attrs.get("nameStart")`），
此前只是 XML 那一半没印。

**踩到的一处**：`Interface.modifiers` 是**纯字符串字段**（`## field modifiers:string`），
不是 `TokenField`——照 `Class` 抄成 `this.modifiers.Text()` 会当场抛
（`cases:astjson` 报 153 处 `this.modifiers.Text is not a function`）。
**同一个名字（`name` / `modifiers`）在不同 token 上可以是两种类型**，抄之前要看那格的字段声明。

## 5. 订正：我先前记错的两处

1. **「`ArrayLiteral` 多一个 `Bracket` 节点」——错。** 对齐视图与闭/半开区间一比就露了：
   产物与 TS 的长度**完全一样**（`[1, 2]` 6/6、`[]` 2/2），不存在多余的括号节点。
   那个读数来自 `run.mjs` 的「真括号」那一栏，它数的是**产物有真括号节点**这件事本身，
   不是「多出来的节点」——两件事不要再混着读。
2. **「`Method` 的被调用者整格消失」——准，但要说全**：只有 `Identifier` 那一支丢，
   `Bracket` / `Method` 两支是留着的（见 1.2 的代码）。所以修法是**补齐一支**，不是新造机制。
