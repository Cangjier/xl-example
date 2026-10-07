# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { ArrayLiteral } from "./json/array-literal.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Method } from "./method.xl.md"
import { PropertyAccess } from "./property-access.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { TypeDefine } from "./type-define.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

非空断言 `!`：把 `expr!` 收成一个 **`NotNull` 节点**（里面装着被断言的那个单元与 `!` 本身）。

**原来是把 `!` 直接删掉的**，理由是「它没有语法结构意义」——但那样一来 `a!` 与 `a` 的产物**完全一样**，
信息整体丢失（`known-gaps.json` 的 `_notes.nonnull-dropped`）。现在保留成一个节点：
TypeScript 自己的 AST 里它就是 `NonNullExpression`，差分引擎能直接对上，
下游也终于分得清「取了值」与「断言过非空」。

`NotNullCloseRule` 写在 `NotNull` 之前；
`Root` 会在自己的规则队列里持有 `NotNullCloseRule.Instance`，所以顺序不能反。

# class NotNullCloseRule extends CloseRule

它的 `Previous` 是**四路判定**：`index` 处必须是内容为 `!` 的 `SymbolToken`，且它前一个单元必须是 `Identifier` / `Bracket` / `Method` / `NotNull` 之一。
换句话说：只有「标识符!」「(...)!」「方法(...)!」以及**连着再断言一次**（`b!!`）这几种形状才当非空断言，别的 `!`（如 `!=`、`!==`、前缀 `!x`）不动。

## static readonly field Instance:NotNullCloseRule = new NotNullCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个非空断言的 `!`。

先取 `index - 1` 处的单元存进 `previous`，再判定 `index` 处是不是 `!`，以及 `previous` 是不是 `Identifier` / `Bracket` / `Method` / `NotNull` 之一；
这里拆成早返回，语义相同。`Get` 越界给 `null`，所以下标 `0` 处的 `!` 自然落到 `false`。

`NotNull` 那一支是给**连写**的（`b!!`）：第一次断言已经把 `b!` 收成节点，
第二个 `!` 前面于是不再是 `Identifier`——不认它的话第二个 `!` 会留在原地成为悬空符号。

```ts
const previous = Get(units, index - 1);
const current = Get(units, index);
if (!(current instanceof SymbolToken)) {
  return false;
}
if (!(current as SymbolToken).Is("!")) {
  return false;
}
if (this.IsDefiniteAssignment(units, index)) {
  return false;
}
if (this.IsStatementKeyword(previous)) {
  return false;
}
// **`ArrayLiteral` 也是「可以被断言的东西」** ✗（第 303 轮 ✓）——它在这里代表的是
// **一次下标访问** ✓（`arr[0]!` 的产物把那个 `[0]` 收成 `<ArrayLiteral>` ✓，
// 理由与投影那边那一段一字不差 ✓）。**不认它的后果** ✗：`x[1]![0]` 里第二个 `!`
// 会**留在原地** ✓、被 `UnaryOperatorCloseRule` 收成**前缀取反** ✗
//（实测产物：`<UnaryOperator op="!"><SymbolToken>!</SymbolToken><ArrayLiteral(0)></UnaryOperator>` ✓），
// 后面那个 `[0]` 于是既不是下标、也不是数组字面量 ✓ ⇒ **整段丢掉** ✓
// （判据 `c303-nonnull-then-index` 第三版量到的就是它 ✓：`deep!.a!.b![1]![0]` 给 `[3,4]` ✓，
// Node 给 `3` ✓——**一句异常都没有** ✗）。
return (
  previous instanceof Identifier ||
  previous instanceof Bracket ||
  previous instanceof Method ||
  previous instanceof PropertyAccess ||
  previous instanceof NotNull ||
  previous instanceof ArrayLiteral
);
```

## private method IsStatementKeyword:(unit:Token | null)=>bool

`unit` 是不是**语句关键字**（`return` / `throw` / `case` / `default` / `else` / `do` / `break` / `continue`）。

**为什么非空断言要排掉它们**（实测补的）：本规则跑在 `KeywordCloseRule`（队列最后）**之前**，
那时 `return` **还是一个 `Identifier`**——按「前一个单元是 `Identifier` 就当被断言者」判，
`return !(q instanceof R)` 里的 `!` 会和 `return` 一起被收成一个
`<NotNull><Identifier>return</Identifier><SymbolToken>!</SymbolToken></NotNull>`（实测产物就是这个），
括号里的表达式再也拿不到一元节点。这组排除名单与
`binary-operator.xl.md` / `unary-operator.xl.md` 的 `IsOperand` 是同一份，三处保持一致。

```ts
if (!(unit instanceof Identifier)) {
  return false;
}
const text = unit.TempToString();
return (
  text === "return" ||
  text === "throw" ||
  text === "case" ||
  text === "default" ||
  text === "else" ||
  text === "do" ||
  text === "break" ||
  text === "continue"
);
```

