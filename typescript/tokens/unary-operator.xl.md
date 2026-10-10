# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousTrivia, SkipPreviousWrapSymbol, StartsWithTemplate } from "../text-common-util.xl.md"
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
import { Class } from "./class/class.xl.md"
import { Function } from "./function/function.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

一元运算符：`!x` / `-x` / `+x` / `~x` / `typeof x` / `void x` / `delete x` 与 `x++` / `x--`，
收成一个 `UnaryOperator` 节点（运算符与被操作者都装在里面，`op` 属性记下运算符文本）。

“完整解析 TypeScript”最后一块缺口就是表达式层：二元 / 一元 / 赋值 / 序列 / 括号表达式原本都只有 `SymbolToken` + `Identifier`。
本规则先补**一元**这一支——它的形状最规整：运算符只跟**紧邻的**一个单元。

**只收紧邻的那一个单元**：本工程还没有优先级 / 结合性那一层，`-a.b` 只会把 `a` 收进来、
`.b` 留在外面（与「二元表达式还没有节点」是同一个层次的问题，等二元那一步一起解决）。
`op` 属性把运算符文本记下来，所以下游不必再回到子单元里找。

`UnaryOperatorCloseRule` 写在 `UnaryOperator` 之前；
`Root` 会在自己的规则队列里持有 `UnaryOperatorCloseRule.Instance`，所以顺序不能反。

# class UnaryOperatorCloseRule extends CloseRule

