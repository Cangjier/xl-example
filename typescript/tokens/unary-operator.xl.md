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
import { Keyword } from "./keyword.xl.md"
import { Method } from "./method.xl.md"
import { NotNull } from "./not-null.xl.md"
import { PropertyAccess } from "./property-access.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { String } from "./string/string.xl.md"
import { RegexToken } from "./regex-token.xl.md"
import { ObjectLiteral } from "./json/object-literal.xl.md"
import { ArrayLiteral } from "./json/array-literal.xl.md"
import { New } from "./new/new.xl.md"
import { Lamda } from "./lamda/lamda.xl.md"
import { BinaryOperator } from "./binary-operator.xl.md"
import { LogicalOperator } from "./logical-operator.xl.md"
import { NullConditionalOperator } from "./null-conditional-operator.xl.md"
import { As } from "./as.xl.md"
import { Satisfies } from "./satisfies.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

一元运算符：`!x` / `-x` / `+x` / `~x` / `typeof x` / `void x` / `delete x` 与 `x++` / `x--`，
收成一个 `UnaryOperator` 节点（运算符与被操作者都装在里面，`op` 属性记下运算符文本）。

“完整解析 TypeScript”最后一块缺口就是表达式层（见 `tests/parse/known-gaps.json` 的
`_notes.expr-tree-absent`）：二元 / 一元 / 赋值 / 序列 / 括号表达式原本都只有 `SymbolToken` + `Identifier`。
本规则先补**一元**这一支——它的形状最规整：运算符只跟**紧邻的**一个单元。

**只收紧邻的那一个单元**：本工程还没有优先级 / 结合性那一层，`-a.b` 只会把 `a` 收进来、
`.b` 留在外面（与「二元表达式还没有节点」是同一个层次的问题，等二元那一步一起解决）。
`op` 属性把运算符文本记下来，所以下游不必再回到子单元里找。

`UnaryOperatorReorganization` 写在 `UnaryOperator` 之前；
`Root` 会在自己的重组队列里持有 `UnaryOperatorReorganization.Instance`，所以顺序不能反。

# class UnaryOperatorReorganization extends Reorganization

## static readonly field Instance:UnaryOperatorReorganization = new UnaryOperatorReorganization()

唯一的实例。

## private method IsOperand:(unit:Token | null)=>bool

`unit` 能不能当**被操作者**。

能当的：`Identifier` / `Keyword` / `NotNull` / `Method`（`f(x)` 的结果）/ `Bracket`（`(…)` / `[…]`），
以及**一切已经是表达式的节点**——`String` / `RegexToken` / `ObjectLiteral` / `ArrayLiteral` /
`New` / `Lamda` / `UnaryOperator` / `BinaryOperator` / `LogicalOperator` / `NullConditionalOperator`。
`Method` 与 `Bracket` 这两支是「已经是节点的操作数」——`!flag` 里 `flag` 是 `Identifier`，
`!(a > b)` 里是括号，`f(x)!` 与 `!f(x)` 里是 `Method`。

**`-` / `+` 的二义性靠它分野**：`a - b` 里 `-` 前面是 `Identifier`（操作数）→ 那是二元减号，不收；
`x = -1` 里 `-` 前面是 `=`（符号）→ 那是一元负号，收。

