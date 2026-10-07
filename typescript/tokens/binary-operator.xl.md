# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol, StartsWithTemplate } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { CommonUtil } from "../../core/common-util.xl.md"
import { IsWordUnit } from "./declaration-common.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { ArrayLiteral } from "./json/array-literal.xl.md"
import { ObjectLiteral } from "./json/object-literal.xl.md"
import { Keyword } from "./keyword.xl.md"
import { Lamda } from "./lamda/lamda.xl.md"
import { LogicalOperator } from "./logical-operator.xl.md"
import { Method } from "./method.xl.md"
import { New } from "./new/new.xl.md"
import { NullConditionalOperator } from "./null-conditional-operator.xl.md"
import { NotNull } from "./not-null.xl.md"
import { PropertyAccess } from "./property-access.xl.md"
import { String } from "./string/string.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { UnaryOperator } from "./unary-operator.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { As } from "./as.xl.md"
import { Satisfies } from "./satisfies.xl.md"
import { Class } from "./class/class.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

二元运算：`a + b` / `a * b` / `a === b` / `a << b` / `k in obj` 这类，
收成一个 `BinaryOperator` 节点（左操作数、运算符、右操作数都装在里面，`op` 属性记下运算符文本）。

「完整解析 TypeScript」最后一块缺口就是表达式层（早期的缺口台账的
`_notes.expr-tree-absent`）：第 27 轮补了一元，本规则补二元里最大的一块。

**优先级靠「注册多个实例 + 高优先级先跑」实现**：重组是**按规则**扫的，
排在前面的规则整趟先跑完。于是把 `**` 排在 `*` 前面、`*` 排在 `+` 前面……
`a + b * c` 里 `*` 先折叠成 `BinaryOperator(b, *, c)`，随后 `+` 折叠时它的右操作数
正好就是这个节点 → 得到 `BinaryOperator(a, +, BinaryOperator(b, *, c))` ✓ 正确的树。

**结合性靠「同一趟里从左到右」**：`a - b - c` 的同一个实例从左往右扫，
先折 `a - b`、再折 `(a-b) - c` → 左结合 ✓（`**` 在 TypeScript 里是右结合，这里也按左结合处理，
连乘方连写在实际代码里极罕见，等真的需要时再单独给它一个从右往左的实例）。

**运算符集刻意不含 `|` / `&` / `<` / `>`**：它们在类型位另有含义，
已经被类型规则（联合/交叉、`GenericType`）收走；把它们也当二元运算符会直接打坏类型解析。
`&&` / `||` 也不在内——它们早就有 `LogicalOperator` 了。

`BinaryOperatorCloseRule` 写在 `BinaryOperator` 之前；
`Root` 会在自己的规则队列里持有这些实例，所以顺序不能反。

# class BinaryOperatorCloseRule extends CloseRule

## constructor:(operators:Array<string>)=>void

一个实例负责**一个优先级层**的一组运算符（`["*", "/", "%"]` 这样）。

列表存进 `Operators` 字段；`Instance` 之外的实例都由 `ParsePipeline.GeneralCloseRule` 直接 `new` 出来。

```ts
super();
this.Operators = operators;
```

## field Operators:Array<string> = []

本实例负责的运算符文本。

## static readonly field PowerInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["**"])

乘方（最高优先级）。

## static readonly field MultiplicativeInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["*", "/", "%"])

乘除取余。

## static readonly field AdditiveInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["+", "-"])

加减。

## static readonly field ShiftInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["<<", ">>", ">>>"])

移位。

## static readonly field RelationalInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["<=", ">="])

大小比较。**只收 `<=` / `>=`**：单独的 `<` / `>` 与泛型实参同形，
`GenericTypeBranch` 在词法阶段就要靠它们配对，语法层再动它们会互相打坏。

## static readonly field EqualityInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["==", "!=", "===", "!=="])

相等比较。

## static readonly field InInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["in"])

`k in obj`（`in` 是关键字，见 `../parse-pipeline.xl.md` 的 `KeyWords`）。

## static readonly field InstanceofInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["instanceof"])

`x instanceof C`。

## static readonly field LogicalAssignmentInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["&&", "||"])

`&&=` / `||=` 展开出来的那一步。

`CompoundAssignmentOperatorCloseRule` 把 `a &&= b` 展开成 `a = a && b` 时，
中间那个 `&&` 是本规则（`BinaryOperator`）收的——但普通的 `a && b` 走的是 `LogicalOperator`，
于是**同一族运算符在两种来源下落到不同节点**（实测：`a &&= b` 的产物是
`<LogicalOperator op="And">`，而 TypeScript 把它记成 `BinaryExpression` +
`AmpersandAmpersandEqualsToken`）。这一支让它统一折成 `BinaryOperator`。

`SymbolToken.FromCompoundAssignment` 标记正好是判据：只有**复合赋值切开后插回来的**那份运算符
带这个标记，所以 `IsOperator` 认它、而普通的 `a && b` 仍然照旧走 `LogicalOperator`。

## static readonly field CommaInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule([","])

逗号（序列）表达式 `(a, b)`，优先级最低。

**这一支必须有额外判据**（`IsCommaExpressionComma`），因为 `,` 在 TypeScript 里
绝大多数场合**不是运算符**：函数参数表、调用实参表、数组字面量、对象字面量、
变量声明的多声明符、`for` 子句——它们的分隔符都是 `,`。
判据只认一种形状：**`(` 括号内部的顶层 `,`**（参数表 / 实参表同样是 `(`，靠调用方排除）。

## static readonly field BitwiseInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["|", "&", "^"])

位运算 `a | b` / `a & b` / `a ^ b`（值位）。

**这一支只收「父单元是语句」的那种**（见 `IsValuePositionBitwise` 的说明）：
`|` / `&` 在类型位另有含义（联合 / 交叉类型），类型位的那两个在轮到本规则时
**已经被 `TypeAssign` / `TypeDefine` 收进节点里**，不再是同层单元，所以按「父单元是不是语句」
就能把两种位置分开。`^` 只有值位一种含义，但也一并走这条判据，保持一处逻辑。

优先级放在相等比较与 `in` 之间（与 TypeScript 的 `&` > `^` > `|` 简化成一层：
真实代码里混写这三种且不写括号的情况极少，拆成三层收益不成比例）。

## static readonly field NullishInstance:BinaryOperatorCloseRule = new BinaryOperatorCloseRule(["??"])

空值合并 `a ?? b`。

放在这一族里（而不是和 `&&` / `||` 一起）：那两个是 `LogicalOperator` 的活，
而 `??` 与它们混写没有括号时本来就是语法错误，所以顺序上挨着谁都不影响正确性 ✓。

**为什么现在才加**：差分引擎原来把**所有** `BinaryExpression` 都算在 `BinaryOperator` 的账上，
`??` 的缺失被埋在那个虚高的差额里；第 39 轮把「另有归属的运算符」（`&&` / `||` / 赋值族）从账上剔掉之后，
剩下的 165 个真切口中 `??` 占 24 个，这才露出来。

## private method OperatorText:(current:Token)=>string

`current` 的文本：`SymbolToken` / `Identifier` 用 `TempToString()`，`Keyword` 用它的 `Value`。

```ts
if (current instanceof SymbolToken) {
  return current.TempToString();
}
if (current instanceof Identifier) {
  return current.TempToString();
}
if (current instanceof Keyword) {
  return current.Value;
}
return "";
```

## private method IsOperator:(current:Token | null)=>bool

`current` 是不是**本实例负责的**运算符。

