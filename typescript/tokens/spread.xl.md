# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { BinaryOperator } from "./binary-operator.xl.md"
import { ArrayLiteral } from "./json/array-literal.xl.md"
import { ObjectLiteral } from "./json/object-literal.xl.md"
import { Keyword } from "./keyword.xl.md"
import { Lamda } from "./lamda/lamda.xl.md"
import { Method } from "./method.xl.md"
import { New } from "./new/new.xl.md"
import { NotNull } from "./not-null.xl.md"
import { PropertyAccess } from "./property-access.xl.md"
import { String } from "./string/string.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { TypeDefine } from "./type-define.xl.md"
import { UnaryOperator } from "./unary-operator.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

展开运算符：`f(...args)` / `[...items]` / `{ ...base }` / `new Foo(...args)` 里的 `...` 与它展开的那个表达式，
收成一个 `Spread` 节点。

**难点是它与 rest 参数的歧义**：`(...args: T[])` 里也是「`...` + 名字」，
但在 TypeScript 的 AST 里那是 `Parameter` 上的 `dotDotDotToken`（**不**产生 `SpreadElement`），
而 rest 参数在真实代码里比 spread 多得多——按形状硬收会把它们全算成 `Spread`。

**判据是「`...` 的父亲是谁」**（实测四种形状的父亲各不相同）：

| 形状 | `...` 的父亲 | 收不收 |
| --- | --- | --- |
| `call(...args)` | `Method`（调用） | 收 ✓ |
| `[...items]` | `ArrayLiteral` | 收 ✓ |
| `{ ...base }` | `ObjectLiteral` | 收 ✓ |
| `new Foo(...args)` | `NewArguments` | 收 ✓ |
| `function f(...args: T[])` | 参数括号（`Bracket`） | 不收 ✗ |
| `class C { m(...args: T[]) {} }` | 参数括号 | 不收 ✗ |
| `(...args) => 1` | `LamdaParameter` | 不收 ✗ |
| `type F = (...args: T[]) => void` | 类型位的括号 | 不收 ✗ |
| `const [a, ...rest] = xs` | `[` 括号 | 不收 ✗（AST 里是绑定元素，不是 spread） |

白名单是**父单元的类名**（`Method` / `ArrayLiteral` / `ObjectLiteral` / `NewArguments`）——
注意尾随的 `}` 一定是**已经成形的容器**，所以本规则必须排在
`MethodCloseRule` / `JsonArrayCloseRule` / `JsonObjectCloseRule` / `NewCloseRule`
**之后**，注册在 `KeywordCloseRule` 之前。

`SpreadCloseRule` 写在 `Spread` 之前；`Root` 会在自己的规则队列里持有它的 `Instance`，所以顺序不能反。

# class SpreadCloseRule extends CloseRule

## static readonly field Instance:SpreadCloseRule = new SpreadCloseRule()

唯一的实例。

## private method IsSpreadParent:(unit:Token | null)=>bool

`unit` 是不是「装展开元素的那几种容器」：调用（`Method`）、数组（`ArrayLiteral`）、
对象（`ObjectLiteral`）、`new` 的实参（`NewArguments`）。

```ts
if (unit === null) {
  return false;
}
const name = unit.constructor.name;
return name === "Method" || name === "ArrayLiteral" || name === "ObjectLiteral" || name === "NewArguments";
```

**试过给 `[` 那一支再加一层判据、退回来了**：为了压掉下面那 16 个假阳性，
试过「`ArrayLiteral` 的父亲不能是括号」「父亲的父亲必须是调用 / `new` / 数组 / 对象」两版，
都让 **`f([...xs])` 变成 0 个 `Spread`** ✗ —— 真的数组展开拿不到节点，
比多算几个更糟（假阴性会把一个真实的展开悄悄吞掉，假阳性只是计数偏大）。
所以这一支保持成最简单的一条，把 16 个假阳性**留在差分账上**（见本节末尾的遗留说明）。
`...` 与类型宿主之间隔着好几层壳，真正稳的判据还没找到——这需要先把祖先链完整打出来再看。

## private method IsArrayLiteralParent:(arrayUnit:Token)=>bool

**已经被撤掉的判据**（保留说明以免重复踩）：给 `ArrayLiteral` 那一支加了一层「数组字面量的父亲不是括号」，
想压掉调用签名里 rest 参数造成的假阳性。它确实把 `lib.es5.d.ts` 的 8 处压下去 5 处，
但同时把 **`f([...xs])` 也压成了 0 个 `Spread`** ✗ ——
那个数组字面量的父亲正好是调用的实参括号，两层之内分不出「实参括号」与「参数表括号」。
撤掉之后：`call(...args)` / `[...items]` / `f([...xs])` / `{ ...base }` 全部 ✓，
代价是那 16 个假阳性留在差分账上。

