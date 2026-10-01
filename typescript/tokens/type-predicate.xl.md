# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { WordText, IsTypeContainerUnit, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**类型谓词**：返回类型位上的 `x is T` / `this is T` / `asserts x is T` / `asserts x`
收成一个 `TypePredicate`。

TypeScript 那边它是一个**独立的类型节点**（`TypePredicate`：`parameterName` + 可选的
`assertsModifier` + 可选类型），本工程原来把这段留成 `TypeDefine` 里的散单元
（`<Identifier>x</Identifier><Keyword>is</Keyword><Identifier>string</Identifier>`），
`is` 只是一个关键词、**「这是类型谓词」这件事没有节点**。

**锚在容器的第一个实义单元上**（不是锚在 `is` 上）：`asserts x` 那一支根本没有 `is`
（TS 允许只断言「真」），只认 `is` 会漏掉它。判据因此是「这一格的内容**整体**长成谓词形状」✓。

**容器必须是类型容器，而且内容整段都是谓词**：参数标注 `x: unknown` 的内容只有一个词 ✗、
返回类型 `: Promise<void>` 也没有 `is` ✗——两者都不成形，不会误伤。

# class TypePredicateReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:TypePredicateReorganization = new TypePredicateReorganization()

唯一的实例。

## private method IsPredicateWord:(item:Token | null, text:string)=>bool

这个单元是不是那个词（`is` / `asserts`）。两种形态都认：还没升级的 `Identifier`
与已经升级的 `Keyword`（类型队列里 `KeywordReorganization` 排在最后，通用队列里可能已经跑过）。

```ts
if (item === null) {
  return false;
}
if (item instanceof Identifier) {
  return item.Is(text);
}
if (item.constructor.name === "Keyword") {
  return WordText(item) === text;
}
return false;
```

## private method IsPredicateAt:(units:Array<Token>, index:int)=>bool

`index` 处的这一格内容是不是一个类型谓词的开头。

形状两种（`asserts` 可以带 `is`，也可以只断言名字）：

    [asserts] <name> is <type…>
    [asserts] <name>

`<name>` 是 `Identifier` 或 `this`（`this is T` 里的 `this` 在词法阶段是 `Keyword`）。

**`is` 后面那一段不设限**：TS 的 `TypePredicate.type` 可以是联合 / 交叉 / 函数类型
（`x is A | B`），所以本规则整段收下，让 `TypePredicate` 自己挂通用队列把里面的类型继续成形
（与 TS 的 `TypePredicate > UnionType` 一对一）。

```ts
const first = Get(units, index);
if (first === null) {
  return false;
}
let cursor = index;
if (this.IsPredicateWord(first, "asserts")) {
  cursor = cursor + 1;
}
const name = Get(units, cursor);
if (name === null) {
  return false;
}
if (!(name instanceof Identifier) && name.constructor.name !== "Keyword") {
  return false;
}
const word = WordText(name);
if (word === "" || word === "asserts" || word === "is") {
  return false;
}
const next = Get(units, cursor + 1);
if (next === null) {
  // `asserts x`：整段到这里结束 ✓（单独的 `x` 不是谓词——所以必须见过 `asserts`）
  return cursor > index;
}
if (this.IsPredicateWord(next, "is") === false) {
  return false;
}
return Get(units, cursor + 2) !== null;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是谓词的开头。

三条：`index` 是容器里的**第一个实义单元**；容器是类型容器（`TypeDefine` / `ReturnType` /
`TypeParameter` / `TypeDefine` 的父链都在白名单里）；这一格内容整体长成谓词形状。

```ts
const current = Get(units, index);
if (current === null || current.Parent === null) {
  return false;
}
// **已经在谓词里就不再收**：本节点挂通用队列，收完之后它那一趟会再看到同一段
// （与 `optional-call.xl.md` 的守卫同一个理由）。
if (current.Parent.constructor.name === "TypePredicate") {
  return false;
}
// **条件类型里也不收**：`x is A extends B ? C : D` 的谓词在外层就已经收好了，
// 条件类型那一趟再进来一次就会与条件类型规则互相套娃（实测爆栈）。
if (current.Parent.constructor.name === "ConditionalType") {
  return false;
}
if (IsTypeContainerUnit(current.Parent) === false) {
  return false;
}
// **起点两处**：容器的第一个实义单元（返回类型位 / 类型别名位），
// 或者**紧跟函数类型的 `=>`**（`(value: T, …) => value is S` 这种**函数类型的返回位**）——
// 后者实测一大片（`lib.es2015.core.d.ts` 的 `Array#find`、`@types/node/stream.d.ts` 的 `find`），
// 函数类型的收集过程把返回类型直接摊平在节点里，没有 `TypeDefine`/`ReturnType` 可挂。
let isFirst = true;
for (let i = 0; i < index; i++) {
  if (!(Get(units, i) instanceof LineWrap)) {
    isFirst = false;
  }
}
if (isFirst === false) {
  const before = Get(units, SkipPreviousWrapSymbol(units, index));
  if (!(before instanceof SymbolToken) || before.Is("=>") === false) {
    return false;
  }
}
return this.IsPredicateAt(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整段收成一个 `TypePredicate`，**返回新的下标**。

**`Replace` 之前不许先 `Add`**（`type-bracket.xl.md` 记过这个坑）：`Token.Replace` 读的是
`this.Parent.Data`，先 `AddAndCloseLast` 会把 `Parent` 改成新节点。
这里要搬走一整段，所以统一用 `ReplaceCountAt`（只做 `splice`、不看 `Parent`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("TypePredicateReorganization.Process: current is null");
}
const result = new TypePredicate(current.Template);
result.SignIn(current.SourceRange.Start!);
result.SignOut(Get(units, units.length - 1)!.SourceRange.End!);
for (let i = index; i < units.length; i++) {
  const item = Get(units, i);
  if (item !== null) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, index, units.length - index, result);
```

# class TypePredicate extends IndependentToken

类型谓词（`x is T` / `this is T` / `asserts x is T` / `asserts x`）。类名必须与产物的标签名一致。

内容直接装在自己身上：可选的 `asserts`、参数名、`is`、以及类型（若写了）。

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——谓词里的类型要继续成形
（`x is A | B` 是 `TypePredicate > UnionType`，`x is (…)=>void` 是函数类型……）。
通用队列**包含**类型队列的全部成员，所以挂它不会丢东西 ✓。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TypePredicate(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