## static readonly field Instance:UnaryOperatorCloseRule = new UnaryOperatorCloseRule()

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
    // **前缀运算符那几个词也不算操作数**（第 167 轮）：问这个判据的时候
    // `KeywordCloseRule` 还没跑，所以 `typeof` / `void` / `delete` 此刻
    // **还是 `Identifier`**——不排掉的话 `typeof -x` 里那个 `-` 会被读成**二元减**
    //（「前面是操作数」），一元那一趟接着折出那个畸形的单元，
    // 降级层报 `unimplemented: expression TypeOfKeyword`。
    //
    // **为什么不排 `new` / `await`**：`binary-operator.xl.md` 那段写着理由——
    // `new X * 2` 是合法的 `(new X) * 2`，把它们排掉会真的**少折一个乘法**。
    // `typeof` / `void` / `delete` 不同：它们**只**做前缀，折完就是一个独立单元，
    // 该谁当操作数由那一趟自己接上（`typeof x * 2` 里 `*` 的左操作数是**折好的** `typeof x`）。
    text === "typeof" ||
    text === "void" ||
    text === "delete"
  ) {
    return false;
  }
  return true;
}
// **关键字里只有 `this` / `super` 是值**（第 167 轮）——与 `binary-operator.xl.md`
// 那份 `IsOperand` **对齐**（本文件第 69 行那条纪律写的就是这件事，
// 只不过「关键字」这一格当时没对齐）。
//
// **为什么非改不可**：`typeof` / `void` / `delete` / `new` 是**运算符**，
// 它们**不能当被操作者**。把它们算成操作数，会同时坏掉两件事：
//   · `typeof -x`：`-` 前面被当成了操作数 → 那个 `-` 被读成**二元减** →
//     一元那一趟接着把 `typeof` 与「后面的东西」折成同一个单元 →
//     降级层又报 `unimplemented: expression TypeOfKeyword`；
//   · `typeof typeof x === "string"`：比较那一趟把 `typeof` 当成左操作数 →
//     折成 `typeof (x === "string")`——**值都变了**（Node 给 `true`、
//     本仓给 `"boolean"`）。**静默错值**是本仓排最前的一档。
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
  // **`As` / `Satisfies` 也是表达式**（第 288 轮）：`a as number + 1` 在 TS 里是
  // **`(a as number) + 1`**——`as` 那一趟收工之后，`+` 前面站的是**折好的 `As` 单元**。
  // 少了这一格，`+` 会被读成「前面不是操作数」 ⇒ **前缀一元加**
  //（产物 `<UnaryOperator op="+">+ 1</UnaryOperator>`，与第 69 行那条纪律写的是同一件事：
  //  **两份名单必须对齐**，而 `As` 是这一轮才第一次站到那个位置上的）。
  unit instanceof As ||
  unit instanceof Satisfies ||
  // **类表达式也是操作数**（第 328 轮）：`typeof class C { }` 在 TS 里是
  // `TypeOfExpression(ClassExpression)`（**与 `typeof { }` 同一族**，第 233 轮那一格）。
  // 少了它，`IsOperand` 给假 ⇒ `typeof` **折不起来** ⇒ 投影只吐一个光秃秃的
  // `TypeOfKeyword`（实测：TS 节点 10、投影 8，缺的正是 `TypeOfExpression` 与它下面的
  // `ClassExpression` / `Identifier`），降级层报 `unimplemented: expression TypeOfKeyword`
  //（听起来像「`typeof` 没实现」——**别的 `typeof` 全是好的**）。
  // **两份名单一起补**（本文件第 69 行那条纪律）：`x + class { }` 是合法的 JS，
  // 二元那一份少了它，`+` 就会被**一元**那一趟抢走（`UnaryOperator op="+"`）。
  unit instanceof Class ||
  // **函数表达式也是操作数**（第 692 轮）：`typeof function () {}` 在 TS 里是
  // `TypeOfExpression(FunctionExpression)`——与 `typeof class C { }`（第 328 轮）
  // **一字不差的同一族**，第 328 轮补的是 `Class`、漏的是 `Function`。
  // **少了它的症状**：`typeof function () { }` 折不起来 ⇒ 投影只吐一个光秃秃的
  // `TypeOfKeyword`（**后面那个函数整格丢**），降级层报
  // `unimplemented: expression TypeOfKeyword`（听起来像「`typeof` 没实现」——
  // 别的 `typeof` 全是好的）；`!function () {}` 同理（那一刻还不是 `UnaryOperator`，
  // 报的是 `unimplemented: expression ExclamationToken`）；
  // 而 `function () {} + 1` 更远：`+` 被当**前缀一元** ⇒ 那一格按
  // `FunctionDeclaration` 投出去，降级层报 `unimplemented: expression FunctionDeclaration`。
  // **为什么它安全**（与 `Class` 同一份理由）：函数**声明**虽然也是同一个 `Function`
  // 单元，但语句各自是一个容器（`Statement` / `Root`），`SkipPreviousWrapSymbol`
  // 在同一个容器里走不到别条语句的 `Function`——实测 `function f() {} ++n;` 与
  // `class A {} ++n;` 的产物都还是「`++` 当**前缀**」（`postfixHere` 不成立）。
  unit instanceof Function
);
```

**`Identifier` 那一支同样要排掉「语句关键字」**（与 `binary-operator.xl.md` 的 `IsOperand` 同一条）：
本规则跑在 `KeywordCloseRule`（队列最后）**之前**，`return` 那时还是 `Identifier`。
不排的话 `return -1;` 里 `-` 前面「看起来是操作数」→ 被当成二元减号而放走，
一元那一支永远收不到它（实测：`UnaryOperator` 差 38 个里 29 个是「方法体里 `return -1`」这种形状）。

`!` / `~` / `typeof` 这些前缀运算符不受影响——它们的 `after` 判定与「前一个是不是操作数」无关。

## private method IsMetaName:(unit:Token | null)=>bool

`unit` 能不能当 `import.meta` / `new.target` 里那**一格名字**。

四种形态：裸名字（`Identifier`）、升级过的词（`Keyword`，`default` 那种）、
**已经折好的成员链**（`import.meta.url` 的 `meta.url`）、以及调用（`new.target.name()`）。

```ts
if (unit === null) {
  return false;
}
return (
  unit instanceof Identifier ||
  unit instanceof Keyword ||
  unit instanceof PropertyAccess ||
  unit instanceof Method
);
```

## private method MetaHeadWord:(unit:Token | null)=>string

`unit` 是不是 `import.meta` / `new.target` 的**头一个词**；是就给那个词，否则给空串。

两种形态都要认：`KeywordCloseRule` 还没跑时它是 `Identifier`（`Process` 的常态），
跑过之后是 `Keyword`（第二趟进来时）。

```ts
if (unit === null) {
  return "";
}
if (unit instanceof Identifier) {
  const text = unit.TempToString();
  if (text === "import" || text === "new") {
    return text;
  }
  return "";
}
if (unit instanceof Keyword) {
  const word = unit.Value;
  if (word === "import" || word === "new") {
    return word;
  }
}
return "";
```

## private method IsPrefixSymbol:(current:Token)=>bool
`current` 是不是一个**只可能做前缀**的一元运算符：`!` / `~` / `typeof` / `void` / `delete`。

`-` / `+` 不在其列（它们既是一元也是二元，要再看前面），`++` / `--` 也不在（前缀后缀都行）。

`typeof` / `void` / `delete` 走 `IsWordUnit`：位次上 `KeywordCloseRule` 可能已经把
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

## private method HasChainLinkAfter:(units:Array<Token>, index:int)=>bool

`index` 这一格后面**还接着 `.` 成员**吗（链环的另一种——`[` 下标——见 `Process` 那一处：它收工之后已经是 `ArrayLiteral`）。

```ts
const nextIndex = SkipNextWrapSymbol(units, index);
const next = Get(units, nextIndex);
if (!(next instanceof SymbolToken) || !next.Is(".")) {
  return false;
}
return Get(units, SkipNextWrapSymbol(units, nextIndex)) !== null;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个一元运算符的起点。

三种命中：

- 只可能做前缀的（`!` / `~` / `typeof` / `void` / `delete`）：后面是操作数即可；
- `-` / `+`：后面是操作数，**而且前面不是操作数**（否则那是二元加减）；
- `++` / `--`：前面或后面是操作数即可。

`!x` 与「非空断言 `x!`」的分别由 `NotNullCloseRule` 负责（它只认后面那种），
两边不会抢：`!` 做前缀时它那边不成立，本规则才接手。

**类型参数列表里的 `typeof` 不是一元运算**：`<Request extends typeof IncomingMessage = typeof IncomingMessage>`
里的 `typeof X` 在 TypeScript 的 AST 里是 `TypeQueryNode`（类型查询），**不**产生 `PrefixUnaryExpression`。
父单元是 `GenericType` 时一律不成立——实测 `@types/node/http.d.ts` 20 处、`http2.d.ts` 82 处
全是这个形状（与 `MethodCloseRule` 挡「类型实参段里的调用」是同一个道理）。

**`Parent === null` 时的 `typeof` 也要挡**（第 57 轮补）：词法阶段收编类型实参段的那一趟，
这段文本**还没挂到任何父单元上**（`Parent` 是 `null`，见 `../generic-type.xl.md`），
所以上面那条 `instanceof GenericType` 在那一刻问不出东西来——等它挂上去时，
`UnaryOperator` 已经造好了（实测 `let v: Wrap<typeof x>` 的产物里，
泛型段内部是 `<UnaryOperator op="typeof">`，而同样一段类型写在标注位
（`let v: typeof x`）却是 `<Keyword>typeof</Keyword><Identifier>x</Identifier>` 同构不同形）。
实测全语料里 `Parent === null` 的一元折 **只有 `op=typeof`**（其余 `!` / `-` / `void` / `delete`
的折都发生在 `Statement` / `Bracket` 父单元下，不受这条影响）。

**下标访问的类型位**（第 61 轮补）：`ReturnType<any[][typeof Symbol.iterator]>` 里的 `typeof`
也在类型位（TS 那边同样是 `TypeQueryNode`），可它的父单元是 `[` 括号，前面那两条都问不出来。
`[` 括号的 `Context` 是 `DecideBracketContext` 算出来的（覆盖 `{` / `[`），所以直接问它。
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
const afterIndex = SkipNextTrivia(units, index);
const after = Get(units, afterIndex);
// **半截的链要等链成形**（第 614 轮）：操作数那一格是 `NotNull`、而它后面**还接着链环**
// （`.` 成员 / `[` 下标） ⇒ 这一趟让路。
//
// **为什么**：`typeof o!.get` 的正确形状是 `TypeOfExpression > PropertyAccessExpression`——
// 一元运算的作用范围是**整条链**（等于 `typeof (o!.get)`）。可跑到这一格时 `o!` 已经
// 被 `NotNullCloseRule` 收成了一个 `NotNull`（队列次序：`NotNull` 在**本规则之前**），
// 于是这一趟当场把 `typeof` 与那个 `NotNull` 收成一个单元 ⇒ `IsChainBase` 在那一格
// 只看得见 `UnaryOperator` ⇒ 链从 `.get` 另起（实测产物三格平级：
// `UnaryOperator[Keyword(typeof), NotNull]` + `SymbolToken(.)` + `Keyword(get)`，
//  TS 侧缺 `PropertyAccessExpression` / `CallExpression`）。
//
// **让路之后**：链规则**下一趟**把 `[NotNull, ., get]` 收成链，再下一趟一元那一趟
// 看到的是**一个完整的链** —— 与 TS 逐格相同。
//
// **为什么放在三个分支之前**：这一格对**每一种**一元运算符都成立（`typeof` / `void` /
// `delete` / `!` / `~` / `-` / `+` / `++`）——`-o!.n` 与 `typeof o!.n` 是同一个形状问题，
// 挡在分支里就要抄四份。
//
// **只认 `.` 与 `[`**：调用括号 `(` 由 `Process` 那一支自己吃（`typeof o!()` 的 `()`），
// 收进来只会多一个 `Method` 层。
if (after instanceof NotNull && this.HasChainLinkAfter(units, afterIndex)) {
  return false;
}
if (this.IsPrefixSymbol(current)) {
  // **类型查询里的 `typeof` 不是值位一元运算**（第 543 轮）——**父单元是 `TypeQuery` 时一律不折**。
  //
  // 时序是这一条的全部理由（实测插桩，`tmp/recon/probe-unary-parent.cjs`）：
  // 类型位那一趟（`type-operator.xl.md` 的 `TypePrefixCloseRule`）**先把
  // `typeof x` 收成 `TypeQuery`**，之后**这个新单元自己也会关一次** ⇒ 它自己的 `Data`
  // 上又跑这一趟通用队列 —— 此刻那一格词的 `Parent` **正是 `TypeQuery`**
  //（实测三份文件都是 `UP1DBG typeof parent=TypeQuery idx=0 n=2`）。
  // 这里若照折，产物就成了 `TypeQuery > UnaryOperator > [Keyword(typeof), Identifier(x)]`
  // ⇒ `TypeQuery.PrintDirectAst` 的 `ctx.Kids` **只看得到 `UnaryOperator`** ⇒ 名字节点一个都找不到
  // ⇒ `exprName` 空、`Identifier` 也不投（实测 8 份文件：`type-op-typeof.ts` /
  // `type-op-keyof-typeof.ts` / `type-op-unique-symbol-property.ts` / `type-paren-content-nodes.ts` /
  // `type-query-in-generic.ts` / `type-query-in-index-access.ts` / `type-query-in-paren-type.ts` /
  // `type-unique-symbol.ts`，尺子报的都是「`FIELD TypeQuery 产物[] vs TS[exprName]` + `MISS Identifier`」）。
  //
  // **与上面那两条（`GenericType` / `Parent === null`）同一族**：都是「这一段文本在类型位、
  // 只是折的这一趟来晚了」。**只挡 `TypeQuery`**、不写成 `IsTypeContainerUnit`：
  // `As` / `Satisfies` 的容器里**也有值表达式**（`typeof x as number` 左边那一格是值），
  // 一刀切会把那些真一元运算挡掉。
  if (current.Parent !== null && current.Parent.constructor.name === "TypeQuery") {
    return false;
  }
  // **同一个运算符不能再往外套一层**（第 543 轮）。
  //
  // 折出来的 `UnaryOperator` 自己也会关一次 ⇒ 它的 `Data` 上**又跑这一趟**：
  // 那时运算符还是**那一格词**、后面还是**那个操作数** ⇒ 上一版当场**再折一层**
  // —— 每跑一趟多一层（实测 `let v = typeof x` 的 XML 里是 **8 层**）。
  // 判据与 `++` 那一格同源（见下面 `IsPlusPlus` 那一支的 `Parent` 守卫，第 502 轮）：
  // **父单元已经是同一个运算符的一元运算 ⇒ 这一格词就是它已经收下的那个运算符**。
  // **`!!x` / `typeof typeof x` 不受影响**：内层先折成**一个单元**，
  // 折外层时那一格词的 `Parent` 还不是一元运算 —— 被挡住的只有「同一格词又折一次」。
  if (
    current.Parent !== null &&
    current.Parent.constructor.name === "UnaryOperator" &&
    (current.Parent as any).op === this.OperatorText(current)
  ) {
    return false;
  }
  // **后面那一格是「另一个前缀运算符」时也要接**（第 169 轮）——
  // `Process` 会**先把里面那一处折完**（就地递归），再把折好的单元当自己的操作数。
  //
  // **为什么不能只写 `IsOperand(after)`**：第 167 轮把前缀关键字从操作数里排掉之后，
  // `typeof typeof x` 的外层在这里就**直接不成立了**（`IsOperand(内层 typeof)` 是假），
  // 于是那一趟根本不会跑——上面那套「就地折里面」的改动**一次都没被走到**
  //（实测：改完 `typeof typeof x === "string"` 还是给 `"boolean"`）。
  // **前后是一条链**：`IsOperand` 收紧 → 这一格就得补上「前缀后面还是前缀」那一支。
  if (after !== null
    && (this.IsPrefixSymbol(after) || this.IsPlusPlus(after) || this.IsPlusMinus(after))) {
    return true;
  }
  // **尖括号断言当操作数**（第 592 轮）：`!<boolean>b` 的 `after` 是那个类型段
  // （`GenericType`）——它不在 `IsOperand` 的白名单里，于是整段三格
  // （`SymbolToken(!)` + `GenericType` + `Identifier(b)`）平级留在产物里
  // ⇒ 降级层报 `unimplemented: expression …`（`c379-ex-angle-assertion-after-prefix-operator`，
  // node 给 `false` / `-1`）。判据落在那**两格一起**是不是一个操作数上——
  // 只有「类型段后面紧跟一个操作数」才算，`<T>` 别处的形态（泛型实参 / 泛型箭头）
  // 后面跟的不是操作数，撞不到这一条。
  if (after instanceof GenericType) {
    return this.IsOperand(Get(units, SkipNextWrapSymbol(units, afterIndex)));
  }
  return this.IsOperand(after);
}
if (this.IsPlusPlus(current)) {
  // **已经在 `UnaryOperator` 里面了就不再折**（第 502 轮）：
  // `i++` 折成 `UnaryOperator(Identifier i, SymbolToken ++)` 之后，这个新单元**自己也会关一次**
  // ⇒ 它自己的 `Data` 上又跑这一趟 ⇒ `++` 前面是 `i`（操作数）⇒ **又折一层** ——
  // 实测 `for (let i = 0; i < 3; i++) {}` 的 incrementor 被套了 **8 层** `UnaryOperator`
  //（`tmp/recon/i50.ts`），而对照态只有**一层**。
  // `++` / `--` 不会「前缀套前缀」（`++x` 里那个 `++` 已经是整个前缀了）⇒
  // 容器已经是 `UnaryOperator` 时一律不再折（`!` / `~` / `typeof` 不受这条影响：
  // 它们的前缀链 `!!x` / `typeof typeof x` 仍然要一层层折）。
  if (current.Parent !== null && current.Parent.constructor.name === "UnaryOperator") {
    return false;
  }
  if (this.IsOperand(after)) {
    return true;
  }
  return this.IsOperand(Get(units, SkipPreviousTrivia(units, index)));
}
if (this.IsPlusMinus(current) === false) {
  return false;
}
if (this.IsOperand(after) === false) {
  return false;
}
return this.IsOperand(Get(units, SkipPreviousTrivia(units, index))) === false;
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
  throw new Error("UnaryOperatorCloseRule.Process: current is null");
}
// **`++` / `--` 前面紧挨着操作数 ⇒ 这是后缀，后面那格不归它**（第 682 轮，**实测撞到的**）。
//
// `b++ + 1` 原来被折成 `b` ＋ `UnaryOperator(++ > UnaryOperator(+ > 1))`：
// 下面那段「套着写的前缀就地递归」看到 `++` 后面是 `+`（`IsPlusMinus`）就**把 `+1` 折了**，
// 折完 `after` 成了一个操作数 ⇒ `++` 走**前缀**那条路，把 `(+1)` 当自己的操作数，
// 而 `b` 留在外面平级。降级层于是只算到后半截（`n++ + ++n` 给 `1:1`，Node 给 `4:3`——
// **静默错值**）。JS 的文法在这里没有二义：`++` **紧跟在操作数后面**（同一行）就是后缀。
//
// **换行要排掉**：`a` 换行 `++b` 在 JS 里是两条语句（ASI），那时 `++` 是**前缀**
//（`SkipPreviousWrapSymbol` 会跳过软换行，所以这里看的是**紧挨着的那一格原样单元**）。
const postfixHere =
  this.IsPlusPlus(current)
  && this.IsOperand(Get(units, SkipPreviousTrivia(units, index)))
  && !(Get(units, index - 1) instanceof LineWrap)
  // **字面量不能当后缀的操作数**（第 692 轮，**实测撞到的**）：
  // `function f() {} ++n;` 里 `++` 前面紧挨着的正是那个 `Function` 单元——
  // 而 `IsOperand` 第 692 轮刚把 `Function` 补进名单（`typeof function () {}` 要它，
  // 见下面那一格），于是这一句当场给真 ⇒ `++` 被读成**后缀**、把**函数声明**
  // 折成了它的操作数（实测产物是 `UnaryOperator(op="++") > Function`，降级层报
  // `unimplemented: update expression on FunctionExpression`——
  // 而 Node 跑这一份是**两句普通语句**）。
  //
  // **判据是文法**：后缀 `++` / `--` 要的是一个**引用**（名字 / 成员 / 下标），
  // 而函数字面量与类字面量**给不出引用**——所以它们出现在这一格时，`++` 一定是
  // **下一句的前缀**。`Class` 一并排掉：第 328 轮把 `Class` 补进名单时漏了这一格
  //（那一轮没露是因为 `class A {}` 会被 `ClassCloseRule` 放到**容器外层**、
  //  而函数声明留在同一个容器里——`function f() {} ++n` 才撞得到）。
  && !(Get(units, SkipPreviousTrivia(units, index)) instanceof Function)
  && !(Get(units, SkipPreviousTrivia(units, index)) instanceof Class);