**类体里的 `a!: number` 不是非空断言，是「明确赋值断言」**：`!` 属于**成员声明**的一部分
（TypeScript 的 AST 里它只是属性上的一个 `exclamationToken`，**不**产生 `NonNullExpression`）。
把类体里的形状挡掉，`Field` 才拿得到 `a` 这个名字（不挡的话整条成员声明塌成一个 `NotNull`，
字段名也丢了）。判据见 `IsDefiniteAssignment`。

## private method IsDefiniteAssignment:(units:Array<Token>, index:int)=>bool

`index` 处的 `!` 是不是**成员声明上的明确赋值断言**（`a!: number`）。

两条同时成立才算：

- `!` **后面**（跳过软换行）跟着类型标注：一个已经成形的 `TypeDefine` 节点，
  或者 `:` / `?:` / `!:` 符号（位次上 `TypeDefineCloseRule` 可能已经先跑过，
  那时看到的就是节点；词法层也会把 `!:` 拼成一个符号，所以四种写法都要认）；
- 名字**前面**是成员起点：`{` 括号 / `;` / 软换行 / 什么都没有。

**为什么不看「父亲是不是 `ClassBody`」**：本规则的位次比较靠前，
跑的时候类体未必已经成型，`Parent` 还指不到 `ClassBody`（实测那条判据一次都没命中）。
形状判据不依赖树的成型时机。

第二条把三元表达式的 `cond ? a! : b` 排除掉：那里的 `a` 前面是 `?`，不是成员起点 ✓。

```ts
const after = Get(units, SkipNextWrapSymbol(units, index));
if (after instanceof TypeDefine) {
  return true;
}
if (!(after instanceof SymbolToken)) {
  return false;
}
const afterText = after.TempToString();
if (afterText !== ":" && afterText !== "?:" && afterText !== "!:") {
  return false;
}
const nameIndex = index - 1;
const beforeIndex = SkipPreviousWrapSymbol(units, nameIndex);
const before = Get(units, beforeIndex);
if (before === null) {
  return true;
}
if (before instanceof Bracket && before.startBracket === "{") {
  return true;
}
if (before instanceof SymbolToken && before.Is(";")) {
  return true;
}
return before instanceof LineWrap;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `index - 1` 与 `index` 两个单元（被断言者与 `!`）换成一个 `NotNull`，**返回新的下标**。

返回 `index - 1`：替换之后这个位置就是新节点，外层循环从它继续。

替换用四参数的 `ReplaceCountAt`（三个参数的版本才叫 `ReplaceAt`）。

```ts
const previous = Get(units, index - 1);
const current = Get(units, index);
if (previous === null || current === null) {
  throw new Error("非空断言两侧缺单元");
}
// **新节点要继承被断言者的父亲**（第 592 轮 ✓）：`ReplaceCountAt` 只做 `splice` ✓，
// 它**不设 `Parent`** ✗——不在这里补一句，新造的 `NotNull` 父亲是 `null` ✓。
// `PropertyAccessCloseRule.Process` 一直都在设 ✓（`result.Parent = current.Parent` ✓），
// 本条少了这一句 ⇒ 谁想问「这个 `NotNull` 住在哪」都问不到 ✓
//（第 592 轮的链规则正是靠它分辨「在 `NullConditionalOperator` 里面」✓）。
const holder = previous.Parent;
const notNull = new NotNull(template);
notNull.Parent = holder;
notNull.SignIn(previous.SourceRange.Start!);
notNull.SignOut(current.SourceRange.End!);
notNull.AddAndCloseLast(previous);
notNull.AddAndCloseLast(current);
notNull.TryToClose();
return ReplaceCountAt(units, index - 1, 2, notNull);
```

# class NotNull extends IndependentToken

非空断言 `expr!`。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它不覆写 `ToXmlString`，所以 XML 由基类产出：`<NotNull>被断言者 + !</NotNull>`。

## method PrintAst:(ctx:any, v:any)=>any

非空断言 `x!` → `NonNullExpression`（**只有 `expression` 一个子字段**；
**从 `ts-ast.xl.md` 的 `projectNonNullExpression` 搬来**，第 183 轮）。

TS 那边 `!` 是节点的属性（`exclamationToken`），`forEachChild` **不访问**它；
产物那边它是 `[Identifier, SymbolToken(!)]` 两个平级单元——照通用投影会把 `!` 也算进
`expression`（实测「多出来的节点」里 `ExclamationToken` 350 个全是它）。

```ts
  const kids = ctx.Kids(v).filter(
    (k: any) => !(k.get("type") === "SymbolToken" && ctx.TextOf(k) === "!"),
  );
  const props: any = {};
  const expression = kids.length > 0 ? ctx.Expression(kids) : undefined;
  if (expression !== undefined) props.expression = expression;
  return ctx.NodeHead("NonNullExpression", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

**子单元必须一起克隆**：`NotNull` 装着「被断言者 + `!`」，只克隆自己会让产物里出现
`<NotNull />` 这样的**空壳**——名字与表达式整段消失。克隆只在复合赋值展开
（`x! += 1` → `x! = x! + 1`，`compound-assignment-operator.xl.md`）里被调用，
而被克隆的那一段正是左侧表达式，`a[b!] += 1` 这种形状就会撞上。

顺序是 `Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new NotNull(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