**这份名单必须与 `binary-operator.xl.md` 的 `IsOperand` 对齐**（这次是实测补的）：
名单短一截时，`"a" + b` / `` `t` + a `` / `/re/ + a` / `{ k: 1 } + a` / `[1] + a` /
`new C() + a` / `!a + b` / `-a + b` 里那个 `+` / `-` 前面明明是操作数，
却被判成「前面不是操作数」→ 当成**前缀一元**收走，
产物是 `<UnaryOperator op="+">+ b</UnaryOperator>` 而正解是 `BinaryOperator`。
实测量化：这一类占二元缺口的 14 个节点 / 6 个文件，同时是一元「多 33」的来源。

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
    // **前缀运算符那几个词也不算操作数**（第 167 轮）✗：问这个判据的时候
    // `KeywordReorganization` 还没跑 ✓，所以 `typeof` / `void` / `delete` 此刻
    // **还是 `Identifier`** ✓——不排掉的话 `typeof -x` 里那个 `-` 会被读成**二元减** ✗
    //（「前面是操作数」✗），一元那一趟接着折出那个畸形的单元 ✗，
    // 降级层报 `unimplemented: expression TypeOfKeyword` ✓。
    //
    // **为什么不排 `new` / `await`** ✗：`binary-operator.xl.md` 那段写着理由 ✓——
    // `new X * 2` 是合法的 `(new X) * 2` ✓，把它们排掉会真的**少折一个乘法** ✗。
    // `typeof` / `void` / `delete` 不同 ✓：它们**只**做前缀 ✓，折完就是一个独立单元 ✓，
    // 该谁当操作数由那一趟自己接上 ✓（`typeof x * 2` 里 `*` 的左操作数是**折好的** `typeof x` ✓）。
    text === "typeof" ||
    text === "void" ||
    text === "delete"
  ) {
    return false;
  }
  return true;
}
// **关键字里只有 `this` / `super` 是值**（第 167 轮）✗——与 `binary-operator.xl.md`
// 那份 `IsOperand` **对齐** ✓（本文件第 69 行那条纪律写的就是这件事 ✓，
// 只不过「关键字」这一格当时没对齐 ✗）。
//
// **为什么非改不可** ✗：`typeof` / `void` / `delete` / `new` 是**运算符** ✓，
// 它们**不能当被操作者** ✓。把它们算成操作数，会同时坏掉两件事 ✓：
//   · `typeof -x`：`-` 前面被当成了操作数 ✓ → 那个 `-` 被读成**二元减** ✗ →
//     一元那一趟接着把 `typeof` 与「后面的东西」折成同一个单元 ✗ →
//     降级层又报 `unimplemented: expression TypeOfKeyword` ✓；
//   · `typeof typeof x === "string"`：比较那一趟把 `typeof` 当成左操作数 ✓ →
//     折成 `typeof (x === "string")` ✗——**值都变了** ✗（Node 给 `true` ✓、
//     本仓给 `"boolean"` ✗）。**静默错值**是本仓排最前的一档 ✗。
if (unit instanceof Keyword) {
  const word = unit.Value;
  return word === "this" || word === "super";
}
return (
  unit instanceof NotNull ||
  unit instanceof Method ||
  unit instanceof Bracket ||
  unit instanceof String ||
  unit instanceof RegexToken ||
  unit instanceof ObjectLiteral ||
  unit instanceof ArrayLiteral ||
  unit instanceof New ||
  unit instanceof Lamda ||
  unit instanceof UnaryOperator ||
  unit instanceof BinaryOperator ||
  unit instanceof LogicalOperator ||
  unit instanceof NullConditionalOperator ||
  unit instanceof PropertyAccess ||
  // **`As` / `Satisfies` 也是表达式** ✓（第 288 轮 ✗）：`a as number + 1` 在 TS 里是
  // **`(a as number) + 1`** ✓——`as` 那一趟收工之后，`+` 前面站的是**折好的 `As` 单元** ✓。
  // 少了这一格，`+` 会被读成「前面不是操作数」✗ ⇒ **前缀一元加** ✗
  //（产物 `<UnaryOperator op="+">+ 1</UnaryOperator>` ✓，与第 69 行那条纪律写的是同一件事 ✓：
  //  **两份名单必须对齐** ✓，而 `As` 是这一轮才第一次站到那个位置上的 ✓）。
  unit instanceof As ||
  unit instanceof Satisfies
);
```

**`Identifier` 那一支同样要排掉「语句关键字」**（与 `binary-operator.xl.md` 的 `IsOperand` 同一条）：
本规则跑在 `KeywordReorganization`（队列最后）**之前**，`return` 那时还是 `Identifier` ✓。
不排的话 `return -1;` 里 `-` 前面「看起来是操作数」→ 被当成二元减号而放走 ✗，
一元那一支永远收不到它（实测：`UnaryOperator` 差 38 个里 29 个是「方法体里 `return -1`」这种形状）。

`!` / `~` / `typeof` 这些前缀运算符不受影响——它们的 `after` 判定与「前一个是不是操作数」无关 ✓。

## private method IsPrefixSymbol:(current:Token)=>bool

`current` 是不是一个**只可能做前缀**的一元运算符：`!` / `~` / `typeof` / `void` / `delete`。

`-` / `+` 不在其列（它们既是一元也是二元，要再看前面），`++` / `--` 也不在（前缀后缀都行）。

`typeof` / `void` / `delete` 走 `IsWordUnit`：位次上 `KeywordReorganization` 可能已经把
它们升级成 `Keyword` 了，「找一个词」必须 `Identifier` 与 `Keyword` 都认（见 `declaration-common.xl.md`）。

```ts
if (current instanceof SymbolToken) {
  return current.Is("!") || current.Is("~");
}
return IsWordUnit(current, "typeof") || IsWordUnit(current, "void") || IsWordUnit(current, "delete");
```

## private method IsPlusMinus:(current:Token)=>bool

`current` 是不是 `-` 或 `+`（既可能是一元也可能是一元以外的运算）。

```ts
return current instanceof SymbolToken && (current.Is("-") || current.Is("+"));
```

## private method IsPlusPlus:(current:Token)=>bool

`current` 是不是 `++` / `--`（前缀、后缀都算）。

```ts
return current instanceof SymbolToken && (current.Is("++") || current.Is("--"));
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个一元运算符的起点。

