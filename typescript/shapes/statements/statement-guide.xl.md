# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { DebuggerStatementPossibleShape } from "./debugger-statement-possible-shape.xl.md"
import { EmptyStatementPossibleShape } from "./empty-statement-possible-shape.xl.md"
import { ExpressionStatementPossibleShape } from "./expression-statement-possible-shape.xl.md"
import { IfStatementPossibleShape } from "./if-statement-possible-shape.xl.md"
import { VariableStatementPossibleShape } from "./variable-statement-possible-shape.xl.md"
```

# namespace cangjie

# class StatementGuide

## static method Create:(endPossible:PossibleShape | null, extras:Array<PossibleShape>)=>CatalogGuide

```ts
const shapes:Array<PossibleShape> = [
  new VariableStatementPossibleShape(),
  new ExpressionStatementPossibleShape(),
  new EmptyStatementPossibleShape(),
  new DebuggerStatementPossibleShape(),
];
for (const item of extras) {
  shapes.push(item);
}
shapes.push(new IfStatementPossibleShape());
return new CatalogGuide(shapes, endPossible);
```