const afterIndex = SkipNextTrivia(units, index);
let after = Get(units, afterIndex);
// **套着写的前缀：先把里面那一处折完**（第 169 轮）。
//
// `typeof typeof x` 的外层这一趟，「被操作者」其实是**里面那一处折出来的单元**。
// 第 166 轮的做法是「先放过、下一趟再折」——第 168 轮查出它会在**同一趟里被别的规则
// 抢先**（`===` 把内层折进比较式，下一趟外层只好把整个比较式当操作数 → 静默错值）。
// 所以改成**在同一趟里就地递归折一次**：折完 `units[index + 1]` 就是一个折好的单元，
// 下面那条「后面那个是操作数」的路照走。
//
// **递归会停**：链的**最里面**那一处后面接的是真操作数（`typeof -x` 里 `-` 后面是 `x`），
// 它按普通前缀折完返回；`typeof typeof` 这种缺操作数的写法只会多走一格（不折、不循环）。
//
// **后缀不递归**（第 682 轮）：`b++ + 1` 里那个 `+` 是**二元**的，
// 折进来就再也回不去二元那一趟（上面 `postfixHere` 那一段写的就是这个症状）。
if (!postfixHere && after !== null
  && (this.IsPrefixSymbol(after) || this.IsPlusPlus(after) || this.IsPlusMinus(after))) {
  this.Process(template, units, afterIndex);
  after = Get(units, SkipNextTrivia(units, index));
}
// **尖括号断言那一支的入口**（第 592 轮）：`IsOperand(GenericType)` 是假，
// 所以判据要问「类型段**加上**后面那一格」是不是一个操作数——与 `Previous` 同一句。
const assertedOperand =
  after instanceof GenericType && this.IsOperand(Get(units, SkipNextTrivia(units, afterIndex)));
