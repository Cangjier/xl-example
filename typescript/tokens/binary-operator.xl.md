# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
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
import { String } from "./string/string.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { UnaryOperator } from "./unary-operator.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

二元运算：`a + b` / `a * b` / `a === b` / `a << b` / `k in obj` 这类，
收成一个 `BinaryOperator` 节点（左操作数、运算符、右操作数都装在里面，`op` 属性记下运算符文本）。

「完整解析 TypeScript」最后一块缺口就是表达式层（`tests/parse/known-gaps.json` 的
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

`BinaryOperatorReorganization` 写在 `BinaryOperator` 之前；
`Root` 会在自己的重组队列里持有这些实例，所以顺序不能反。

# class BinaryOperatorReorganization extends Reorganization

## constructor:(operators:Array<string>)=>void

一个实例负责**一个优先级层**的一组运算符（`["*", "/", "%"]` 这样）。

列表存进 `Operators` 字段；`Instance` 之外的实例都由 `ParsePipeline.GeneralReorganize` 直接 `new` 出来。

```ts
super();
this.Operators = operators;
```

## field Operators:Array<string> = []

本实例负责的运算符文本。

## static readonly field PowerInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["**"])

乘方（最高优先级）。

## static readonly field MultiplicativeInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["*", "/", "%"])

乘除取余。

## static readonly field AdditiveInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["+", "-"])

加减。

## static readonly field ShiftInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["<<", ">>", ">>>"])

移位。

## static readonly field RelationalInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["<=", ">="])

大小比较。**只收 `<=` / `>=`**：单独的 `<` / `>` 与泛型实参同形，
`GenericTypeBranch` 在词法阶段就要靠它们配对，语法层再动它们会互相打坏。

## static readonly field EqualityInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["==", "!=", "===", "!=="])

相等比较。

## static readonly field InInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["in"])

`k in obj`（`in` 是关键字，见 `../parse-pipeline.xl.md` 的 `KeyWords`）。

## static readonly field InstanceofInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["instanceof"])

`x instanceof C`。

## static readonly field LogicalAssignmentInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["&&", "||"])

`&&=` / `||=` 展开出来的那一步。

`CompoundAssignmentOperatorReorganization` 把 `a &&= b` 展开成 `a = a && b` 时，
中间那个 `&&` 是本规则（`BinaryOperator`）收的——但普通的 `a && b` 走的是 `LogicalOperator`，
于是**同一族运算符在两种来源下落到不同节点**（实测：`a &&= b` 的产物是
`<LogicalOperator op="And">`，而 TypeScript 把它记成 `BinaryExpression` +
`AmpersandAmpersandEqualsToken`）。这一支让它统一折成 `BinaryOperator`。

`SymbolToken.FromCompoundAssignment` 标记正好是判据：只有**复合赋值切开后插回来的**那份运算符
带这个标记，所以 `IsOperator` 认它、而普通的 `a && b` 仍然照旧走 `LogicalOperator`。

## static readonly field CommaInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization([","])

逗号（序列）表达式 `(a, b)`，优先级最低。

**这一支必须有额外判据**（`IsCommaExpressionComma`），因为 `,` 在 TypeScript 里
绝大多数场合**不是运算符**：函数参数表、调用实参表、数组字面量、对象字面量、
变量声明的多声明符、`for` 子句——它们的分隔符都是 `,`。
判据只认一种形状：**`(` 括号内部的顶层 `,`**（参数表 / 实参表同样是 `(`，靠调用方排除）。

## static readonly field BitwiseInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["|", "&", "^"])

位运算 `a | b` / `a & b` / `a ^ b`（值位）。

**这一支只收「父单元是语句」的那种**（见 `IsValuePositionBitwise` 的说明）：
`|` / `&` 在类型位另有含义（联合 / 交叉类型），类型位的那两个在轮到本规则时
**已经被 `TypeAssign` / `TypeDefine` 收进节点里**，不再是同层单元，所以按「父单元是不是语句」
就能把两种位置分开。`^` 只有值位一种含义，但也一并走这条判据，保持一处逻辑。

