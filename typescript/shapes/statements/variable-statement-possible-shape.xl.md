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
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { StatementUtil } from "./statement-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { InitializerPossibleShape } from "../expressions/initializer-possible-shape.xl.md"
import { BinaryExpressionPossibleShape } from "../expressions/binary-expression-possible-shape.xl.md"
import { AsiPossibleShape } from "./asi-possible-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { VariableStatementEndPossibleShape } from "./variable-statement-end-possible-shape.xl.md"
import { VariableStatementShape } from "./variable-statement-shape.xl.md"
```

# namespace cangjie

# class VariableStatementPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
if (start >= units.length) {
  return ShapeStates.Uncertain;
}
const head = units[start];
if (!(head instanceof Common) || head.TempToString() !== "let") {
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
// 当前语句的头是 `let`，标识符收口，并且标识符是这一格唯一的代码单元。
const start = StatementUtil.StartIndex(units);
const keywordIndex = start;
if (keywordIndex >= units.length) {
  return false;
}
const keyword = units[keywordIndex];
if (!(keyword instanceof Common) || keyword.TempToString() !== "let") {
  return false;
}
const identifierIndex = StatementUtil.NextCode(units, keywordIndex + 1);
if (identifierIndex < 0 || identifierIndex !== tokenIndex || identifierIndex !== units.length - 1) {
  return false;
}
const identifier = units[identifierIndex];
return identifier instanceof Common && identifier.Closed;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
const keywordIndex = start;
const identifierIndex = StatementUtil.NextCode(units, keywordIndex + 1);
if (keywordIndex < 0 || identifierIndex < 0) {
  throw new Error("VariableStatementPossibleShape: 缺 let 或标识符");
}
const keyword = units[keywordIndex] as Common;
const common = units[identifierIndex] as Common;
const identifierPos = OperandUtil.PositionOf(units, identifierIndex);
const identifier = IdentifierShape.FromCommon(common, identifierPos);
const declaration = new VariableDeclarationShape(host.Template);
declaration.Pos = identifierPos;
declaration.SignIn(identifier.SourceRange.Start);
declaration.Add(identifier);
declaration.CatalogGuide = new CatalogGuide(
  [new InitializerPossibleShape(), new BinaryExpressionPossibleShape(), new AsiPossibleShape()],
  new VariableStatementEndPossibleShape(),
);
const list = new VariableDeclarationListShape(host.Template);
list.Pos = ItemUtil.PositionOf(units, keywordIndex);
list.SignIn(keyword.SourceRange.Start);
list.Add(declaration);
list.MountedUnit = declaration;
const statement = new VariableStatementShape(host.Template);
statement.Pos = ItemUtil.PositionOf(units, keywordIndex);
statement.SignIn(keyword.SourceRange.Start);
statement.Add(list);
statement.MountedUnit = list;
units.splice(start, identifierIndex - start + 1, statement);
statement.Parent = host;
host.MountedUnit = statement;
return this.StampCreated(statement, context);
```
