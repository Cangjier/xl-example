# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ArgumentPossibleShape } from "./argument-possible-shape.xl.md"
import { BinaryExpressionPossibleShape } from "./binary-expression-possible-shape.xl.md"
import { CallExpressionEndPossibleShape } from "./call-expression-end-possible-shape.xl.md"
import { CallPossibleShape } from "./call-possible-shape.xl.md"
import { SpreadPossibleShape } from "./spread-possible-shape.xl.md"
import { SuffixAccessPossibleShape } from "./suffix-access-possible-shape.xl.md"
```

# namespace cangjie

# class CallExpressionShape extends ShapeToken

## field AwaitingClose:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
this.CatalogGuide = new CatalogGuide(
  [new ArgumentPossibleShape(), new BinaryExpressionPossibleShape(), new CallPossibleShape(), new SpreadPossibleShape(), new SuffixAccessPossibleShape()],
  new CallExpressionEndPossibleShape(),
);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
this.Closed = true;
return CloseStates.Nothing;
```
