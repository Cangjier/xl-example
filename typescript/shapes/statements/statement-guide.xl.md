# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BreakStatementPossibleShape } from "./break-statement-possible-shape.xl.md"
import { ContinueStatementPossibleShape } from "./continue-statement-possible-shape.xl.md"
import { DebuggerStatementPossibleShape } from "./debugger-statement-possible-shape.xl.md"
import { DoStatementPossibleShape } from "./do-statement-possible-shape.xl.md"
import { EmptyStatementPossibleShape } from "./empty-statement-possible-shape.xl.md"
import { ExpressionStatementPossibleShape } from "./expression-statement-possible-shape.xl.md"
import { ForStatementPossibleShape } from "./for-statement-possible-shape.xl.md"
import { IfStatementPossibleShape } from "./if-statement-possible-shape.xl.md"
import { VariableStatementPossibleShape } from "./variable-statement-possible-shape.xl.md"
import { WhileStatementPossibleShape } from "./while-statement-possible-shape.xl.md"
import { SwitchStatementPossibleShape } from "./switch-statement-possible-shape.xl.md"
import { TryStatementPossibleShape } from "./try-statement-possible-shape.xl.md"
import { TypeAliasPossibleShape } from "../types/type-alias-possible-shape.xl.md"
```

# namespace cangjie

# class StatementGuide

## static method Create:(endPossible:PossibleShape | null, extras:Array<PossibleShape>)=>CatalogGuide

```ts
const shapes:Array<PossibleShape> = [
  new VariableStatementPossibleShape(),
  new TypeAliasPossibleShape(),
  new ExpressionStatementPossibleShape(),
  new EmptyStatementPossibleShape(),
  new DebuggerStatementPossibleShape(),
  new BreakStatementPossibleShape(),
  new ContinueStatementPossibleShape(),
];
for (const item of extras) {
  shapes.push(item);
}
shapes.push(new IfStatementPossibleShape());
shapes.push(new WhileStatementPossibleShape());
shapes.push(new DoStatementPossibleShape());
shapes.push(new SwitchStatementPossibleShape());
shapes.push(new ForStatementPossibleShape());
shapes.push(new TryStatementPossibleShape());
return new CatalogGuide(shapes, endPossible);
```