if (!postfixHere && (this.IsOperand(after) || assertedOperand)) {
  // **被操作者后面还跟着调用括号时，那个括号属于这一元运算**（第 309 轮）——
  // JS 里 `typeof o["m"]()` 是 **`typeof (o["m"]())`**（一元运算的作用范围是整个调用），
  // 而这一支只往后吃**一个**单元 ⇒ 那对 `()` 留在外面**平级**
  // ⇒ 投影交给 `typeof` 的只有 `o["m"]` ⇒ 算出来是**方法本身**（`typeof` 给 `"function"`，
  // Node 给 `"object"`，**静默错值**）；不带外层括号时更直接：
  // `typeof o["m"]()` 报 `cannot call a non-closure value`（括号成了对 `typeof` 结果的调用）。
  //
  // **为什么 `.` 那个形状一直是对的**：`typeof o.m()` 里 `(` 先被折进了**同一条成员链**
  //（`PropertyAccess` 的 `ChainEndIndex` 认 `Method`），而**下标那一格**在链上只是
  // `[` 括号、后面那个 `(` 不在链的定义里（实测 XML：`typeof o.m()` 的 Method 在
  // `PropertyAccess` **里面**，`typeof o["m"]()` 的 `()` 却在 `UnaryOperator` **外面**）。
  //
  // **只吃「调用括号」这一档**（不顺手吃任意后缀）：`.b` / `[i]` 那些属于**成员链**，
  // 各自有规则管；这里要的只是「这一元运算的**操作数是一次调用**」。
  // **它也是 JS 本来的口径**：`typeof x` 换行再写 `(function(){})()`
  // 在 JS 里同样是「`x` 被调用」（ASI 在这里不插分号）。
  let operandEnd = afterIndex;
  // **尖括号断言 `!<T>x`**（第 592 轮）：操作数是**两格**——类型段 + 被断言的表达式
  //（`Previous` 那一支已经问过「后面那一格是不是操作数」）。少了这一句，
  // `Previous` 认得下而 `Process` 只吃一格 ⇒ 产物是 `[UnaryOperator(!, GenericType), Identifier(x)]`。
  const assertion = Get(units, operandEnd);
  if (assertion instanceof GenericType) {
    const assertedIndex = SkipNextWrapSymbol(units, operandEnd);
    if (this.IsOperand(Get(units, assertedIndex))) {
      operandEnd = assertedIndex;
    }
  }
  // **`import.meta` / `new.target` 是**一格**操作数**（第 623 轮）：
  // `import` / `new` 此刻还是 `Identifier` ⇒ `IsOperand` 认它 ⇒ `typeof import.meta`
  // 被折成 `UnaryOperator(typeof, import)` —— 后面的 `.meta` 留在**外面**，
  // 投影那一支（`print-ast-common.xl.md` 的「0。`import.meta` / `new.target`」）
  // 要看到的是 `[Keyword(import), ., Identifier(meta)]` 三格 ⇒ 它一格都看不到。
  // 实测 `typeof import.meta` / `typeof new.target`：缺 `MetaProperty` + 漂移 + 多出 3。
  // TS 那边这两个词与后面的名字**是同一个节点** ⇒ 一并吃进来。
  // **只认「词 + `.` + 名字」这个形状**：`new X` / `import("m")` 都不在里面，
  // 它们各自有规则管（`NewCloseRule` / 值位的动态导入）。
  if (operandEnd === afterIndex) {
    const headWord = this.MetaHeadWord(after);
    if (headWord !== "") {
      const dotIndex = SkipNextWrapSymbol(units, operandEnd);
      const dot = Get(units, dotIndex);
      if (dot instanceof SymbolToken && dot.Is(".")) {
        const nameIndex = SkipNextWrapSymbol(units, dotIndex);
        // **名字那一格可能已经是一条成员链**（第 623 轮）：
        // `import.meta.url` 在产物里是 `[import, ., PropertyAccess(meta . url)]`
        //（`import` / `new` 都不是链底，见 `property-access.xl.md`）⇒
        // 而成员访问**比一元运算紧** ⇒ 整格都是这一元运算的操作数。
        if (this.IsMetaName(Get(units, nameIndex))) {
          operandEnd = nameIndex;
        }
      }
    }
  }
  while (true) {
    const nextIndex = SkipNextWrapSymbol(units, operandEnd);
    const nextUnit = Get(units, nextIndex);
    if (nextUnit instanceof Bracket && nextUnit.startBracket === "(") {
      operandEnd = nextIndex;
      continue;
    }
    // **紧跟其后的下标也是这一元运算的操作数**（第 614 轮）：`typeof o![0]` 里那个 `[0]`
    // 这一趟已经**不是括号**了 —— `JsonArrayCloseRule` 排在前面，它把「前面有操作数的 `[`」
    // 收成了 **`ArrayLiteral`**（`json/array-literal.xl.md` 的 `IsArrayAt`，
    // 同一个形状在 `data.c![0]` 里就是投影侧的 `ElementAccessExpression`）。
    // 不收它的后果与上面那条「调用括号」**一模一样**：`typeof` 只拿到 `o!`
    //（实测缺 `ElementAccessExpression` + `NumericLiteral`、`TypeOfExpression` 短一截）。
    //
    // **只吃 `ArrayLiteral` 这一档**：它就是「值位、前面有操作数的 `[`」的唯一形态
    //（真正的数组字面量前面不会有操作数，它只会落进 `after` 那一格）。
    if (nextUnit instanceof ArrayLiteral) {
      operandEnd = nextIndex;
      continue;
    }
    // **紧跟其后的类型实参段也是这一元运算的操作数**（第 981 轮）：`typeof f<T>` 的产物是
    // `[UnaryOperator(typeof f), GenericType(<T>)]`——那个 `<T>` 是**实例化表达式**的实参段，
    // 与 `f` 同属一个操作数（TS：`TypeOfExpression > ExpressionWithTypeArguments`）。
    // 不收它：`typeof` 只拿到 `f`、`<T>` 留在外面（实测 `const a = typeof f<T>;`：
    // `TypeOfExpression` 漂到 `[10,18)`、缺 `ExpressionWithTypeArguments` + `TypeReference`、
    // 多一格 `TypeOfExpression`）。
    //
    // **写在循环里面而不是像模板那样写在循环后面**：`typeof f<T>()` 的 `(` 排在
    // 实参段**后面**，写在循环外就轮不到那一格（收集顺序是「从左往右一路吃」）。
    if (nextUnit instanceof GenericType) {
      operandEnd = nextIndex;
      continue;
    }
    break;
  }
  // **被操作者后面紧跟「模板开头」的单元 ⇒ 那也是这一元运算的操作数**（第 322 轮）——
  // `` typeof t`z` `` 里标签与模板在 token 层是**两格平级**（合成 `TaggedTemplateExpression`
  // 是投影那一层的事），而这一支只吃**一个**单元 ⇒ 被操作数只剩 `t`、模板留给通用支
  // ⇒ 降级层把 `t` 当成「被调用者」（实测报 `cannot call a non-closure value`，
  // Node 给 `"string"`——**静默错值**）。
  //
  // **与二元那一条同一把判据**（`text-common-util.xl.md` 的 `StartsWithTemplate`，
  // 第 321 轮在 `binary-operator.xl.md` 里为同一个形状加的）——**同一个语义一处实现**。
  // `` !t`x`.length `` 那种「模板 + 后缀」也算：那一格是 `PropertyAccess`、
  // 它的首个子单元是模板 ⇒ 整格收进来（区间也照它算）。
  // **别写成裸块**（第一版就是 `{ const tailIndex = … }`）：这一份文件**自己也是
  // `cases:tsast` 的语料**（`dist/ts` 整个目录都在对拍范围内）——裸块那一格投出来
  // **缺一个 `Block`**、还多出两个 `BinaryExpression`（实测 `--file dist/ts/typescript/tokens/unary-operator.ts`
  // 报 缺 3 / 漂移 2 / 多出 8）。摊平就没有这一格。
  const tailIndex = SkipNextWrapSymbol(units, operandEnd);
  if (StartsWithTemplate(Get(units, tailIndex))) {
    operandEnd = tailIndex;
  }
  const result = new UnaryOperator(template);
  result.Parent = current.Parent;
  result.op = this.OperatorText(current);
  result.SignIn(current.SourceRange.Start!);
  result.SignOut(Get(units, operandEnd)!.SourceRange.End!);
  result.AddAndCloseLast(current);
  for (let i = index + 1; i <= operandEnd; i++) {
    const item = Get(units, i);
    if (item !== null && !(item instanceof LineWrap)) {
      result.AddAndCloseLast(item);
    }
  }
  result.TryToClose();
  return ReplaceCountAt(units, index, operandEnd - index + 1, result);
}
// **后缀的被操作者也要跨 trivia**（第 828 轮）：`a /*c*/ ++` 里 `++` 与操作数之间
// 夹着一条注释——`SkipPreviousWrapSymbol` 只跳软换行 ⇒ `before` 落在注释上 ⇒
// 整条后缀不成形（实测缺 `PostfixUnaryExpression`）。与 `postfixHere` 那一句同源。
const beforeIndex = SkipPreviousTrivia(units, index);
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

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const kids = ctx.Kids(v);
  const declaredOp = typeof v.op === "string" ? v.op : "";
  // **先按 `op` 属性找那一格**（第 623 轮）：`op` 是这一元运算的**真身**，
  // 而 `IsOperatorUnit` 只问「是不是 `SymbolToken`」 —— `typeof import.meta` 的操作数里
  // 那个 `.` 也是 `SymbolToken` ⇒ 它先被认成运算符（实测：`TypeOfExpression.expression`
  // 投成 `TypeOfKeyword`、缺 `MetaProperty` + `Identifier`）。
  // 按**文本**找不会认错：`op` 那一格是唯一的（`typeof` / `void` / `delete` 是词，
  // 其余是符号），而操作数那些单元（链 / 括号 / 调用 / 嵌套一元）的文本都比它长。
  let opIndex = declaredOp !== "" ? kids.findIndex((k: any) => ctx.ValueOf(k) === declaredOp) : -1;
  if (opIndex < 0) {
    opIndex = kids.findIndex((k: any) => ctx.IsOperatorUnit(k));
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
  const operatorText = opIndex >= 0 ? ctx.ValueOf(kids[opIndex]) : declaredOp;
  return ctx.Node(isPostfix ? "PostfixUnaryExpression" : "PrefixUnaryExpression",
    { operand, operator: operatorText }, v);
```


## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
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
return `<${name} range="${this.RangeOf()}" op="${CommonUtil.XmlDecode(this.op)}">${body}</${name}>`;
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
