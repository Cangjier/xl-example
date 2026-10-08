# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**解构元素**：`const { a, b: c, d = 1 } = obj` / `const [x, , y, ...rest] = arr` /
`function f({ p, q }: T) {}` 里，模式中每个逗号分隔的元素收成一个 `BindingElement`。

TypeScript 那边的形状（实测 AST）：

    VariableDeclaration
      ObjectBindingPattern «{ a, b: c, d = 1 }»
        BindingElement «a» / BindingElement «b: c» / BindingElement «d = 1»
      ArrayBindingPattern «[x, , y, ...rest]»
        BindingElement «x» / OmittedExpression «» / BindingElement «y» / BindingElement «...rest»

本工程原来把**语句位**的解构名收进 `Let` 的 `objectPattern` / `arrayPattern` 两个属性
（递归收集的逗号分隔表），**模式本身不进产物**——花括号、冒号、`=`、以及「这是几个绑定元素」
全都没有节点（第 66 轮第八批已让 `Let` 把模式括号搬进来）。形参位的解构本来就是
`ObjectLiteral` / `ArrayLiteral`，但里面同样是散单元。

**规则锚在模式括号上**（与 `parameter.xl.md` / `tuple-member.xl.md` 同款）：扫到的是那个
`{` / `[` 括号本身，`Process` 改的是**括号自己的 `Data`**，外层列表不动 → 返回原来的下标。

**宿主判据**（`current.Parent` 的类名）——只有这几种位置里的 `{…}` / `[…]` 才是**绑定模式**：

- `Let`（`const { … } = x`：模式在 `Let` 里，初始化式在它**外面**）；
- `BindingElement`（嵌套解构 `{ a: { b } }`）；
- `Parameter`（`function f({ p, q }: T)`）；
- `ForeachDefine`（**第 546 轮加的**）：`for (const [a, b] of xs)` / `for (const { x, y } of xs)`
  的声明段在产物里是一个 `ForeachDefine` —— 这一档的名字后面跟的是 `of` / `in`、
  `LetCloseRule` 从来不在那里进门 ⇒ 没有 `Let` 让它当宿主 ⇒ 括号里的散单元
  一个 `BindingElement` 都收不到（实测 `st-for-of-destructure` /
  `stmt-for-of-array-destructure` / `stmt-for-of-object-destructure` 三份）。

**值位的对象 / 数组字面量不受影响**：`const y = { a }` 的 `{}` 宿主是语句（不是上面三种）
一次都不会被收。

# class BindingElementCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:BindingElementCloseRule = new BindingElementCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一张还没收过的解构模式。

判据：这个单元的**宿主**是那几种之一（`Let` / `BindingElement` / `Parameter` / `CatchDefine` /
`ForeachDefine`）；
它本身是**已关闭的 `{` / `[` 括号**，或者已经先一步被 `JsonObject` / `JsonArray` 换成的
`ObjectLiteral` / `ArrayLiteral`（第二趟再进来时是后者）；里面还没有 `BindingElement`；
里面至少有一个实义单元。

