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

## method PrintAst:(ctx:any, v:any)=>any

`extends A, B` / `implements C, D` → `HeritageClause`（只有 `types` 一个子字段；
**从 `ts-ast.xl.md` 的 `projectHeritageClause` 搬来**，第 184 轮）。

TS 那边 `HeritageClause` 的 `forEachChild` **只访问 `types`**：`extends` / `implements`
那个词是节点的**属性**（`token`），不参与遍历。产物那边它与类型是一串**平级单元**
（`[Keyword(extends), TypeReference, SymbolToken(,), TypeReference]`），照通用投影会把
`ExtendsKeyword` 当成一个子节点——实测「投影后多出来的节点」里 `ExtendsKeyword` 有 **2192 个**。

```ts
  const kids = ctx.Kids(v);
  // **子句词是节点的属性、不参与遍历** ✓（TS 那边就是这样 ✓）——
  // 所以它**不能留在 `types` 里** ✗（下面那一句就是干这件事的 ✓：
  // 实测「投影后多出来的节点」里 `ExtendsKeyword` 有 2192 个 ✓）。
  //
  // **但它也是唯一能分清 `extends` 与 `implements` 的地方** ✗（第 281 轮 ✓）：
  // 两条子句投影之后**形状一模一样** ✓（都只有 `types` ✓），
  // 于是「`class C implements I {}` 的父类是谁」这个问题在**降级层无从回答** ✓
  //（实测：它把 `I` 当成了父类 ✓，报 `name is not a local or a capture: I` ✓——
  // **响亮** ✓，可现场离真相很远 ✗）。
  //
  // **所以这一轮把它作为 `token` 属性收进来** ✓：名字照 TS 那一格 ✓（TS 的
  // `HeritageClause` 正是 `{ token, types }` ✓），值是**关键词文本** ✓——
  // 与这一层「kind 一律用名字」同一条口径 ✓（`"Identifier"` / `"ClassDeclaration"`
  // 都是名字 ✓，不是 TS 的数字 ✓）。
  // **它不进 `types`** ✓，所以**节点集合一个都没变** ✓——
  // `cases:tsast` 那一把尺子的「字段名」只统计**值里含节点**的键 ✓，
  // 而这是一个字符串 ✓，四方向因此都不受影响 ✓。
  let clauseWord = "";
  const kept: any[] = [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (
      (k.get("type") === "Keyword" || k.get("type") === "Identifier") &&
      (ctx.TextOf(k) === "extends" || ctx.TextOf(k) === "implements")
    ) {
      // **一条子句里只可能有一个子句词** ✓，取到就走 ✓（后面那几个是实体名 ✓）。
      if (clauseWord === "") clauseWord = ctx.TextOf(k);
      continue;
    }
    kept.push(k);
  }
  const projected = ctx.ProjectEach(kept, "HeritageClause");
  const props: any = clauseWord === "" ? {} : { token: clauseWord };
  if (projected.length > 0) props.types = projected;
  return ctx.NodeHead("HeritageClause", props, v);
```

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

## method PrintAst:(ctx:any, v:any)=>any

`extends` / `implements` 里的 `B<T>` → `ExpressionWithTypeArguments`
（`expression` = 被继承的那个名字，`typeArguments` = `<T>` 里的实参；
**从 `ts-ast.xl.md` 的 `projectExpressionWithTypeArguments` 搬来**，第 187 轮）。

产物那边是平级的两块（`[Identifier(B), GenericType(<T>)]`），
而字段表原来只把 `children` 整体映射成 `expression`——于是实参挂在 `expression` 下、
`typeArguments` 整个字段不见（实测 15 处）。`GenericType` 在这里的身份是**实参表**，不是节点。

**`extends (Base)`：被继承的那一格是一个表达式**（第 141 轮）。TS 的
`ExpressionWithTypeArguments.expression` 是 `LeftHandSideExpression`——带括号的基类在那边是
`ParenthesizedExpression`。只找名字的话整格 `expression` 会是空的
（实测 `decl-class-extends-parenthesized.ts`：缺 `ParenthesizedExpression` + 缺 `Identifier` + 字段名 1）。

```ts
  const kids = ctx.Kids(v);
  const generic = kids.find((k: any) => k.get("type") === "GenericType");
  const names = kids.filter((k: any) => ctx.IsNameNode(k));
  const props: any = {};
  if (names.length > 0) {
    props.expression = ctx.DottedExpression(names);
  } else {
    const paren = kids.find((k: any) => k.get("type") === "Bracket" && k.get("startBracket") === "(");
    if (paren !== undefined) {
      props.expression = ctx.ParenthesizedOf(paren);
    } else {
      const expr = kids.filter((k: any) => k !== generic);
      if (expr.length > 0) props.expression = ctx.Expression(expr);
    }
  }
  if (generic !== undefined) props.typeArguments = ctx.TypeArguments(generic);
  return ctx.NodeHead("ExpressionWithTypeArguments", props, v);
```

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