三种命中：

- 只可能做前缀的（`!` / `~` / `typeof` / `void` / `delete`）：后面是操作数即可；
- `-` / `+`：后面是操作数，**而且前面不是操作数**（否则那是二元加减）；
- `++` / `--`：前面或后面是操作数即可。

`!x` 与「非空断言 `x!`」的分别由 `NotNullReorganization` 负责（它只认后面那种），
两边不会抢：`!` 做前缀时它那边不成立，本规则才接手。

**类型参数列表里的 `typeof` 不是一元运算**：`<Request extends typeof IncomingMessage = typeof IncomingMessage>`
里的 `typeof X` 在 TypeScript 的 AST 里是 `TypeQueryNode`（类型查询），**不**产生 `PrefixUnaryExpression`。
父单元是 `GenericType` 时一律不成立——实测 `@types/node/http.d.ts` 20 处、`http2.d.ts` 82 处
全是这个形状（与 `MethodReorganization` 挡「类型实参段里的调用」是同一个道理）。

**`Parent === null` 时的 `typeof` 也要挡**（第 57 轮补）：词法阶段收编类型实参段的那一趟，
这段文本**还没挂到任何父单元上**（`Parent` 是 `null`，见 `../generic-type.xl.md`），
所以上面那条 `instanceof GenericType` 在那一刻问不出东西来——等它挂上去时，
`UnaryOperator` 已经造好了（实测 `let v: Wrap<typeof x>` 的产物里，
泛型段内部是 `<UnaryOperator op="typeof">`，而同样一段类型写在标注位
（`let v: typeof x`）却是 `<Keyword>typeof</Keyword><Identifier>x</Identifier>` ✗ 同构不同形）。
实测全语料里 `Parent === null` 的一元折 **只有 `op=typeof`**（其余 `!` / `-` / `void` / `delete`
的折都发生在 `Statement` / `Bracket` 父单元下，不受这条影响）。

