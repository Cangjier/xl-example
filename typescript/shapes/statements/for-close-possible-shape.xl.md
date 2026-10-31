# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { ControlBodyPossibleShape } from "./control-body-possible-shape.xl.md"
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForStatementShape } from "./for-statement-shape.xl.md"
import { ForOfStatementShape } from "./for-of-statement-shape.xl.md"
import { ForInStatementShape } from "./for-in-statement-shape.xl.md"
```

# namespace cangjie

# class ForClosePossibleShape extends PossibleShape

头部的 `)`：按 Mode 把解析期的 ForHeadShape 换成真正的语句节点，并接上 body 候选。
TS 的节点是三种（ForStatement / ForOfStatement / ForInStatement），类名本身就是 AST 节点名，
所以种类必须在看到 `of` / `in` 之后才能定。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ForHeadShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(")")) {
  return ShapeStates.Reject;
}
if (host.Mode === "" || host.Mode === "classic") {
  return host.Segment === 2 ? ShapeStates.Accept : ShapeStates.Reject;
}
return host.Right !== null ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Symbol && unit.Closed && unit.Is(")");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const head = host as ForHeadShape;
const close = head.Data[tokenIndex] as Symbol;
head.Data.splice(tokenIndex, 1);
return this.StampCreated(ForClosePossibleShape.Finish(head, close, context), context);
```

## static method Finish:(head:ForHeadShape, close:Symbol, context:SyntaxContext)=>Token

```ts
head.SourceRange.End = close.SourceRange.End;
head.Closed = true;
let statement:ControlStatementShape;
if (head.Mode === "of") {
  statement = new ForOfStatementShape(head.Template);
} else if (head.Mode === "in") {
  statement = new ForInStatementShape(head.Template);
} else {
  statement = new ForStatementShape(head.Template);
}
statement.Kind = "for";
// 经典 `for (;;)` 没有条件可挂；用 BodyFirst 表示「没有头部条件也可以直接接 body」。
statement.BodyFirst = true;
statement.Pos = head.Pos;
statement.SignIn(head.SourceRange.Start);
let lastChild:Token | null = null;
for (const item of head.Data) {
  statement.Add(item);
  if (!item.IsTriviaToken && !item.IsBasicToken) {
    lastChild = item;
  }
}
head.Data.length = 0;
// of / in：body 的左边是被迭代表达式，借 Condition 记着它（只是字段，不是子节点）。
// 经典 for：body 的左边是最后一个子句（递增 / 条件 / 初始化），同样只是字段。
if (head.Mode === "of" || head.Mode === "in") {
  statement.Condition = head.Right;
} else {
  statement.Condition = lastChild;
}
statement.CatalogGuide = new CatalogGuide([new ControlBodyPossibleShape()], null);
const parent = head.Parent;
if (parent === null) {
  throw new Error("ForClosePossibleShape: for 头部没有父单元");
}
const at = parent.Data.indexOf(head);
if (at < 0) {
  throw new Error("ForClosePossibleShape: for 头部不在父单元里");
}
statement.Parent = parent;
parent.Data.splice(at, 1, statement);
parent.MountedUnit = statement;
return statement;
```