```ts
// 已撤：仅作记录
if (arrayUnit.Parent === null) {
  return false;
}
return arrayUnit.Parent instanceof Bracket === false;
```

## private method IsOperand:(unit:Token | null)=>bool

`unit` 能不能当被展开的那个表达式。

`Identifier` / `String` / `Method` / `Bracket`（`f(…[1, 2])` 这类）/ `Keyword`（`...this` 不成立，
但 `this` 是关键字——只认 `this` 与 `super`）/ 以及已经是节点的表达式
（`UnaryOperator` / `BinaryOperator` / `NotNull` / `Spread` 自身）。

```ts
if (unit === null) {
  return false;
}
if (
  unit instanceof Identifier ||
  unit instanceof Method ||
  unit instanceof Bracket ||
  unit instanceof UnaryOperator ||
  unit instanceof BinaryOperator ||
  unit instanceof NotNull ||
  unit instanceof Spread ||
  unit instanceof ObjectLiteral ||
  unit instanceof ArrayLiteral ||
  unit instanceof New ||
  unit instanceof Lamda ||
  unit instanceof PropertyAccess ||
  unit instanceof String
) {
  return true;
}
if (unit instanceof Keyword) {
  return unit.Value === "this" || unit.Value === "super";
}
return false;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个展开运算符。

三条同时成立：是内容为 `...` 的 `SymbolToken`；父亲在 `IsSpreadParent` 的白名单里；后面跟着一个表达式。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken)) {
  return false;
}
if (!current.Is("...")) {
  return false;
}
if (this.IsRestParameter(units, index)) {
  return false;
}
if (this.IsSpreadParent(current.Parent) === false) {
  return false;
}
if (this.IsTupleRest(units, index)) {
  return false;
}
return this.IsOperand(Get(units, SkipNextWrapSymbol(units, index)));
```

## private method IsTupleRest:(units:Array<Token>, index:int)=>bool

`index` 处的 `...X` 是不是**元组类型里的剩余元素**（`[string, ...number[]]`）。

判据**只看形状、不看祖先**：被操作数**紧跟一个空的 `[]` 括号**。

- `[string, ...number[]]` —— `number` 后面是空的 `[]` → 数组类型后缀 → 元组剩余元素 ✗ 不收；
- `[...items]` / `call(...args)` / `{ ...base }` / `new Foo(...parts)` —— 后面是 `]` / `)` / `}` ✗ 不命中 ✓ 照收；
- `...a[0]`（真展开后面带下标）—— 那个 `[` **不空** ✗ 不命中 ✓ 照收。

**为什么不用「祖先链里有没有 `TypeDefine`」**（第 32、34 轮试过三版都失败）：
单元被上层规则收走之后 **`Parent` 指针是过期的** —— 调试打印里那个 `ArrayLiteral` 的祖先链是
`ArrayLiteral < Root`，可它在产物里明明位于 `TypeAssign` 里面。所以这里改成看**操作数右边紧邻的单元**，
完全不碰祖先链。

```ts
const nameIndex = SkipNextWrapSymbol(units, index);
const operand = Get(units, nameIndex);
if (operand === null) {
  return false;
}
const afterOperand = Get(units, SkipNextWrapSymbol(units, nameIndex));
if (!(afterOperand instanceof Bracket)) {
  return false;
}
return afterOperand.startBracket === "[" && afterOperand.Data.length === 0;
```

## private method IsRestParameter:(units:Array<Token>, index:int)=>bool

`index` 处的 `...` 是不是**rest 参数**（`...args: T[]`）而不是展开。

判据只有一条：**被展开/声明的那个名字后面紧跟类型标注**（`:` / `?:` / `!:`）。

- `(...args: A[])` —— `args` 后面是 `:` → rest 参数 ✗ 不收；
- `(this: T, ...args: A) => R` / 函数类型里的 rest → 同上 ✗；
- `call(...args)` / `[...items]` / `{ ...base }` / `new Foo(...parts)` —— 名字后面是 `)` / `]` / `}` ✓ 收。

**这一条是这一族假阳性的正解**：先前试的两版判据都在「父亲是谁」上做文章（`ArrayLiteral` 的父亲、
父亲的父亲……），而真正区分 rest 与展开的**不是位置、是后面有没有类型标注** ——
`lib.es5.d.ts` 里那 8 处（`call<T, …>(this: (this: T, ...args: A) => R, thisArg: T, ...args: A): R`）
与 `sqlite.d.ts` 的 6 处全是带标注的 rest 参数。

