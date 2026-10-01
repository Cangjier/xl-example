# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { WordText, SkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**继承段**：`class C extends B implements I, J` 与 `interface K extends L<M>, N` 里的
`extends …` / `implements …` 各收成一个 `HeritageClause`，段里每个实体名收成一个
`ExpressionWithTypeArguments`。

TypeScript 那边的形状（实测 AST）：

    ClassDeclaration
      HeritageClause «extends B»            → ExpressionWithTypeArguments «B»
      HeritageClause «implements I, J»      → ExpressionWithTypeArguments «I», «J»
    InterfaceDeclaration
      HeritageClause «extends L<M>, N»      → ExpressionWithTypeArguments «L<M>»（名字 + 类型实参都在里面）, «N»

本工程原来只在**属性**里记这件事（`<Class extends="B" implements="I,J">`）：
类还把那些单元留在子单元里（`Keyword extends` / `Identifier B` ……），
接口更彻底——`entities` 那一段的名字与逗号被规则**消费掉**，只留一个类型实参段
（第 66 轮第七批已经让接口把名字与逗号也搬进来 ✓）。两边都缺「这是一条继承子句」的节点。

**规则锚在 `extends` / `implements` 那个词上**：宿主必须是 `Class` 或 `Interface`
（它俩的队列都是通用队列 ✓），段的范围到**下一个 `implements`** 或**类的体括号**
（`ClassBody` / `InterfaceBody`）为止 ✓。

`ExpressionWithTypeArguments` 里装**名字与它的类型实参**（`L<M>` 整个 ✓）——
与 TS 一致：`ExpressionWithTypeArguments` 的 `expression` 是名字、`typeArguments` 是那段实参，
区间覆盖两者 ✓。

# class HeritageClauseReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:HeritageClauseReorganization = new HeritageClauseReorganization()

唯一的实例。

## private method IsClauseWord:(item:Token | null)=>bool

这个单元是不是 `extends` / `implements` 这两个词之一（两种形态都认：没升级的 `Identifier`
与已升级的 `Keyword` ✓）。

```ts
if (item === null) {
  return false;
}
const word = WordText(item);
return word === "extends" || word === "implements";
```

## private method OwnerOf:(item:Token | null)=>Token | null

`item` 的宿主是不是 `Class` / `Interface`；是就给宿主，否则 `null`。

```ts
if (item === null || item.Parent === null) {
  return null;
}
const name = item.Parent.constructor.name;
if (name === "Class" || name === "Interface") {
  return item.Parent;
}
return null;
```

## private method ClauseEnd:(units:Array<Token>, index:int)=>int

这条子句的终点（含）：走到**下一个 `implements`** 之前、或者**体括号**之前。

```ts
let end = index;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    break;
  }
  // **体节点也要停**（实测踩过）：`Class` 的子单元是 `ClassBody` 节点、不是 `{` 括号，
  // 只认 `Bracket` 时最后一段会把整个类体吞进 `ExpressionWithTypeArguments`
  // （`class C extends B implements J {}` 的 `J` 后面挂着 `<ClassBody>`）。
  const name = item.constructor.name;
  if (name === "ClassBody" || name === "InterfaceBody") {
    break;
  }
  // 体是 `{` 括号（有些写法里进得来），`(` **不是**边界：
  // `class A extends (Base) {}` / `class B extends mixin(C) {}` 是合法的继承表达式，
  // 括号属于那个实体名（实测漏过 1 处：`decl-class-extends-parenthesized`）。
  if (item instanceof Bracket && item.startBracket === "{") {
    break;
  }
  if (this.IsClauseWord(item) && WordText(item) === "implements") {
    break;
  }
  if (!(item instanceof LineWrap)) {
    end = i;
  }
}
return end;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一条还没收过的继承子句的开头。

三条：是 `extends` / `implements` 那个词；宿主是 `Class` / `Interface`；
**这个单元还没被收进 `HeritageClause`**（第二趟守卫——看它是不是已经有一个祖先叫 `HeritageClause`）。

```ts
const current = Get(units, index);
if (this.IsClauseWord(current) === false) {
  return false;
}
if (this.OwnerOf(current) === null) {
  return false;
}
if (current === null) {
  return false;
}
let node: Token | null = current.Parent;
while (node !== null) {
  if (node.constructor.name === "HeritageClause") {
    return false;
  }
  node = node.Parent;
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把这条子句收成一个 `HeritageClause`（里面的实体名各套一个 `ExpressionWithTypeArguments`），
**返回新的下标**。

**`Replace` 之前不许先 `Add`**（`type-bracket.xl.md` 记过这个坑）：`Token.Replace` 读的是
`this.Parent.Data`，先 `AddAndCloseLast` 会把 `Parent` 改成新节点。
这里要搬走一整段，所以统一用 `ReplaceCountAt`（只做 `splice`、不看 `Parent`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("HeritageClauseReorganization.Process: current is null");
}
const endIndex = this.ClauseEnd(units, index);
const clause = new HeritageClause(current.Template);
clause.Parent = current.Parent;
clause.SignIn(current.SourceRange.Start!);
clause.SignOut(Get(units, endIndex)!.SourceRange.End!);
// 子句词自己作为一个子单元进节点（TS 的 HeritageClause 区间含 `extends` ✓）
clause.AddAndCloseLast(current);
// 逗号分段的实体名：每段一个 `ExpressionWithTypeArguments`
let segment: Token[] = [];
let segmentStart = -1;
for (let i = index + 1; i <= endIndex + 1; i++) {
  const item = i <= endIndex ? Get(units, i) : null;
  if (item === null || (item instanceof SymbolToken && item.Is(","))) {
    if (segmentStart >= 0) {
      const target = new ExpressionWithTypeArguments(current.Template);
      target.Parent = clause;
      target.SignIn(Get(units, segmentStart)!.SourceRange.Start!);
      target.SignOut(Get(units, segmentStart + segment.length - 1)!.SourceRange.End!);
      for (const unit of segment) {
        target.AddAndCloseLast(unit);
      }
      target.TryToClose();
      clause.AddAndCloseLast(target);
      segment = [];
      segmentStart = -1;
    }
    if (item instanceof SymbolToken && item.Is(",")) {
      clause.AddAndCloseLast(item);
    }
    continue;
  }
  if (segmentStart < 0) {
    segmentStart = i;
  }
  segment.push(item);
}
clause.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, clause);
```

# class HeritageClause extends IndependentToken

一条继承子句（`extends B` / `implements I, J`）。类名必须与产物的标签名一致。

内容：子句词（`extends` / `implements`）、逗号、以及每个实体名的 `ExpressionWithTypeArguments`。

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——子句里的类型实参段（`L<M>` 的 `<M>`）要照常成形 ✓。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new HeritageClause(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class ExpressionWithTypeArguments extends IndependentToken

继承子句里的一个实体名（`B` / `L<M>`）。类名必须与产物的标签名一致。

名字与它的类型实参都在里面（与 TS 的 `ExpressionWithTypeArguments` 一致 ✓）。

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——类型实参段要在里面成形 ✓。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new ExpressionWithTypeArguments(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