**下标访问的类型位**（第 61 轮补）：`ReturnType<any[][typeof Symbol.iterator]>` 里的 `typeof`
也在类型位（TS 那边同样是 `TypeQueryNode`），可它的父单元是 `[` 括号，前面那两条都问不出来。
`[` 括号的 `Context` 是 `DecideBracketContext` 算出来的（覆盖 `{` / `[`），所以直接问它 ✓。
**只加 `[`，不加 `(`**：`(` 的 `Context` 一律为空串，第 57 轮把它纳进来时
`for (; i < n; i++)` 的循环头被判成类型位、`i++` / `-1` 那些真一元运算当场少了 17 个。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (current.Parent instanceof GenericType) {
  return false;
}
if (current.Parent === null && this.OperatorText(current) === "typeof") {
  return false;
}
if (current.Parent instanceof Bracket && current.Parent.startBracket === "[" && current.Parent.Context === "type") {
  // **下标访问的类型位**：`ReturnType<any[][typeof Symbol.iterator]>` 那个 `typeof` 是类型查询，
  // 不是一元运算（实测 `@types/node/compatibility/iterators.d.ts`）。`[` 括号的 `Context`
  // 由 `DecideBracketContext` 算得出来（它覆盖 `{` / `[`），所以这一条问得准；
  // **只管 `[`**：`(` 的 Context 一律是空串，硬加会把 `for (…; …; i++)` 的循环头算进来（第 57 轮踩过）。
  return false;
}
if ((this.OperatorText(current) === "-" || this.OperatorText(current) === "+") && this.IsInMappedType(current)) {
  // `-readonly` / `+readonly` 是**映射类型的修饰符**，不是一元运算
  // （实测 `{ -readonly [K in keyof T]-?: T[K] }` 的产物里有个 `<UnaryOperator op="-">`）。
  // 映射类型的内容全是类型（键、`as` 子句、值类型），里面出现一元运算一定是误判。
  return false;
}
const afterIndex = SkipNextWrapSymbol(units, index);
const after = Get(units, afterIndex);
if (this.IsPrefixSymbol(current)) {
  // **后面那一格是「另一个前缀运算符」时也要接** ✓（第 169 轮）——
  // `Process` 会**先把里面那一处折完** ✓（就地递归 ✓），再把折好的单元当自己的操作数 ✓。
  //
  // **为什么不能只写 `IsOperand(after)`** ✗：第 167 轮把前缀关键字从操作数里排掉之后 ✓，
  // `typeof typeof x` 的外层在这里就**直接不成立了** ✗（`IsOperand(内层 typeof)` 是假 ✓），
  // 于是那一趟根本不会跑 ✓——上面那套「就地折里面」的改动**一次都没被走到** ✗
  //（实测：改完 `typeof typeof x === "string"` 还是给 `"boolean"` ✗）。
  // **前后是一条链** ✓：`IsOperand` 收紧 → 这一格就得补上「前缀后面还是前缀」那一支 ✓。
  if (after !== null
    && (this.IsPrefixSymbol(after) || this.IsPlusPlus(after) || this.IsPlusMinus(after))) {
    return true;
  }
  return this.IsOperand(after);
}
if (this.IsPlusPlus(current)) {
  if (this.IsOperand(after)) {
    return true;
  }
  return this.IsOperand(Get(units, SkipPreviousWrapSymbol(units, index)));
}
if (this.IsPlusMinus(current) === false) {
  return false;
}
if (this.IsOperand(after) === false) {
  return false;
}
return this.IsOperand(Get(units, SkipPreviousWrapSymbol(units, index))) === false;
```

## private method IsInMappedType:(unit:Token)=>bool

这个单元在不在一个 `MappedType` 里（往上找三层）。

映射类型的成员会先被包进一个 `<Statement>`（`Unit → Statement → MappedType`），
所以要往上走两三层才看得到它；用**类名**判定（`mapped-type.xl.md` 引本文件、本文件引它会绕出环，
与 `statement.xl.md` 里 `Let` 那条同一个理由）。

```ts
let node:Token | null = unit;
for (let hop = 0; hop < 3 && node !== null; hop++) {
  node = node.Parent;
  if (node !== null && node.constructor.name === "MappedType") {
    return true;
  }
}
return false;
```

## private method OperatorText:(current:Token)=>string

运算符的文本：`SymbolToken` / `Identifier` 用 `TempToString()`，`Keyword` 用它的 `Value`
（三种都要认：`typeof` 这类词可能在别的位次上已经升级成 `Keyword` 了）。

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

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把运算符与它的被操作者收成一个 `UnaryOperator`，**返回新的下标**。

取被操作者分两路：**后面**那个（前缀）优先，否则取**前面**那个（后缀）。
两路都取不到就把下标往前推一格（本规则不改动任何单元）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("UnaryOperatorReorganization.Process: current is null");
}
const afterIndex = SkipNextWrapSymbol(units, index);
let after = Get(units, afterIndex);
// **套着写的前缀：先把里面那一处折完**（第 169 轮）✓。
//
// `typeof typeof x` 的外层这一趟，「被操作者」其实是**里面那一处折出来的单元** ✓。
// 第 166 轮的做法是「先放过、下一趟再折」✗——第 168 轮查出它会在**同一趟里被别的规则
// 抢先**（`===` 把内层折进比较式 ✓，下一趟外层只好把整个比较式当操作数 ✗ → 静默错值 ✗）。
// 所以改成**在同一趟里就地递归折一次** ✓：折完 `units[index + 1]` 就是一个折好的单元 ✓，
// 下面那条「后面那个是操作数」的路照走 ✓。
//
// **递归会停** ✓：链的**最里面**那一处后面接的是真操作数 ✓（`typeof -x` 里 `-` 后面是 `x` ✓），
// 它按普通前缀折完返回 ✓；`typeof typeof` 这种缺操作数的写法只会多走一格 ✓（不折 ✓、不循环 ✓）。
if (after !== null
  && (this.IsPrefixSymbol(after) || this.IsPlusPlus(after) || this.IsPlusMinus(after))) {
  this.Process(template, units, afterIndex);
  after = Get(units, SkipNextWrapSymbol(units, index));
}
if (this.IsOperand(after)) {
  const result = new UnaryOperator(template);
  result.Parent = current.Parent;
  result.op = this.OperatorText(current);
  result.SignIn(current.SourceRange.Start!);
  result.SignOut(after!.SourceRange.End!);
  result.AddAndCloseLast(current);
  for (let i = index + 1; i <= afterIndex; i++) {
    const item = Get(units, i);
    if (item !== null && !(item instanceof LineWrap)) {
      result.AddAndCloseLast(item);
    }
  }
  result.TryToClose();
  return ReplaceCountAt(units, index, afterIndex - index + 1, result);
}
const beforeIndex = SkipPreviousWrapSymbol(units, index);
const before = Get(units, beforeIndex);
if (this.IsOperand(before)) {
  const result = new UnaryOperator(template);
  result.Parent = current.Parent;
  result.op = this.OperatorText(current);
  result.SignIn(before!.SourceRange.Start!);
  result.SignOut(current.SourceRange.End!);
  for (let i = beforeIndex; i < index; i++) {
    const item = Get(units, i);
    if (item !== null && !(item instanceof LineWrap)) {
      result.AddAndCloseLast(item);
    }
  }
  result.AddAndCloseLast(current);
  result.TryToClose();
  return ReplaceCountAt(units, beforeIndex, index - beforeIndex + 1, result);
}
return index + 1;
```