```ts
const nameIndex = SkipNextWrapSymbol(units, index);
const after = Get(units, SkipNextWrapSymbol(units, nameIndex));
if (after === null) {
  return false;
}
if (after instanceof TypeDefine) {
  return true;
}
if (!(after instanceof SymbolToken)) {
  return false;
}
const text = after.TempToString();
return text === ":" || text === "?:" || text === "!:";
```

**`TypeDefine` 那一支是必须的**（与 `not-null.xl.md` 的 `IsDefiniteAssignment` 同一个坑）：
本规则的位次在 `TypeDefineCloseRule` **之后**，那时 `: A[]` 已经收成一个 `TypeDefine` 节点，
看到的不再是 `:` 符号。少了这一支，`call<T, A>(this: T, ...args: A): R` 这种
「同一个参数表里既有函数类型的 rest、又有真 rest」的写法仍然会多出一个 `Spread` ✗。

## private method IsInTypePosition:(current:Token)=>bool

`current` 是不是处在**类型位**（往上看八层，撞到 `TypeDefine` / `TypeAssign` / `GenericType` 就是）。
八层是因为 `...` 与类型宿主之间常常还隔着 `ArrayLiteral` / `Method` / `Bracket` 好几层壳。

**这一条是实测补上的**：`lib.es5.d.ts` 里 `interface X { f(...args: A[]): void }` 这种
**调用签名**的参数表，`A[]` 的 `[` 会先长成一个 `ArrayLiteral`，而参数表里那个 `...` 于是
正好落进一个「`ArrayLiteral` 父亲」里 —— 按白名单看它像一个数组展开 ✗，
实测多出 16 个 `Spread`（`lib.es5.d.ts` 8 个、`sqlite.d.ts` 6 个、`events.d.ts` 与 `stream.d.ts` 各 1 个）。
类型位里根本没有展开运算，撞到类型祖先就该退出。

```ts
let unit:Token | null = current;
for (let i = 0; i < 8; i++) {
  unit = unit.Parent;
  if (unit === null) {
    return false;
  }
  const name = unit.constructor.name;
  if (name === "TypeDefine" || name === "TypeAssign" || name === "GenericType") {
    return true;
  }
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `...` 与它展开的那个表达式收成一个 `Spread`，**返回新的下标**。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("SpreadCloseRule.Process: current is null");
}
const afterIndex = SkipNextWrapSymbol(units, index);
const after = Get(units, afterIndex);
if (after === null) {
  throw new Error("SpreadCloseRule.Process: 展开运算符后面缺表达式");
}
const result = new Spread(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(after.SourceRange.End!);
for (let i = index; i <= afterIndex; i++) {
  const item = Get(units, i);
  if (item !== null && !(item instanceof LineWrap)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, index, afterIndex - index + 1, result);
```

# class Spread extends IndependentToken

## method PrintAst:(ctx:any, v:any)=>any

展开元素 `...xs` → `SpreadElement`（**只有 `expression` 一个字段**；
**从 `ts-ast.xl.md` 的 `projectSpread` 搬来**，第 182 轮）。

产物那边是 `Spread > [SymbolToken(...), 目标]`——两点号是一个平级的 `SymbolToken`。
照通用支（`FIELD_BY_KIND` 把 `children` 映射成 `expression`）会把那个 `SymbolToken`
也投成 `DotDotDotToken` 一起塞进 `expression` 里（实测多出 66，样本全是
`f(...newValues)` / `push(...items)` 这种调用实参）。

**目标走 `ctx.Expression` 而不是 `ctx.Project`**（第 125 轮）：`...(...)` 的目标是一对括号时，
`Project` 会把整个括号投成一个**未映射的 `<Bracket>`**，而 `Expression` 认得出值位括号
（`ParenthesizedExpression`）。实测 `[...l, ...(x ?? [])]` 缺 `ParenthesizedExpression` + 多出 `Bracket`。

```ts
  const kids = ctx.Kids(v).filter(
    (k: any) => !(k.get("type") === "SymbolToken" && ctx.TextOf(k) === "..."),
  );
  const expression = kids.length === 0 ? undefined : ctx.Expression(kids);
  return ctx.Node(
    "SpreadElement",
    expression === undefined ? {} : { expression },
    v,
  );
```

展开运算 `...expr`。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它没有覆写 `ToXmlString`，所以 XML 由基类产出：`<Spread>...expr</Spread>`
（与 `NotNull` 同款——运算符本身就在子单元里，不需要额外属性）。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

**子单元必须一起克隆**：`Spread` 装着 `...` 与它作用的那一段，只克隆自己会让产物里出现
`<Spread />` 这样的**空壳**。克隆只在复合赋值展开（`compound-assignment-operator.xl.md`）
里被调用，被克隆的正是左侧表达式，所以左侧一旦含有展开就会丢内容。

顺序是 `Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new Spread(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
