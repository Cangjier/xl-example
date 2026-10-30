# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { StatementUtil } from "../statements/statement-util.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
import { TypeAliasEndPossibleShape } from "./type-alias-end-possible-shape.xl.md"
import { TypeFunctionArrowPossibleShape } from "./type-function-incremental.xl.md"
import { TypeAliasChainPossibleShape } from "./type-conditional-chain.xl.md"
```

# namespace cangjie

# class TypeAliasPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
if (start >= units.length) {
  return ShapeStates.Uncertain;
}
const head = units[start];
if (!(head instanceof Common) || head.TempToString() !== "type") {
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
// 语句头是 `type`，且名称标识符刚刚关闭、是这一格的最后一个单元。
const start = StatementUtil.StartIndex(units);
if (start >= units.length) {
  return false;
}
const head = units[start];
if (!(head instanceof Common) || head.TempToString() !== "type") {
  return false;
}
const nameIndex = StatementUtil.NextCode(units, start + 1);
if (nameIndex < 0 || nameIndex !== tokenIndex || nameIndex !== units.length - 1) {
  return false;
}
const name = units[nameIndex];
if (!(name instanceof Common) || !name.Closed) {
  return false;
}
const text = name.TempToString();
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
const keywordIndex = start;
const nameIndex = StatementUtil.NextCode(units, keywordIndex + 1);
if (keywordIndex < 0 || nameIndex < 0) {
  throw new Error("TypeAliasPossibleShape: 缺 type 或名称");
}
const keyword = units[keywordIndex] as Common;
const name = units[nameIndex] as Common;
const identifier = IdentifierShape.FromCommon(name, ItemUtil.PositionOf(units, nameIndex));
const alias = new TypeAliasDeclarationShape(host.Template);
alias.Pos = ItemUtil.PositionOf(units, keywordIndex);
alias.SignIn(keyword.SourceRange.Start);
alias.Add(identifier);
alias.CatalogGuide = new CatalogGuide(
  [new TypeFunctionArrowPossibleShape(), new TypeAliasChainPossibleShape()],
  new TypeAliasEndPossibleShape(),
);
units.splice(start, nameIndex - start + 1, alias);
alias.Parent = host;
host.MountedUnit = alias;
return alias;
```