```ts
if (current === null) {
  return false;
}
const text = this.OperatorText(current);
if (text === "") {
  return false;
}
if (this.Operators.indexOf(text) === -1) {
  return false;
}
// `&&` / `||` 只认**复合赋值切开后插回来的**那一份（见 LogicalAssignmentInstance）：
// 普通的 `a && b` 归 `LogicalOperator`，不能在这里抢。
if ((text === "&&" || text === "||") && !(current instanceof SymbolToken && current.FromCompoundAssignment)) {
  return false;
}
return true;
```

## private method IsOperand:(unit:Token | null)=>bool

`unit` 能不能当**操作数**。

能当的：`Identifier` / `String` / `Method`（`f(x)`）/ `NotNull` / `UnaryOperator` / `BinaryOperator`
（左结合要靠它：`a - b - c` 的第二步，左边已经是一个二元节点）/ `ObjectLiteral` / `ArrayLiteral` /
`New` / `Lamda` / 收尾的 `)` 与 `]` 括号。

`Keyword` 只认 `this` / `super` 两个——别的关键字（`return` / `typeof` / `in` …）都不是操作数，
不当心认下来的话 `return - 1` 这种会被折成一个荒谬的二元节点。

`LogicalOperator` 也在列：`&&` / `||` 的规则排在**本规则之前**（历史位次），
`a && b + c` 会先把 `a && b` 折成 `LogicalOperator`，那时 `+` 的左边就是这个节点——
不认它的话 `+` 会因为没有左操作数而丢节点。**代价是那一处优先级不准确**
（按 TypeScript 应当是 `a && (b + c)`）：这是「`&&` 规则位次比四则早」带来的既有顺序问题，
真要修得把 `LogicalOperator` 挪到四则之后，属于另一次改动。

