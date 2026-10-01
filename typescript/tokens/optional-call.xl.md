# dependencies
```xl
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Method } from "./method.xl.md"
import { NotNull } from "./not-null.xl.md"
import { PropertyAccess } from "./property-access.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**可选调用 / 非空断言调用**：`a?.()` / `a.b?.()` / `a?.b.c?.d?.()` / `b!()` 收成一个 `Method`。

它们与普通调用**在 TypeScript 那边是同一个构造**（`CallExpression`，只是被调者上多了
`questionDotToken` 或是一层 `NonNullExpression`），所以这里产出的也是同一个 `<Method>` 标签 ✓。
对不上的原因在**形状**：

| 源码 | 原来 | TS |
| --- | --- | --- |
| `a?.()` | `Identifier a` + `NullConditionalOperator > Bracket( )` | `CallExpression` |
| `b!()` | `NotNull(b,!)` + `Bracket( )` | `CallExpression` |

也就是说**实参表被 `NullConditionalOperator` 吞了**（`method.xl.md` 的判据锚在
「名字 + `(` 括号」上，此刻括号在 NCO 里面，它根本看不到），或者被调者是个 `NotNull`
（判据只认 `Identifier` / 括号）。两者都不成形，`cases:align` 因此缺 `CallExpression` 6 处。

规则排在**通用队列里、`NotNullReorganization` 之后**：那时 NCO（第 13 位）与
`NotNull`（第 40 位附近）都已经成形 ✓。两条支路都靠**第二趟**兜住——
重组的队列固定跑两趟，第一趟造出被调者、第二趟才能把它收进调用 ✓。

# class OptionalCallReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:OptionalCallReorganization = new OptionalCallReorganization()

唯一的实例。

## private method IsCallArguments:(item:Token | null)=>bool

这个单元是不是一个**取实参的圆括号**（`(` + `)`，而且已经关闭）。

必须要求 `Closed`：规则跑得晚，未关闭的括号说明这一层还没成形，此刻收会把半截括号搬进去。

```ts
if (!(item instanceof Bracket)) {
  return false;
}
return item.startBracket === "(" && item.Closed;
```

## private method IsOptionalCallAt:(units:Array<Token>, index:int)=>bool

`index` 处的这个 `NullConditionalOperator` 是不是**可选调用**：它的 `Data` 末尾是一个实参括号。

`a?.()` 里 `?.` 与括号一起进了 NCO（末尾就是括号）✓；`a?.b` 里 NCO 装的是属性名 `b` ✗
（那是可选**成员访问**，不是调用，不该在这里收）。

```ts
const current = Get(units, index);
if (current === null || current.constructor.name !== "NullConditionalOperator") {
  return false;
}
const last = current.Data[current.Data.length - 1];
if (this.IsCallArguments(last) === false) {
  return false;
}
// 被调者必须紧挨着它（`a?.()` 的 `a`），否则是被调者链上的下一跳
const before = Get(units, SkipPreviousWrapSymbol(units, index));
return this.IsCalleeEnd(before);
```

## private method IsCalleeEnd:(item:Token | null)=>bool

这个单元能不能当被调者的**尾巴**（`a?.()` 的 `a`、`a.b?.()` 的 `b`、`a?.b.c?.()` 的 `c`、
`f()?.()` 的 `f()`、`a![k]?.()` 的 `]`）。

**`PropertyAccess` 也要认**：成员访问链在 token 层就折成一个单元（见
`property-access.xl.md`），`a.b.c?.()` 里那一整条链可能已经是它——不认的话
`?.` 那一趟会判成「前面不是被调者」而放走整个可选调用。

```ts
if (item === null) {
  return false;
}
if (item instanceof Identifier || item instanceof Method) {
  return true;
}
if (item instanceof PropertyAccess) {
  return true;
}
if (item.constructor.name === "NullConditionalOperator" || item.constructor.name === "NotNull") {
  return true;
}
if (item instanceof Bracket) {
  return item.Closed;
}
return false;
```

## private method IsChainLink:(item:Token | null)=>bool

被调者链上还能再往左走的一格：成员访问的点号、被调者本身、或者一个已关闭的下标括号。

`PropertyAccess` 与 `IsCalleeEnd` 同一个理由：一条折好的链整体**就是**被调者链的一格。

```ts
if (item === null) {
  return false;
}
if (item instanceof SymbolToken && (item.Is(".") || item.Is("?."))) {
  return true;
}
if (item instanceof Identifier || item instanceof Method) {
  return true;
}
if (item instanceof PropertyAccess) {
  return true;
}
if (item.constructor.name === "NullConditionalOperator" || item.constructor.name === "NotNull") {
  return true;
}
if (item instanceof Bracket) {
  return item.Closed;
}
return false;
```

## private method CalleeStart:(units:Array<Token>, index:int)=>int

`index` 处那个「尾巴」所属的**被调者起点**：一路往左吃成员访问链
（`a.b.c?.()` 的起点是 `a`）。

遇到不认识的单元就停——点号与标识符之外的任何东西（逗号、赋值、运算符、语句关键字）
都是链的边界 ✓。

```ts
let start = index;
while (start - 1 >= 0) {
  const before = Get(units, start - 1);
  if (this.IsChainLink(before) === false) {
    break;
  }
  start = start - 1;
}
return start;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

