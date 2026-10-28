# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { VariableStatementShape } from "./variable-statement-shape.xl.md"
import { NumericLiteralPossibleShape } from "../expressions/numeric-literal-possible-shape.xl.md"
import { BinaryExpressionPossibleShape } from "../expressions/binary-expression-possible-shape.xl.md"
```

# namespace cangjie

# class VariableStatementPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (units.length === 0) {
  return ShapeStates.Uncertain;
}
const head = units[0];
if (!(head instanceof Common) || head.TempToString() !== "let") {
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
// `let` 之后、标识符收口之前一律「还缺后续单元」。
if (units.length !== 3 || tokenIndex !== 2) {
  return false;
}
const identifier = units[2];
return identifier instanceof Common && identifier.Closed && !identifier.IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const keyword = units[0] as Common;
const common = units[2] as Common;
const identifierPos = ItemUtil.PositionOf(units, 2);
const identifier = IdentifierShape.FromCommon(common, identifierPos);
common.Replace(identifier);
const declaration = new VariableDeclarationShape(host.Template);
declaration.Pos = identifierPos;
declaration.SignIn(identifier.SourceRange.Start);
declaration.Add(identifier);
declaration.CatalogGuide = new CatalogGuide([new NumericLiteralPossibleShape(), new BinaryExpressionPossibleShape()], null);
const list = new VariableDeclarationListShape(host.Template);
list.Pos = ItemUtil.PositionOf(units, 0);
list.SignIn(keyword.SourceRange.Start);
list.Add(declaration);
list.MountedUnit = declaration;
const statement = new VariableStatementShape(host.Template);
statement.Pos = ItemUtil.PositionOf(units, 0);
statement.SignIn(keyword.SourceRange.Start);
statement.Add(list);
statement.MountedUnit = list;
host.Data.splice(0, 3, statement);
statement.Parent = host;
host.MountedUnit = statement;
return statement;
```