# class UnaryOperator extends IndependentToken

一元运算 `op expr` 或 `expr op`。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它覆写了 `ToXmlString`：在基类的串接之外带上 `op` 属性。

## method PrintAst:(ctx:any, v:any)=>any

一元运算 → `PrefixUnaryExpression` 或 `PostfixUnaryExpression`
（**从 `ts-ast.xl.md` 的 `projectUnary` 整块搬来**，第 193 轮）。

**前后缀是两种 kind**（TS：`-x` 是 `PrefixUnaryExpression`、`y++` 是 `PostfixUnaryExpression`）。
产物那边两者都是 `UnaryOperator op="…"`，判据是**运算符单元在操作数之前还是之后**：
`y++` 的 `++` 排在 `y` 后面 ⇒ 后缀。

**只给 `operand` 一个字段**：TS 那边运算符（`operator`）是节点的**属性**、不是子节点字段，
所以 `ts.forEachChild` 看不到它。产物那边的 `SymbolToken` 也照此**不投影**。

**`typeof` / `void` / `delete` 是 `Keyword`**，不在 `isOperatorUnit` 的白名单里
（那一支只认 `SymbolToken` 与 `in` / `instanceof`），所以它们要靠 `op` **属性**定位——
否则那个运算符词会被当成操作数投出去（实测多出 `TypeOfKeyword` + 缺 `Identifier`）。