```ts
const current = Get(units, index);
if (current === null || current.Parent === null) {
  return false;
}
const ownerName = current.Parent.constructor.name;
if (
  ownerName !== "Let" &&
  ownerName !== "BindingElement" &&
  ownerName !== "Parameter" &&
  ownerName !== "CatchDefine" &&
  ownerName !== "ForeachDefine"
) {
  return false;
}
// **形参里只有「首位」那个才是绑定模式**（实测踩过）：`function f({ a = 0 }: T)` 的
// 默认值 / 类型标注里也可能有 `{}` 字面量，那些是**表达式**、不是模式。
// 模式的判据是它在参数的最前面（TS 那边也是 `Parameter > ObjectBindingPattern`）。
if (ownerName === "Parameter") {
  for (let i = 0; i < index; i++) {
    const before = Get(units, i);
    if (before === null || before instanceof LineWrap) {
      continue;
    }
    // **剩余参数允许前面有个 `...`**：`next(...[value]: [] | [TNext])` 是
    // `Parameter > ArrayBindingPattern > BindingElement`（实测 4 处，
    // `lib.es2015.generator.d.ts` 这类库文件里）。`...` 可能已被收成 `Spread` 两种都放行。
    if (before.constructor.name === "Spread") {
      continue;
    }
    if (before instanceof SymbolToken && before.Is("...")) {
      continue;
    }
    return false;
  }
}
// **`=` 之后的括号是初始化式，不是模式**（第 589 轮）：`{ a: { b } = { c: 0 } }` 里
// 那个 `{ c: 0 }` 的宿主**也是** `BindingElement` —— 少了这一条，它会被切成
// `BindingElement «c : 0»` ⇒ 投影出来的对象字面量里是一个
// `ShorthandPropertyAssignment > BindingElement`（值位的字面量整片投错），
// 而降到 IR 那一步报 `unimplemented: expression BindingElement`（实测
// `c371-ex-destructuring-everywhere`：解构形参里带默认值的嵌套模式）。
// 判据与 `Parameter` 那一档同形：**只看位置**——`=` 之前的那一个才是嵌套模式。
if (ownerName === "BindingElement") {
  for (let i = 0; i < index; i++) {
    const before = Get(units, i);
    if (before instanceof SymbolToken && before.Is("=")) {
      return false;
    }
  }
}
const name = current.constructor.name;
const isPatternBracket =
  current instanceof Bracket &&
  current.Closed &&
  (current.startBracket === "{" || current.startBracket === "[");
if (isPatternBracket === false && name !== "ObjectLiteral" && name !== "ArrayLiteral") {
  return false;
}
let hasContent = false;
for (const item of current.Data) {
  if (item.constructor.name === "BindingElement") {
    return false;
  }
  if (!(item instanceof LineWrap)) {
    hasContent = true;
  }
}
if (hasContent === false) {
  return false;
}
// **计算属性名不是绑定模式**（第 66 轮第十一批实测）：`const { [k]: v } = o` 里 `[k]`
// 是 `propertyName`（TS 那边是 `ComputedPropertyName`，里面 `k` 是一个**表达式**），
// 不是 `ArrayBindingPattern`。判据是**紧跟一个 `:`**——模式的括号后面只会是 `,` / `}` / `]` / 结尾。
// 少了这一条，`k` 会被收成 `<BindingElement>`（实测产物是
// `<BindingElement><ArrayLiteral><BindingElement>k</BindingElement></ArrayLiteral> : v</BindingElement>`）。
const after = Get(units, SkipNextWrapSymbol(units, index));
if (after instanceof SymbolToken && after.Is(":")) {
  return false;
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

按**顶层逗号**把模式切成若干段，每段收成一个 `BindingElement`，**返回原来的下标**。

逗号留在原地；软换行留着（与形参那条同一理由：少一个叶子会让 XML 定位器错位）。
**空段**（`[x, , y]` 的洞）跳过——TS 那边是 `OmittedExpression`，本工程不给节点（它不在验收表里）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("BindingElementCloseRule.Process: current is null");
}
const original: Token[] = [];
for (const item of current.Data) {
  original.push(item);
}
const rebuilt: Token[] = [];
let segment: Token[] = [];
for (const item of original) {
  if (item instanceof SymbolToken && item.Is(",")) {
    this.AppendSegment(rebuilt, segment, current);
    segment = [];
    rebuilt.push(item);
    continue;
  }
  segment.push(item);
}
this.AppendSegment(rebuilt, segment, current);
current.Data.splice(0, current.Data.length, ...rebuilt);
return index;
```

## private method AppendSegment:(rebuilt:Array<Token>, segment:Array<Token>, owner:Token)=>void

把一段（一个绑定元素的单元）收成 `BindingElement`；空段（只有软换行）跳过。

`BindingElement` 自己挂通用队列——`b: c` 的 `:`、`d = 1` 的默认值、`...rest` 的展开
都在它那一趟里继续成形。

```ts
const content: Token[] = [];
let hasReal = false;
for (const item of segment) {
  content.push(item);
  if (!(item instanceof LineWrap)) {
    hasReal = true;
  }
}
if (hasReal === false) {
  return;
}
// **`...` 可能已经被 `SpreadCloseRule` 收成一个 `Spread` 节点**（与元组的
// `RestType` 同一情形）：TS 那边 `BindingElement` 的子节点是 `DotDotDotToken` + 名字，
// 不是一个 `SpreadElement`——留着它会报 `Spread in BindingElement`（实测 5 处）。
// 这里把 `Spread` 的内容摊出来再装进元素。
const flattened: Token[] = [];
for (const item of content) {
  if (item.constructor.name === "Spread") {
    for (const inner of item.Data) {
      flattened.push(inner);
    }
    continue;
  }
  flattened.push(item);
}
const element = new BindingElement(owner.Template);
element.Parent = owner;
element.SignIn(flattened[0].SourceRange.Start!);
element.SignOut(flattened[flattened.length - 1].SourceRange.End!);
for (const item of flattened) {
  element.AddAndCloseLast(item);
}
element.TryToClose();
rebuilt.push(element);
```

# class BindingElement extends IndependentToken

一个解构绑定元素（`a` / `b: c` / `d = 1` / `...rest` / 嵌套 `{ b }`）。类名必须与产物的标签名一致。

内容直接装在自己身上：属性名、`:`、绑定名、默认值、展开号，或者嵌套的模式。

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——嵌套解构 `{ a: { b } }` 里那个内层模式要在它自己的
队列里再收一层 `BindingElement`。

**绑定里的 `:` 不是类型标注**：`{ b: c }` 是**重命名**（TS 的 `BindingElement` 上是
`propertyName` + `name` 两个字段），所以 `type-define.xl.md` 里有一条守卫——
父单元是 `BindingElement` 时不凑 `TypeDefine`（少了那条，产物里会出现
`<BindingElement><TypeDefine>b: c</TypeDefine></BindingElement>` 这种把重命名读成类型的形状）。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new BindingElement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