优先级放在相等比较与 `in` 之间（与 TypeScript 的 `&` > `^` > `|` 简化成一层：
真实代码里混写这三种且不写括号的情况极少，拆成三层收益不成比例）。

## static readonly field NullishInstance:BinaryOperatorReorganization = new BinaryOperatorReorganization(["??"])

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
    text === "yield"
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
  unit instanceof NullConditionalOperator
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

**`Identifier` 那一支要排掉「语句关键字」**（这一条是实测补的）：本规则跑在 `KeywordReorganization`
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
与 `MethodReorganization` / `UnaryOperatorReorganization` 同一条判据）。

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
if (this.IsValuePositionBitwise(current) === false) {
  return false;
}
if (this.IsCommaExpressionComma(units, index) === false) {
  return false;
}
if (this.IsOperator(current) === false) {
  return false;
}
if (this.IsOperand(Get(units, SkipPreviousWrapSymbol(units, index))) === false) {
  return false;
}
return this.IsOperand(Get(units, SkipNextWrapSymbol(units, index)));
```

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
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof Bracket) {
    openBracket = item;
    outside = i > 0 ? Get(units, i - 1) : null;
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
return true;
```

## private method HasDeclarationBefore:(units:Array<Token>, index:int)=>bool

`index` 之前的**同一个列表**里有没有一个已经成形的声明头 `Let`。

`let a = 1, b = 2` 里那个 `,` 是**声明符之间的分隔符**，不是逗号表达式。
本规则跑在 `LetReorganization` 之后，那个 `Let` 就摆在同一个语句列表里，
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
  throw new Error("BinaryOperatorReorganization.Process: current is null");
}
const beforeIndex = SkipPreviousWrapSymbol(units, index);
const afterIndex = SkipNextWrapSymbol(units, index);
const before = Get(units, beforeIndex);
const after = Get(units, afterIndex);
if (before === null || after === null) {
  throw new Error("BinaryOperatorReorganization.Process: 两侧缺操作数");
}
const result = new BinaryOperator(template);
result.Parent = current.Parent;
result.op = this.OperatorText(current);
result.SignIn(before.SourceRange.Start!);
result.SignOut(after.SourceRange.End!);
for (let i = beforeIndex; i <= afterIndex; i++) {
  const item = Get(units, i);
  if (item !== null && !(item instanceof LineWrap)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, beforeIndex, afterIndex - beforeIndex + 1, result);
```

# class BinaryOperator extends IndependentToken

二元运算 `left op right`。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它覆写了 `ToXmlString`：在基类的串接之外带上 `op` 属性。

## constructor:(template:Template)=>void

转调基类构造器，**并且把自己的重组队列装上**。

本单元是重组规则建出来的，它的内容（左右操作数与运算符）**没有**再被外层扫过一遍，
`KeywordReorganization` 排在通用队列最后、轮不到它里面的词——
`k in obj` 的 `in`、`x instanceof Y` 的 `instanceof` 于是停在 `Identifier` 上。
挂上类型队列（`../parse-pipeline.xl.md` 的 `InitialKeywordReorganizationQueue`）之后，
它关闭时会再跑一趟，`KeywordReorganization` 这一趟就能看见里面的词。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## field op:string = ""

运算符文本（`+` / `*` / `===` / `in` …）。

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `op`。

属性值必须过一遍 `CommonUtil.XmlDecode`：`<=` / `>=` 里的 `<` 直接写进属性会**破坏 XML**
（实测 `expr-compare-lt-le` 这条用例就是这么报出来的：`XML 里出现没转义的 <`）。
`Bracket` 的 `(` / `)` 没有这个问题，所以那边没这一步。

`op` 里装的运算符（`in` / `instanceof`）也**要能升级成关键字**：
本单元是重组规则建出来的，它的内容不会再被外层扫一遍，所以构造器里挂了
`InitialKeywordReorganizationQueue`（与 `TypeDefine` / `Export` / `Let` 同一做法）。

```ts
const name = this.constructor.name;
let body = "";
for (const item of this.Data) {
  body = body + item.ToXmlString();
}
return `<${name} op="${CommonUtil.XmlDecode(this.op)}">${body}</${name}>`;
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