而且那三个是**三种独立的表达式 kind**（第 96 轮）：TS 里它们是
`TypeOfExpression` / `VoidExpression` / `DeleteExpression`（只有 `expression` 一个字段、
运算符词**不进子节点**），而 `!` / `-` / `+` / `~` / `++` / `--` 才是
`PrefixUnaryExpression` / `PostfixUnaryExpression`。

```ts
  const kids = ctx.Kids(v);
  const declaredOp = typeof v.attrs.get("op") === "string" ? v.attrs.get("op") : "";
  let opIndex = kids.findIndex((k: any) => ctx.IsOperatorUnit(k));
  if (opIndex < 0 && declaredOp !== "") {
    opIndex = kids.findIndex((k: any) => ctx.TextOf(k) === declaredOp);
  }
  const operandKids = opIndex >= 0 ? kids.filter((_: any, i: number) => i !== opIndex) : kids;
  const operand = ctx.Expression(operandKids);
  const isPostfix = opIndex >= 0 && opIndex === kids.length - 1;
  if (!isPostfix) {
    const wordKinds: any = {
      typeof: "TypeOfExpression",
      void: "VoidExpression",
      delete: "DeleteExpression",
    };
    const wordKind = wordKinds[declaredOp];
    if (wordKind !== undefined) return ctx.Node(wordKind, { expression: operand }, v);
  }
  // **`operator` 要带上**（第 66 轮）：TS 的 `PrefixUnaryExpression.operator` 是个
  // `SyntaxKind` **数字**，投影原来「只留节点型字段」就把它丢了——于是 `-1` 与 `!x`
  // 在产物里**一模一样**，**负数字面量根本用不了**（降级层分不出正负，只能抛）。
  //
  // 这里放**运算符文本**（优先取那个运算符单元自己的文本，取不到再用 `declaredOp`）。
  // 对拍尺子只比**字段名**（TS 那边也有 `operator` 这个名字），所以不会多报。
  //
  // **值位的一元节点是在这一层造的**，不在 `print-ast-common` 那条通用路里——
  // 我在那边先后加过两处挂钩，从来没执行过（第 64 / 65 / 66 轮实测才定位到这里）。
  const operatorText = opIndex >= 0 ? ctx.TextOf(kids[opIndex]) : declaredOp;
  return ctx.Node(isPostfix ? "PostfixUnaryExpression" : "PrefixUnaryExpression",
    { operand, operator: operatorText }, v);
```

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## field op:string = ""

运算符文本（`!` / `-` / `typeof` / `++` …）。

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `op`。

```ts
const name = this.constructor.name;
let body = "";
for (const item of this.Data) {
  body = body + item.ToXmlString();
}
return `<${name} op="${CommonUtil.XmlDecode(this.op)}">${body}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 AST JSON 节点：类型名 + 运算符 + 被操作者。

`op` 键与 XML 属性**同名同源**——都是 `this.op`；XML 那边过 `CommonUtil.XmlDecode` 是为了防 `<` 破坏文档，
JSON 字符串没有这个约束，所以直接写字段。
运算符与被操作者作为子单元进 `children`；为空时不写这个键。

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

**子单元必须一起克隆**：`UnaryOperator` 装着「运算符 + 操作数」，只克隆自己会让产物里出现
`<UnaryOperator op="!" />` 这样的**空壳**——操作数整段消失。克隆只在复合赋值展开
（`x = -a; x += 1` 那类形状里左侧若含一元运算，见 `compound-assignment-operator.xl.md`）
里被调用。

顺序是 `Sign(this)` → 抄 `op` → 子单元逐个克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new UnaryOperator(this.Template);
result.Sign(this);
result.op = this.op;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