**括号那一支看的是 `endBracket`，不是 `startBracket`**：`a = (4) / 2;` /
`a = xs[0] - 1;` 里，操作数位置上的括号**左端**是 `(` / `[`，而「右端是 `)` / `]`」
才是「这个括号是一段完整的括号表达式」的意思。原来写的是
`startBracket === ")" || startBracket === "]"`——`Bracket` 的 `startBracket`
只会是 `(` / `{` / `[`（见 `bracket.xl.md` 的 `Use`），所以那个判断**永远为假**，
整条括号分支是死代码：`(4) / 2` 与 `a[i] - b` 里的运算符都拿不到节点。
`[` 开头的括号**同时也要认**（`a[b + 1]` 的下标里那个 `+` 要折），
而 `ArrayLiteral` 本身（`[...]` 数组字面量）也是操作数——
两个都要在名单里，否则 `[1, 2] + x` 会丢掉 `+`。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof Identifier) {
  const text = unit.TempToString();
  if (
    text === "return" ||
    text === "throw" ||
    text === "case" ||
    text === "default" ||
    text === "else" ||
    text === "do" ||
    text === "break" ||
    text === "continue" ||
    text === "yield" ||
    // **与一元那份对齐**（第 167 轮）✓：`typeof` / `void` / `delete` 也**不算操作数** ✓——
    // 不排的话 `typeof typeof x === "string"` 会被折成 `typeof (x === "string")` ✗，
    // 而那是**值都变了** ✗（Node 给 `true` ✓、本仓给 `"boolean"` ✗）。
    // **`new` / `await`**：第 288 行那段写着 `new` 为什么**不能排**（`new X * 2` ✓）。
    // **`await` 是第 286 轮量出来的反例** ✗——它**必须排** ✓，而且这一条与
    // `yield` 那条（上面）**同一条理由** ✓：`await` 是**前缀运算符** ✓，
    // 永远不是某个二元运算符的右操作数 ✓——`t += await f(1)` 在 JS / TS 里是
    // `t += (await f(1))` ✓，而这里认了它，`+` 就会把 `await` **整格吃掉** ✗。
    //
    // **吃掉之后的样子**（实测 `tmp-ast3.ts` 的 XML ✓）：
    //
    // ```
    // <Identifier>t</Identifier>
    // <SymbolToken>=</SymbolToken>
    // <BinaryOperator op="+"><Identifier>t</Identifier><SymbolToken>+</SymbolToken><Keyword>await</Keyword></BinaryOperator>
    // <Method name="f">…</Method>          ← **`f(1)` 掉在运算符外面** ✗
    // ```
    //
    // 于是投影那边 `Keyword(await)` 的**下一格不是它的操作数** ✓
    //（操作数在二元运算符外面 ✓），合成不出来 `AwaitExpression` ✓——
    // 投出来的是 `AwaitKeyword` ✓，降级层报
    // `unimplemented: expression AwaitKeyword` ✓（**离现场很远** ✗：
    // 那句话听起来像「`await` 没人支持」✗，而 `const a = await f()` **一直是好的** ✓）。
    //
    // **为什么 `yield` 早就排了、`await` 却漏了** ✗：`yield` 那一条是当年实测补的 ✓
    //（`yield a + b` 与 `t += yield f()` 同一个形状 ✓），`await` 是**同一个形状的另一个词** ✓
    //——两条判据本该一起写 ✓（**同一个形状两处各写一遍就是两处会漂** ✗，
    // 这一格漂了整整一个版本 ✓：`for (const n of xs) total += await f(n)`
    // 是**最普通的一种 async 写法** ✓）。
    text === "await" ||
    text === "typeof" ||
    text === "void" ||
    text === "delete"
  ) {
    return false;
  }
  return true;
}
if (
  unit instanceof String ||
  unit instanceof Method ||
  unit instanceof NotNull ||
  unit instanceof UnaryOperator ||
  unit instanceof BinaryOperator ||
  unit instanceof ObjectLiteral ||
  unit instanceof ArrayLiteral ||
  unit instanceof New ||
  unit instanceof Lamda ||
  unit instanceof LogicalOperator ||
  unit instanceof NullConditionalOperator ||
  unit instanceof PropertyAccess ||
  // **`As` / `Satisfies` 也是表达式** ✓（第 288 轮 ✗）：`a as number + 1` 在 TS 里是
  // **`(a as number) + 1`** ✓——`as` 那一趟收工之后，`+` 的左边站的正是**折好的 `As` 单元** ✓。
  // 这条与 `unary-operator.xl.md` 那份名单**必须对齐** ✓（那一份第 69 行的纪律 ✓）——
  // 只补一边的话，`+` 会先被**一元**那一趟抢走 ✗（`UnaryOperator op="+"` ✓），
  // 而这里也就永远收不到它 ✓（**静默少一个节点** ✗）。
  unit instanceof As ||
  unit instanceof Satisfies ||
  // **类表达式也是操作数** ✓（第 328 轮 ✓）：`x + class { }` 是合法的 JS ✓，
  // 而 `typeof class C { }`（读那一半）靠的也是这一格的**对称补充** ✓——
  // 两份名单**必须对齐** ✗（`unary-operator.xl.md` 第 69 行那条纪律 ✓）：
  // 只补一边的话，`+` 会先被**一元**那一趟抢走 ✗（`UnaryOperator op="+"` ✓）。
  unit instanceof Class
) {
  return true;
}
if (unit instanceof Bracket) {
  return (
    unit.endBracket === ")" ||
    unit.endBracket === "]" ||
    unit.startBracket === "[" ||
    unit.startBracket === "("
  );
}
if (unit instanceof Keyword) {
  return unit.Value === "this" || unit.Value === "super";
}
return false;
```

**`NullConditionalOperator` 也要认成操作数**：`a?.b ?? c` / `x.y.get(z)?.v ?? null` 里
`?.` 已经收成一个节点，不认它的话 `??` 找不到左操作数 ✗ ——
这是差分账上最后 34 个 `BinaryOperator` 的主要形状（取样里 `?.` 与 `.` 链各占一半，
而**普通 `.` 链本来就能折**，差别正在这里）。

**`Identifier` 那一支要排掉「语句关键字」**（这一条是实测补的）：本规则跑在 `KeywordCloseRule`
（队列最后）**之前**，所以那时 `return` / `throw` 这些词**还是 `Identifier`** ✓ ——
按「是个 `Identifier` 就能当操作数」判，`return -1;` 会被折成
`<BinaryOperator op="-"><Keyword>return</Keyword>…` ✗（实测产物就是这个），
一元那一边因此永远拿不到它（差 38 个一元节点里的 29 个）。

**只排「语句关键字」这一小组，不要用「在关键字表里」当判据**：
第一版写成 `unit.Template.KeywordTemplate.IsKeyword(text)` 就一律拒收，结果
**表达式类关键字**（`await` / `yield` / `new` / `typeof` …）也被拒 ✗ ——
差分账上 `BinaryOperator` 立刻多出 34 个缺口（实测），说明有 37 处本来能折的表达式折不动了。
判据要窄：`return` / `throw` / `case` / `default` / `else` / `do` / `break` / `continue`
这八个**只会出现在语句头**的词 ✓；`true` / `false` / `null` 不在关键字表里，仍是操作数 ✓。

**`yield` 是第九个例外，而且必须单列**（实测缺口）：它是**前缀运算符**，
永远不是某个二元运算符的左操作数——`yield a + b` 在 TypeScript 里是
`yield (a + b)`，那个 `+` 的左操作数是 `a`、不是 `yield` ✓（所以这条不会少折任何表达式）。
唯一「直接贴在 `yield` 右边」的运算符是**委托产生式** `yield* h()`：它照样会折出一个
`BinaryOperator op="*"`，把 `yield` 当成乘法左操作数（AST 那边是带 `asteriskToken` 的
`YieldExpression`，**没有任何 `BinaryExpression`**）。`await` / `new` / `typeof` 那三个
**不能照抄这一条**：`new X * 2` 是合法的 `(new X) * 2`，把 `new` 排掉会真的少折一个乘法。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是**本层的一个二元运算符**，而且左右两边都是操作数。

父单元是 `GenericType` 时一律不成立（类型实参段里的东西不是表达式，
与 `MethodCloseRule` / `UnaryOperatorCloseRule` 同一条判据）。

父单元是 `[` 括号时也一律不成立：那是**映射类型**（`{ [K in keyof T]: T[K] }`）
与索引签名（`[key: string]: T`）的地盘，`in` 是类型语法的一部分、不是运算符。
实测这一条不挡的话四条映射类型用例全炸（`in` 的左右正好是两个 `Identifier`：
`K` 与 `keyof`）。

**但判据不能只看「父单元是 `[` 括号」**：元素访问 `a[b + 1]` / `xs[xs.length - 1]`
用的是**同一个 `[` 括号单元**，一并挡掉的话下标里的运算符全都拿不到节点
（实测量化：这一类占二元缺口的 41 个节点 / 21 个文件，是最大的一块）。
正确的判据是括号自己的 `Context`——它在**开括号那一刻**由 `DecideBracketContext` 算好，
不受重组时序影响（见 `bracket.xl.md` 的 `Context` 字段说明）：
只有 `Context === "type"` 的 `[` 才是映射类型 / 索引签名的地盘。
实测 `a[b + 1]` 的括号 `Context === "value"`。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (current.Parent instanceof GenericType) {
  return false;
}
if (current.Parent instanceof Bracket && current.Parent.Context === "type") {
  return false;
}
// **映射键的 `in` 不是运算符**（第 66 轮）：键已经收成 `TypeParameter`
// （见 `type-parameter.xl.md`），父单元不再是 `[` 括号而是它——TS 那边
// `{ [K in string]: X }` 里根本没有二元表达式，原来那条 `BinaryOperator in ArrayLiteral`
// 口径本来就是替身。少了这一条，8 处映射键会各多出一个 `<BinaryOperator op="in">`。
if (current.Parent !== null && current.Parent.constructor.name === "TypeParameter") {
  return false;
}
// **`?.(` 里的逗号是实参分隔符，不是逗号运算符**（第 157 轮）✓：
// 可选调用的实参表被 `NullConditionalOperator` 吞了 ✓（`optional-call.xl.md` 文首那张表 ✓），
// 于是逗号规则跑的时候**还没有 `Method`、也还没有 NCO** ✓——它看到的只是一个光秃秃的 `(` ✓，
// 就把 `1, 2` 折成了一个 `BinaryOperator op=","` ✗。
// 症状是降级层报 `unimplemented: binary operator ,` ✗（`o.m?.(1, 2)` 整份文件进不来 ✗）。
//
// **判据只能靠「紧挨着的前一格」** ✓：`DecideBracketContext` **不管 `(`** ✗
//（`text-common-util.xl.md` 里写着第 57 轮试过、退回来了 ✓），
// 而 `(` 的 `Context` 因此永远不是我们要的那一档 ✓。插桩也确认了这一点 ✓：
// 那一刻的 `Parent`/祖父都是 `Bracket` ✓——**NCO 还没成形** ✓。
// 但 `?.` 这个记号**已经在列表里了** ✓（它是一个 `SymbolToken` ✓，
// `NullConditionalOperatorCloseRule.Previous` 就是靠 `item.Is("?.")` 认它的 ✓），
// 所以问「括号前面那一个单元是不是 `?.`」在**任何时刻**都问得准 ✓。
//
// **为什么这条判据是准的** ✓：`?.(` 后面**只可能是实参表** ✓——
// 想在可选调用的实参位写逗号运算符，非得多加一层括号 `o.m?.((1, 2))` ✓，
// 那一层括号会让「紧挨着的前一格」变成内层括号的 `(` ✓，判据自然不成立 ✓（要的就是这样 ✓）。
// 普通调用（`o.m(1, 2)`）不受影响 ✓：那时 `Method` 早就成形了 ✓。
if (current.Parent instanceof Bracket && current.Parent.startBracket === "(") {
  const owner = current.Parent.Parent;
  if (owner !== null) {
    const list = owner.Data;
    const at = list.indexOf(current.Parent);
    if (at > 0) {
      const before = Get(list, SkipPreviousWrapSymbol(list, at));
      if (before instanceof SymbolToken && before.Is("?.")) {
        return false;
      }
    }
  }
}
// **`for (const k in obj)` 头里那个 `in` 不是运算符** ✗（第 551 轮 ✓）。
//
// 它是 `for…in` 的**分隔词** ✓ —— `ForeachCloseRule.Previous` 认的就是它 ✓
// （见 `foreach.xl.md` ✓，那一条与 `ForCloseRule` 是**互补**的两半 ✓）。
// 可括号**先关** ✗：括号自己那一趟里 `InInstance` 先把 `k in obj` 折成了一个
// `BinaryOperator` ✗ ⇒ 轮到 `Foreach` 时括号里**已经没有那个词**了 ✗
// ⇒ 整条 `for…in` 不成形 ✓（实测三份：`st-for-in.ts` 6 缺 ✓ /
// `stmt-for-in-kinds.ts` 20 缺 ✓ / `lex-keyword-in-of.ts` 12 缺 ✓，
// 缺的都是 `ForInStatement` 那一整条 ✓）。
//
// **判据**：父单元是 `(` 括号 ✓、括号**所属那一格的前面**就是 `for` / `foreach` ✓、
// 而且括号里**一个 `;` 都没有** ✗ —— C 风格的头一定有分号 ✓，那种头里的 `in`
// 是**真运算符** ✓（`for (x = "a" in obj; c; d)` ✓），不挡 ✗。
// 与上面 `?.` 那一条同一个做法 ✓：问的都是「紧挨着的前一格 / 父单元」✓，
// 与重组时序无关 ✓。
if (IsWordUnit(current, "in") && current.Parent instanceof Bracket) {
  const owner = current.Parent.Parent;
  if (owner !== null && current.Parent.startBracket === "(") {
    const list = owner.Data;
    const at = list.indexOf(current.Parent);
    const hasSemicolon = units.some((item) => item instanceof SymbolToken && item.Is(";"));
    if (at > 0 && hasSemicolon === false) {
      const before = Get(list, SkipPreviousWrapSymbol(list, at));
      if (IsWordUnit(before, "for") || IsWordUnit(before, "foreach")) {
        return false;
      }
    }
  }
}
if (this.IsValuePositionBitwise(current) === false) {
  return false;
}
if (this.IsCommaExpressionComma(units, index) === false) {
  return false;
}
if (this.IsOperator(current) === false) {
  return false;
}
// **左操作数必须真的在运算符左边** ✓（第 306 轮 ✓）——**次序**这一条与「是不是操作数」
// 是两件事 ✗：上面那一句只问「那一格长得像不像操作数」✓，而这一条问的是
// 「它**真的排在运算符前面**吗」✓。
//
// **不挡的话会折出一个语法上不可能的节点** ✗，实测的形状是**生成器 + 计算成员名** ✓：
// `class A { *[k]() { … } }` 里那个 `*` 本该是**生成器标记** ✓，可它被当成了**乘法** ✗——
// 折出来的 `<BinaryOperator op="*">` 左孩子是**计算名那个 `[k]`** ✓（它的起点在 `*`
// **之后** ✓）、右孩子是**形参那对圆括号** ✓（被收成了空 `ArrayLiteral` ✓），
// 于是方法声明那一格拿不到名字 ✓：`*[k]()` 的 `name` 成了 `"k"` ✓（`*[Symbol.iterator]()`
// 干脆是空串 ✓），而降级层报 `ast node MethodDeclaration has no child name` ✓
//（**整份文件进不来** ✗，判据 `c305-e2e-linked-list-ops` ✓）。
// **与 `ts.createSourceFile` 对过** ✓（用户口径里那一句 ✓）：
// TS 给的是 `MethodDeclaration(asteriskToken) > name: ComputedPropertyName` ✓——**名字在** ✓。
//
// **为什么这一条是安全的** ✓：一个真正的二元表达式里，左操作数**必然**结束于运算符之前 ✓
//（这是源码顺序决定的 ✓，与优先级、结合性都无关 ✓）。所以它只挡「本来就排错了的那一次折」✓。
// **范围任一格没签**（`null` ✓）就照旧放行 ✓——不拿一个猜出来的位置当判据 ✓。
//
// **`!` 一个都不要写** ✗（实测踩过 ✓）：这一段**自己也是 `cases:tsast` 的语料** ✓，
// 而「非空断言串在成员链上」那一族**还没修完** ✓（第 303 / 304 轮的账 ✓）——
// 写成 `x.End!.Index > y.Start!.Index` 会让**本文件**当场多出一个假 `BinaryExpression` ✓、
// 一个假 `DotToken` ✓ 与一处区间漂移 ✓（`cases:tsast` 报的就是这三格 ✓）。
// 收成两个本地量、一层一层判空 ✓，既不写 `!` ✓，读起来也更直白 ✓。
const opStart = current.SourceRange.Start;
const leftUnit = Get(units, SkipPreviousWrapSymbol(units, index));
if (leftUnit !== null && opStart !== null) {
  const leftEnd = leftUnit.SourceRange.End;
  if (leftEnd !== null && leftEnd.Index > opStart.Index) {
    return false;
  }
}
if (this.IsOperand(leftUnit) === false) {
  return false;
}
// **右结合的运算符要先折右边那一处**（第 164 轮）✓。
//
// `**` 是**右结合** ✓：`2 ** 3 ** 2` 在 JS 里是 `2 ** (3 ** 2)` = **512** ✓。
// 而这一趟是**从左往右**找第一处能折的 ✓——不挡的话先把左边那对折了 ✗，
// 于是树成了 `(2 ** 3) ** 2` = **64** ✗（实测 XML：外层 `**` 的左子是内层 `**` ✓；
// TS 那边恰好相反 ✓——**这是语义错，不是「不支持」** ✗）。
//
// **挡法**：这一格的**右操作数之后还跟着同一个运算符**时先放过 ✓，
// 让更右那一处先折 ✓；它折完再回来，这一格右边就已经是一个单元了 ✓。
// 链更长时同理 ✓（每趟只折最右那一对 ✓，折到达成右结合为止 ✓）。
//
// **只列 `**`** ✗：JS 里右结合的二元运算符就它一个（赋值是另一套规则管的 ✓）——
// 将来真有新的，照这里再加一个名字 ✓；别写成「所有运算符都这么办」✗
//（那会反过来把 `a - b - c` 折成 `a - (b - c)` ✗，而它是左结合 ✓）。
const rightAssociative =
  current instanceof SymbolToken && current.TempToString() === "**";
if (rightAssociative) {
  const nextIndex = SkipNextWrapSymbol(units, SkipNextWrapSymbol(units, index));
  const next = Get(units, nextIndex);
  if (next instanceof SymbolToken && next.Is("**")) {
    return false;
  }
}
// **右操作数后面紧跟一个字符串 ⇒ 那是「标签 + 模板」** ✓（第 321 轮 ✓）——
// 这一格**先放过** ✗，交给**投影**去合成 `TaggedTemplateExpression` ✓
//（`print-ast-common` 的 0b / 0c 两条 ✓：产物那边标签与模板是**两格平级** ✓）。
//
// **判据为什么成立** ✓：一个字符串字面量**不可能**紧跟在**一个操作数**后面出现 ✗
//（`t "x"` 不是合法 JS ✓）——所以「操作数 + 字符串」这个相邻关系**只可能是**
// `` t`x` `` ✓。这一条与 `property-access.xl.md` 里「数组字面量不会紧跟在表达式后面」
// 是**同一条推理** ✓（那里用它把 `o.b![1]` 的 `[1]` 认成下标 ✓）。
//
// **不挡会怎样** ✗：这里先把 `1 + t` 折成一个 `BinaryOperator` ✓，
// 于是标签与模板被**拆进两棵子树** ✓——投影拿到 `[BinaryOperator(1,+,t), PropertyAccess(模板,.,length)]` ✓
// ⇒ 右操作数只剩 `t` ✓、后缀整片丢掉 ✗（实测：`` 1 + t`xy`.length `` 报
// `unimplemented: ToPrimitive of a function` ✓，Node 给 `3` ✓——**静默错值** ✗）。
const rightOperandIndex = SkipNextWrapSymbol(units, index);
const afterOperand = Get(units, SkipNextWrapSymbol(units, rightOperandIndex));
// **两种形状都算** ✗（第一版只认 `String` ✓，实测不够 ✓）：
// 模板后面**还跟着后缀**时（`` t`x`.length `` ✓），产物那一格是
// **`PropertyAccess(模板, ., length)`** ✓——标签在外面、模板与后缀在同一个 `PropertyAccess` 里 ✓
//（投影 0c 那一段写着这个形状 ✓）。所以判据是「**这个单元以模板开头**」✓：
// 它自己就是 `String` ✓，或者它是一个 `PropertyAccess` 、**第一个可投影子单元是 `String`** ✓。
if (StartsWithTemplate(afterOperand)) {
  return false;
}
// **复合赋值展开出来的那一份运算符：要等右操作数先折成一个单元** ✓（第 373 轮 ✓）。
// 判据与理由写在 `ExtendsRightOperand` 那一段 ✓（与上面 `**` 那条**同一个形状** ✓：
// 「右边还没长完就先放过 ✓」）。
if (current instanceof SymbolToken && current.FromCompoundAssignment
  && this.ExtendsRightOperand(afterOperand)) {
  return false;
}
return this.IsOperand(Get(units, SkipNextWrapSymbol(units, index)));
```

## private method ExtendsRightOperand:(unit:Token | null)=>bool

`unit` 是不是「**还能把右边继续吃下去**」的那个东西（第 373 轮 ✓）——
用来回答「这一格运算符的右操作数**长完了没有**」✓。

**为什么需要这一问** ✗：`a += b` 会被 `CompoundAssignmentOperatorCloseRule` 展开成单元序列
`a` `=` `a` `+` `b` ✓（见 `compound-assignment-operator.xl.md` ✓）——
**插进来的那个 `+` 不是用户写的** ✓，它要表达的是「`op=` 这个符号」✓，
所以它的**右操作数是整个赋值右侧** ✓（JS 里赋值右侧是一个完整的 AssignmentExpression ✓），
也就必须**最后**才生效 ✓。而这一趟是**按优先级**折的 ✗ ⇒ 不挡的话 `a *= 1 + 2` 会先折 `a * 1` ✗
⇒ 得到 `(a * 1) + 2` ✓——**静默错值** ✗（实测 `a *= 1 + 2` 给 `8` ✓，JS 给 `6` ✓；
`t += cur < next ? -cur : cur` 给 `1` ✓，JS 给 `-1` ✓）。

**挡法**：右操作数之后还跟着「能继续吃右边的东西」时**先放过** ✓，让右边先折 ✓、
折完再回来 ✓（`**` 那条右结合用的是同一个套路 ✓）。

**哪些算「能继续吃右边」** ✓——**除 `,` 以外的运算符** ✓ 加**三元那个 `?`** ✓：

- **除 `,` 是必须的** ✗：逗号（序列）表达式**比赋值还松** ✓，所以 `a += b, c` 在 JS 里是
  `(a += b), c` ✓ ⇒ 遇到 `,` 必须**先折** `a + b` ✓（实测：把 `,` 也挡进去，
  那条语句会变成 `t + (u, …)` ✗）。
- **`?` 也要挡** ✓：三元的条件段是**整个**比 `+` 松的东西 ✓。
- **`.` / `(` / `[` 不在判据里** ✗：它们是**后缀** ✓，实测那十几条形状
  （`a += o.k` ✓ / `a += f(x)` ✓ / `a += xs[0]` ✓ / `a += (2, 3)` ✓ / `a += -o.k` ✓）
  在这一刻**右边已经折成单元了** ✓ ⇒ 不必挡 ✓——**没被验证过的判断不留** ✗（本仓的规矩 ✓）。

```ts
if (unit === null || !(unit instanceof SymbolToken)) {
  return false;
}
const text = unit.TempToString();
// **`,` 是最松的** ✗（见上面那段 ✓）——碰到它就说明右操作数已经长完了 ✓。
if (text === ",") {
  return false;
}
// **三元那个 `?`** ✓（本仓的 `?` 也是 `SymbolToken` ✓）。
if (text === "?") {
  return true;
}
// **「是不是运算符」不能问 `this.Operators`** ✗：它只有**本实例那一档** ✓
//（加法实例上只有 `+` `-` ✓），而这里要认的是**任何一个**运算符 ✓
//（`a *= 1 + 2` 里那个 `+` 归加法实例 ✓、`a += b < c` 里那个 `<` 归比较那一段 ✓）。
// 两张表都是**现成的** ✓：比较符号在 `SymbolTemplate.CompareSymbols` 上 ✓，
// 其余（算术 / 移位 / 位 / 逻辑 / 空值合并 / `in` / `instanceof`）在下面那张**并集**上 ✓。
if (unit.Template.SymbolTemplate.IsCompareSymbol(text)) {
  return true;
}
return BinaryOperatorCloseRule.AllOperatorTexts.indexOf(text) !== -1;
```

## static readonly field AllOperatorTexts:Array<string> = ["**", "*", "/", "%", "+", "-", "<<", ">>", ">>>", "&", "|", "^", "&&", "||", "??", "in", "instanceof"]

**所有二元运算符的文本，并成一张表**（第 373 轮 ✓）——给 `ExtendsRightOperand` 用 ✓
（问「这一格之后还跟着运算符吗」✓）。

**它是那十几个实例的 `Operators` 的并集** ✓（`PowerInstance` ✓ … `InstanceofInstance` ✓），
**不另立新的口径** ✓：`<` / `>` / `<=` / `>=` / `==` / `===` / `!=` / `!==` 那八个
走 `SymbolTemplate.CompareSymbols` ✓（它们本来就在那儿 ✓），
而 `,` **有意不收** ✗（它比赋值松 ✓，见 `ExtendsRightOperand` 那一段 ✓）。

**为什么需要一张并集** ✗：`IsOperator` 问的是**本实例**那一档 ✓（折的时候当然只认自己 ✓），
而「右边还能不能长」问的是**所有**运算符 ✓——两件事 ✗。

## private method IsCommaExpressionComma:(units:Array<Token>, index:int)=>bool

`index` 处的 `,` 是不是**逗号（序列）表达式**里的那个，而不是各种列表的分隔符。

不是本实例管的符号（`+` `-` 之类）一律返回 `true`——那些走原来的路径。

判据两条，都要成立：

1. **向前找到最近的括号**：从 `index - 1` 往前扫，遇到的第一个括号必须是 `(`。
   扫到列表开头都没有括号 → 不是（`,` 在语句层只能是列表分隔符）。
   括号先于 `,` 之前的任何括号出现，就说明这个 `,` 落在那一层括号的最外层；
   若遇到的是 `[` 或 `{`，那是数组 / 对象字面量的元素分隔符，**不是**运算符。
2. **那个 `(` 不是参数表 / 实参表**：看 `(` 前面那个实义单元。
   它是 `Identifier`（`f(a, b)` 的名字、`function` 也是 `Identifier`）→ 参数表；
   它的**类名**是 `Method` / `Function` / `MethodDeclaration` → 参数表或实参表；
   它的**类名**是 `Keyword` 且文本属于 `function` / `if` / `for` / `while` / `switch` / `catch` → 参数表；
   其余（`=` `return` `(` `,` 语句边界…）→ **是逗号表达式**。

**为什么用类名而不是 import 那些类**：本文件是核心算符规则，`Function` / `MethodDeclaration`
那几条规则又（间接）依赖它，直接 import 会绕出循环依赖
（与 `declaration-common.xl.md` 的白名单判据同一个理由）。
`constructor.name` 就是 XML 标签名，判它等价于判类型。

**为什么不能只看「`(` 里面」**：`f(a, b)` 的参数括号同样满足第 1 条，
差别只在「括号前面有没有一个被调用 / 被声明的名字」。实测只判第 1 条时，
`f(a, b)` 的实参会被折成一个 `CommaOperator`（全语料多出上千个）。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken) || current.Is(",") === false) {
  return true;
}
// `for (…; …; i++, j--)` 的**更新子句**：那里的 `,` 天然就是序列表达式
// （`ForNext` 这个容器只可能出现在第三段，声明列表在 `ForInitial` 里）。
if (current.Parent !== null && current.Parent.constructor.name === "ForNext") {
  return true;
}
// 语句层的 `,`（`a, b;` / `i++, j--;`）：同样是序列表达式。
// **但枚举体里的 `,` 是成员分隔符**（`EnumBody` 也把内容包在 `Statement` 里），
// 所以还要看那个 `Statement` 的归属不是 `EnumBody`。实测漏了这一条时
// `enum Color { Red, Green = 2 }` 会被折成一个 CommaOperator（`declarations.ts` 样例当场 DIFF）。
if (current.Parent !== null && current.Parent.constructor.name === "Statement") {
  const owner = current.Parent.Parent;
  if (owner === null || (owner.constructor.name !== "EnumBody" && owner.constructor.name !== "ObjectLiteral")) {
    return this.HasDeclarationBefore(units, index) === false;
  }
  return false;
}
// 最近的括号可能在**同一层**（`(a, b)` 收成 Bracket 之前的形态），
// 也可能**就是 `Parent`**（括号已经收好了，当前列表是它的内容）——两种都要看。
// 两种情况下「括号外面的前一个单元」来自**不同的列表**，所以各自就地取好 `outside`，
// 不能只记一个下标再去 `Get(units, …)`（那样会拿错列表——实测踩过）。
let openBracket: Token | null = null;
let outside: Token | null = null;
// **括号是「同一层的兄弟」还是「装着这个 `,` 的容器」**（第 125 轮）：前者说明
// 这个 `,` 不在那个括号里——它是**外面那一层列表**的分隔符。
// 实测 `[(x), y]`：逗号在同一层回扫时先撞上 `(x)` 这个兄弟括号，`outside` 是 `null`
// （括号在列表第 0 格），旧代码于是走 `outside === null ⇒ true`，把数组元素分隔符
// 折成了逗号表达式（`BinaryExpression` + `CommaToken` 各多一片）。
let sameListBracket = false;
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof Bracket) {
    openBracket = item;
    outside = i > 0 ? Get(units, i - 1) : null;
    sameListBracket = true;
    break;
  }
}
if (openBracket === null) {
  const parent = current.Parent;
  if (!(parent instanceof Bracket)) {
    return false;
  }
  openBracket = parent;
  const owner = parent.Parent;
  if (owner !== null) {
    const at = owner.Data.indexOf(parent);
    if (at > 0) {
      outside = owner.Data[at - 1];
    } else if (at === 0) {
      // 括号是宿主列表的**第一项**：`for (…)` 在最外层时括号的 `Parent` 就是 `Root`/`Statement`，
      // 而 `for` 词在**更外一层**的列表里。上溯一层找它。
      const outer = owner.Parent;
      if (outer !== null) {
        const outerAt = outer.Data.indexOf(owner);
        if (outerAt > 0) {
          const candidate = outer.Data[outerAt - 1];
          if (IsWordUnit(candidate, "for")) {
            return false;
          }
        }
      }
    }
  }
}
if (!(openBracket instanceof Bracket) || openBracket.startBracket !== "(") {
  return false;
}
// **同一层找到的括号只是「兄弟」**（第 125 轮）：`[(x), y]` / `[...(x), y]` /
// `const a = (x), y` 里回扫先撞上前面那一对括号——它**不装着**这个 `,`
// （装着的话列表就是它的 `Data`，它自己不在里面）。所以这个 `,` 是**外层列表的分隔符**，
// 不是逗号表达式。原来这里继续往下走到 `outside` 判定：`outside` 是 `[` / `...` 时
// 两条都不命中、`return true`，数组元素分隔符于是被折成 `CommaOperator`
// （实测 `BinaryExpression` + `CommaToken` 各多一片、`SpreadElement` 跟着漂移）。
if (sameListBracket) {
  return false;
}
// **`for` 的括号要整段让开**（实测补的）：`for (…; …; i++, j--)` 的更新段在 TypeScript 里
// 是逗号表达式，但那个 `,` 在轮到本规则时还在 `for` 的括号里、而 `ForNext` 还没成形，
// 所以「父单元是 ForNext」那一支根本命中不了。此时**括号外面**（同一层往前找）能看到 `for`——
// 有它就让开，更新段交给 `For` 规则自己收（它会连 `;` 一起处理，比在这里折更稳）。
// 同一条也顺带挡住 `for (let i = 0, j = 1; …)` 的初始化段。
for (let i = 0; i < units.length; i++) {
  if (Get(units, i) === openBracket) {
    if (IsWordUnit(i > 0 ? Get(units, i - 1) : null, "for")) {
      return false;
    }
    break;
  }
}
if (outside === null) {
  return true;
}
if (outside instanceof Identifier) {
  return false;
}
const outsideName = outside.constructor.name;
if (outsideName === "Method" || outsideName === "Function" || outsideName === "MethodDeclaration") {
  return false;
}
if (outsideName === "Keyword") {
  const text = (outside as Keyword).Value;
  if (
    text === "function" ||
    text === "if" ||
    text === "for" ||
    text === "while" ||
    text === "switch" ||
    text === "catch"
  ) {
    return false;
  }
}
// **`new Foo<T>(a, b)` 的括号是实参表** ✓（第 374 轮 ✓）——
// 判据：括号前面那一格是**类型实参段**（`GenericType` ✓）、而它左边（同一层往前 ✓）
// 一路跨过类型名（`Foo` ✓ / `.` ✓ / `a.b.C` 那几格 ✓）之后是 **`new` 这个词** ✓。
//
// **少了这一条会怎样** ✗：`new Q<number>(1, 2, 3)` 的顶层逗号被折成**一个逗号表达式** ✗
//（插桩实测：`DBG comma-expr true: outside=GenericType owner=Root` ✓；
//  投影出来的产物是「`NewExpression` 只有一个实参，内容是 `((1, 2), 3)`」✓）
// ⇒ 构造函数**只收到一个实参**（那三个数合起来的值 ✓）⇒ 形参整体错位 ✓——
// **静默错值** ✓，判据 `c371-e2e-lru-with-ttl` / `c371-e2e-object-pool` /
// `c371-e2e-debounce-and-batch` / `c371-e2e-rate-limiting-window` 四条都是它 ✓
//（它们都是「泛型类 + 参数属性 + 函数类型形参」，第 371 轮记成 #20 ✓——
//  **真正的根子在这里** ✓，不在参数属性那一支 ✗）。
//
// **为什么泛型调用没这个毛病** ✗：`f<number>(1, 2)` 那一刻外面已经是一个 `Method` ✓
//（实参表归它管 ✓，上面那条 `Method` 判据接住了 ✓），而 `new` 这一支在**实例化之前**
// 还没有那层容器 ✓——所以只有 `new` 需要这一条 ✓。实测（第 374 轮）：
// 泛型函数调用 ✓、泛型方法调用 ✓、不带类型实参的 `new` ✓ 全都对 ✓，只有 `new X<T>(…)` ✗。
if (outsideName === "GenericType") {
  const typeOwner = openBracket.Parent;
  if (typeOwner !== null) {
    let at = typeOwner.Data.indexOf(openBracket) - 1;
    // **`new` 必须在跨类型名之前认** ✗（第一版写反了 ✓，实测没生效 ✓）：
    // `new` 本身也是一个 `Identifier`（升级之后是 `Keyword` ✓）✓，
    // 先按「类型名那一格」把它跨过去的话，它永远也认不到 ✓
    //（插桩症状：判据走到了 ✓、`IsWordUnit` 那一句拿到的却是再往前那一格 ✗）。
    while (at > 0) {
      const before = typeOwner.Data[at - 1];
      if (IsWordUnit(before, "new")) {
        return false;
      }
      const beforeName = before === null ? "" : before.constructor.name;
      if (before instanceof Identifier
        || beforeName === "GenericType"
        || beforeName === "PropertyAccess"
        || (before instanceof SymbolToken && before.Is("."))) {
        at = at - 1;
        continue;
      }
      break;
    }
  }
}
return true;
```

## private method HasDeclarationBefore:(units:Array<Token>, index:int)=>bool

`index` 之前的**同一个列表**里有没有一个已经成形的声明头 `Let`。

`let a = 1, b = 2` 里那个 `,` 是**声明符之间的分隔符**，不是逗号表达式。
本规则跑在 `LetCloseRule` 之后，那个 `Let` 就摆在同一个语句列表里，
产物于是成了 `<Statement><Let fieldName="a" /> = <BinaryOperator op=",">1, b</BinaryOperator> = 2</Statement>`
——第二个声明符的名字 `b` 被卷进了一个**逗号表达式**（TS 那边是两个 `VariableDeclaration`，
没有任何 `BinaryExpression`），而且 `= 2` 还落在了那个假表达式外面。
判据只认「列表里已经有一个 `Let`」这一件事：

- 真正的逗号表达式语句（`a, b;` / `i++, j--;`）里不会有 `Let` ✓；
- `let a = (b, c)` / `let a = f(b, c)` 的逗号在括号里，压根不在这个列表上 ✓；
- `for (let i = 0, j = 1; …)` 的逗号在 `for` 的括号里，被上面那条 `for` 判据让开了 ✓。

```ts
for (let i = 0; i < index; i++) {
  const item = Get(units, i);
  if (item !== null && item.constructor.name === "Let") {
    return true;
  }
}
return false;
```

## private method IsValuePositionBitwise:(unit:Token)=>bool

`unit` 是 `|` / `&` 这类**两种位置都有含义**的符号时，判断它此刻处在值位——
也就是「本实例该不该接手」。反过来：不是这类符号（`+ - * /` …）一律返回 `true`，
走原来的路径。

判据只有一条：**这个符号的父单元是不是语句级容器**。

**为什么这一条够用**：类型位的那两个在轮到本规则时已经**被收进节点**了——
`type T = A | B;` 里 `A | B` 属于 `TypeAssign` 的子单元（`const x = a | b;` 里则是语句的直接子单元），
`let v: A & B;` 里属于 `TypeDefine`。所以「父单元是语句」正好把值位那份挑出来。
（实测插桩：值位那一支的符号父单元是 `Statement`，类型位那一支根本不会被问到。）

**不能只看运算符文本**：`ReplaceCountAt` 会把 `a = a | b` 这类复合赋值展开出的符号留在同一层，
而它们与真正的值位位运算同形——所以判据必须落在位置上，不能落在文本上。

```ts
if (!(unit instanceof SymbolToken)) {
  return true;
}
const text = unit.TempToString();
if (text !== "|" && text !== "&" && text !== "^") {
  return true;
}
const parent = unit.Parent;
if (parent === null) {
  return false;
}
// **`EnumMember` 也是值位容器**（第 66 轮第三批）：枚举初始化式是表达式——
// `enum E { A = 1 | 2 }` 的 `|`、`B = A | C` 都要收成位运算。
// 少了这一条，`cases:align` 的 `BinaryExpression` 会多出几处（实测 2 处：
// `decl-enum-computed-member` 与 `enum-initializers` 两个用例）。
if (parent.constructor.name === "EnumMember") {
  return true;
}
return parent.constructor.name === "Statement";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「左操作数 / 运算符 / 右操作数」三个单元（中间夹着的软换行一并吞掉）收成一个 `BinaryOperator`，
**返回新的下标**。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("BinaryOperatorCloseRule.Process: current is null");
}
const beforeIndex = SkipPreviousWrapSymbol(units, index);
const afterIndex = SkipNextWrapSymbol(units, index);
let before = Get(units, beforeIndex);
const after = Get(units, afterIndex);
if (before === null || after === null) {
  throw new Error("BinaryOperatorCloseRule.Process: 两侧缺操作数");
}
// **`?.` 链是一条链，不是一格**（第 156 轮）✗：`o?.b?.c ?? 0` 到这一步时，
// 待处理的是 `Identifier(o)` / `NCO(b)` / `NCO(c)` / `??` / `0` ✓——
// 只看「紧挨着的那一格」会把左操作数取成 `NCO(c)` ✗，
// 于是 `??` 只跟链的**尾巴**结合 ✓，`o` 与 `NCO(b)` 留在外面 ✗
//（实测 XML：`<Identifier>o</Identifier><NCO>b</NCO><BinaryOperator op="??"><NCO>c</NCO>…` ✓），
// 投影投出来只剩前半截 ✓、**静默**给 `{ c: 2 }` ✗（JS 给 `2` ✓）。
//
// **只对 NCO 往前多走** ✓：整条链在这里从来不是一格 ✓（`PropertyAccess` 那条路
// 早就把整条链折成**一个**单元了 ✓，`chainWithOptional` 的注里写着这个不对称 ✓），
// 所以要补的只有 NCO 这一种 ✓——**别的形状一个字都不动** ✓。
// 走到头之后**再收一格**（基名：`Identifier` / `Method` / `PropertyAccess` … ✓），
// 那才是这条链的起点 ✓。
let startIndex = beforeIndex;
// **只在「NCO 前面还是 NCO」时才往前多走** ✓（第 156 轮第二版 ✓）：
// 第一版对**所有** NCO 都往前收 ✓，`cases:tsast` 当场从 1430 掉到 **1428** ✗
//（缺节点 31 / 区间漂移 5 / 多出来 3 ✓）——单条 `?.` 的形状**本来就有投影分支认它** ✓，
// 把基名挪进 `BinaryOperator` 只是把那个形状换成了另一个 ✓，白改 ✗。
// **多 NCO 那条链才是没被认过的** ✓（`o?.b?.c ?? 0` ✓），所以判据收紧到它 ✓：
// 「前面那一格是 NCO ✓，而 NCO 前面**还是** NCO」✓——单条 `?.` 一个字节都不动 ✓。
const beforeBefore = Get(units, SkipPreviousWrapSymbol(units, beforeIndex));
if (before instanceof NullConditionalOperator && beforeBefore instanceof NullConditionalOperator) {
  let cursor = beforeIndex;
  let guard = 0;
  while (guard < 64) {
    guard = guard + 1;
    const previous = Get(units, SkipPreviousWrapSymbol(units, cursor));
    if (previous === null) {
      break;
    }
    cursor = SkipPreviousWrapSymbol(units, cursor);
    if (!(previous instanceof NullConditionalOperator)) {
      break;
    }
  }
  startIndex = cursor;
  before = Get(units, startIndex);
  if (before === null) {
    throw new Error("BinaryOperatorCloseRule.Process: 链的起点没了");
  }
}
// **左操作数是 `As` / `Satisfies` 时要连它的基名一起收进来** ✓（第 288 轮 ✗）——
// 与上面那条 NCO 的走法**同一个形状** ✓，理由也一样 ✓：
// `As` 单元**不装自己的基名** ✗（`as.xl.md` 的 `Data` 只有 `as` **右边**那一段类型 ✓，
// 基名是它在**外层**的前一个兄弟 ✓）。于是 `a as number + 1` 到这一步时是
// `[a, As(number), +, 1]` ✓——只取紧挨着的那一格，`+` 的左操作数就成了 `As` ✗，
// 而 `a` **留在外面** ✗ ⇒ 投影投出来缺整个 `AsExpression` ✓（`a` 与类型接不上 ✓）。
//
// **TS 的口径**：`a as number + 1` 是 **`(a as number) + 1`** ✓——
// 那个 `+` 的左边是**整条 `AsExpression`** ✓，所以这里必须把基名一起吞进去 ✓。
//
// **为什么往回走是安全的** ✗：`As` 的基名**必然是紧挨着的前一格** ✓
//（`Process` 替换的是 `[as, …类型]` 那一段 ✓，左邻就是基名 ✓）；
// 而 `a as B as C` 那种串写是**两格 `As`** ✓——`while` 会一路退到最前面那个基名 ✓。
let asCursor = startIndex;
let asGuard = 0;
while (asGuard < 64) {
  const unit = Get(units, asCursor);
  if (!(unit instanceof As) && !(unit instanceof Satisfies)) {
    break;
  }
  asGuard = asGuard + 1;
  asCursor = SkipPreviousWrapSymbol(units, asCursor);
}
if (asCursor !== startIndex) {
  startIndex = asCursor;
  before = Get(units, startIndex);
  if (before === null) {
    throw new Error("BinaryOperatorCloseRule.Process: `as` 的基名没了");
  }
}
const result = new BinaryOperator(template);
result.Parent = current.Parent;
result.op = this.OperatorText(current);
result.SignIn(before.SourceRange.Start!);
result.SignOut(after.SourceRange.End!);
for (let i = startIndex; i <= afterIndex; i++) {
  const item = Get(units, i);
  if (item !== null && !(item instanceof LineWrap)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, afterIndex - startIndex + 1, result);
```

# class BinaryOperator extends IndependentToken

二元运算 `left op right`。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它覆写了 `ToXmlString`：在基类的串接之外带上 `op` 属性。

## method PrintAst:(ctx:any, v:any)=>any

二元运算 → `BinaryExpression`（**从 `ts-ast.xl.md` 的 `projectBinary` 整块搬来**，第 196 轮）。
`LogicalOperator`（`a && b` 那一段）走的是**同一份实现**，见那个文件的同名方法。

**切在优先级最低的运算符上**（第 88 轮）：与表达式折链那一支同一判据。原来这里取**第一个**
运算符、再把右边整段递归——`error !== null && error !== undefined && …` 那种四段逻辑链
会被折成**右结合**，四个节点的起点落在四个操作数上；而 TS 是左结合，四个节点**都从第一个
操作数起**、终点逐个增长。

**运算符在树里**（这一族是绝大多数）：从 `left` 起按 TS 的结合性折（左结合 / 赋值右结合）。

**两侧都没有时不要发一个空壳**：产物里有一类残缺的 `LogicalOperator`（只有 `op` 属性、
运算符符号根本没进树）——那是 token 层的结构问题，投影这里治不了根，但至少不能凭空造一个
既没有 `left` 也没有 `right` 的 `BinaryExpression`（实测 1118 处）。退回把子单元投出来。

```ts
  const kids = ctx.Kids(v);
  let opIndex = -1;
  let bestRank = 999;
  for (let i = 1; i < kids.length; i++) {
    if (!ctx.IsOperatorUnit(kids[i])) continue;
    const rank = ctx.OperatorRank(ctx.TextOf(kids[i]));
    if (rank < bestRank) {
      bestRank = rank;
      opIndex = i;
    }
  }
  const declaredOp = v.attrs.get("op");
  const left = opIndex > 0 ? ctx.Expression(kids.slice(0, opIndex)) : undefined;
  if (opIndex > 0 && kids[opIndex].get("type") === "SymbolToken") {
    return ctx.FoldBinaryFrom(left, kids.slice(opIndex));
  }
  const right =
    opIndex >= 0 && opIndex + 1 < kids.length ? ctx.Expression(kids.slice(opIndex + 1)) : undefined;
  if (left === undefined && right === undefined) {
    return kids.length > 0 ? ctx.Expression(kids) : undefined;
  }
  const opNode =
    opIndex >= 0
      // **运算符那一格按文本定 kind** ✓（第 550 轮 ✓）：`in` / `instanceof` 在深度界那一层
      // 还是 `Identifier` ✗，`ctx.Project` 会把它投成 `Identifier("in")` ✗
      //（同一个节点同时记「缺 `InKeyword`」与「多出 `Identifier`」✓，见 `operatorTokenOf` ✓）。
      ? ctx.OperatorNode(kids[opIndex])
      : {
          kind: ctx.TokenKind(typeof declaredOp === "string" ? declaredOp : "?"),
          pos: v.start,
          end: v.start,
        };
  return {
    kind: "BinaryExpression",
    left,
    operatorToken: opNode,
    right,
    pos: left ? left.pos : v.start,
    end: right ? right.end : v.end,
  };
```

## constructor:(template:Template)=>void

转调基类构造器，**并且把自己的规则队列装上**。

本单元是收尾规则建出来的，它的内容（左右操作数与运算符）**没有**再被外层扫过一遍，
`KeywordCloseRule` 排在通用队列最后、轮不到它里面的词——
`k in obj` 的 `in`、`x instanceof Y` 的 `instanceof` 于是停在 `Identifier` 上。
挂上类型队列（`../parse-pipeline.xl.md` 的 `InitialKeywordCloseRuleQueue`）之后，
它关闭时会再跑一趟，`KeywordCloseRule` 这一趟就能看见里面的词。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## field op:string = ""

运算符文本（`+` / `*` / `===` / `in` …）。

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `op`。

属性值必须过一遍 `CommonUtil.XmlDecode`：`<=` / `>=` 里的 `<` 直接写进属性会**破坏 XML**
（实测 `expr-compare-lt-le` 这条用例就是这么报出来的：`XML 里出现没转义的 <`）。
`Bracket` 的 `(` / `)` 没有这个问题，所以那边没这一步。

`op` 里装的运算符（`in` / `instanceof`）也**要能升级成关键字**：
本单元是收尾规则建出来的，它的内容不会再被外层扫一遍，所以构造器里挂了
`InitialKeywordCloseRuleQueue`（与 `TypeDefine` / `Export` / `Let` 同一做法）。

```ts
const name = this.constructor.name;
let body = "";
for (const item of this.Data) {
  body = body + item.ToXmlString();
}
return `<${name} op="${CommonUtil.XmlDecode(this.op)}">${body}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 AST JSON 节点：类型名 + 运算符 + 左右操作数。

`op` 键与 XML 属性**同名同源**——都是 `this.op`。差别只在 XML 属性值必须过 `CommonUtil.XmlDecode`
（`<=` / `>=` 里的 `<` 会破坏文档），JSON 字符串没有这个约束，所以直接写字段。
`Data` 里装着的左操作数 / 运算符 / 右操作数照常进 `children`；为空时不写这个键。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("op", this.op);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

**子单元必须一起克隆**：`BinaryOperator` 装着「左操作数 / 运算符 / 右操作数」，
只克隆自己会让产物里出现 `<BinaryOperator op="+" />` 这样的**空壳**——两个操作数整段消失。
克隆只在复合赋值展开（`compound-assignment-operator.xl.md`）里被调用，而被克隆的正是左侧表达式：
`a[b + c] += 1` 展开成 `a[b + c] = a[b + c] + 1`，克隆出来的那个下标里 `b + c` 会丢成空的
（`tests/parse/cases/expressions/expr-compound-assign-clone-operands.ts` 钉住）。

顺序是 `Sign(this)` → 抄 `op` → 子单元逐个克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new BinaryOperator(this.Template);
result.Sign(this);
result.op = this.op;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