两条支路任一成立：

1. **可选调用**：`index` 处是个末尾装着实参括号的 `NullConditionalOperator`
   （`a?.()` / `a.b?.()` / `a?.b.c?.d?.()`）；
2. **非空断言调用**：`index` 处是实参括号，而它前面紧跟一个 `NotNull`（`b!()`）。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
// **已经在调用节点里就不再收**：`Method` 自己也挂通用队列，收完之后它那一趟会再看到
// 里面的 NCO / 括号——不挡的话每次 `TryToClose` 都再包一层，直接爆栈
// （实测 `Maximum call stack size exceeded`）。被调者与实参表进了 `Method`
// 就说明这一次调用已经收好了 ✓。
if (current.Parent !== null && current.Parent.constructor.name === "Method") {
  return false;
}
if (this.IsOptionalCallAt(units, index)) {
  return true;
}
if (this.IsCallArguments(current) === false) {
  return false;
}
const before = Get(units, SkipPreviousWrapSymbol(units, index));
return before !== null && before.constructor.name === "NotNull";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把被调者与被调用的括号收成一个 `Method`，**返回新的下标**。

两条支路的范围不同：可选调用的括号在 NCO **里面**（起点要往左找被调者链）；
非空断言调用的括号在外面（只多带一个 `NotNull`）。

`name` 取被调者链的第一节文本（`a?.()` 记 `a`）——`Method` 的开标签上有这个属性，
与普通调用（`method.xl.md`）保持一致；取不到就给空串。

**`Replace` 之前不许先 `Add`**（`type-bracket.xl.md` 记过这个坑）：`Token.Replace` 读的是
`this.Parent.Data`，先 `AddAndCloseLast` 会把 `Parent` 改成新节点。
这里两头都可能动，所以统一用 `ReplaceCountAt`（只做 `splice`、不看 `Parent`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("OptionalCallReorganization.Process: current is null");
}
let startIndex = index;
if (current.constructor.name === "NullConditionalOperator") {
  startIndex = this.CalleeStart(units, SkipPreviousWrapSymbol(units, index));
} else {
  startIndex = SkipPreviousWrapSymbol(units, index);
}
const first = Get(units, startIndex);
if (first === null) {
  throw new Error("OptionalCallReorganization.Process: first is null");
}
const result = new Method(current.Template);
result.Parent = current.Parent;
if (first instanceof Identifier) {
  result.name = first.TempToString();
}
result.SignIn(first.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
for (let i = startIndex; i <= index; i++) {
  const item = Get(units, i);
  if (item !== null) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, index - startIndex + 1, result);
```
