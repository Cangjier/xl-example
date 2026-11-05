# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
import { TypeBalanceUtil } from "./type-balance-util.xl.md"
import { TypeParserApi } from "./type-parser-api.xl.md"
```

# namespace cangjie

# class TypeAliasEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return TypeBalanceUtil.IsBalanced(units, tokenIndex) ? ShapeStates.Accept : ShapeStates.Reject;
}
if (unit instanceof Common && unit.Closed && TypeAliasEndPossibleShape.IsStatementStart(unit)) {
  if (!TypeBalanceUtil.IsBalanced(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
  const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
  if (previous < 0 || !TypeAliasEndPossibleShape.HasLineTerminator(units, previous, tokenIndex)) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return TypeBalanceUtil.IsBalanced(units, tokenIndex);
}
if (unit instanceof Common && unit.Closed && TypeAliasEndPossibleShape.IsStatementStart(unit)) {
  if (!TypeBalanceUtil.IsBalanced(units, tokenIndex)) {
    return false;
  }
  const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
  return previous >= 0 && TypeAliasEndPossibleShape.HasLineTerminator(units, previous, tokenIndex);
}
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const unit = units[tokenIndex];
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
let end = unit.SourceRange.Start;
let tail:Array<Token> = [];
if (unit instanceof Symbol && unit.Is(";")) {
  end = unit.SourceRange.End;
  units.splice(tokenIndex, 1);
} else {
  end = previous >= 0 ? units[previous].SourceRange.End : unit.SourceRange.Start;
  tail = units.splice(previous >= 0 ? previous + 1 : tokenIndex);
}
if (alias.HasBuiltType()) {
  alias.TryToClose(context);
} else {
  const parsed = TypeParserApi.ParseAlias(units, units.length, alias.Template);
  TypeAliasDeclarationShape.Apply(alias, parsed, end);
  PossibleShape.StampAll(alias, context.Index);
  alias.Closed = true;
}
const parent = alias.Parent;
alias.Quit();
if (parent !== null && tail.length > 0) {
  let insertAt = parent.Data.indexOf(alias);
  insertAt = insertAt < 0 ? parent.Data.length : insertAt + 1;
  for (const item of tail) {
    item.Parent = parent;
    parent.Data.splice(insertAt, 0, item);
    insertAt++;
  }
  parent.MountedUnit = null;
}
return this.StampCreated(unit, context);
```

## static method IsStatementStart:(unit:Common)=>bool

```ts
const text = unit.TempToString();
switch (text) {
  case "let":
  case "const":
  case "var":
  case "function":
  case "class":
  case "interface":
  case "type":
  case "enum":
  case "namespace":
  case "module":
  case "declare":
  case "import":
  case "export":
  case "if":
  case "for":
  case "while":
  case "do":
  case "switch":
  case "try":
  case "return":
  case "throw":
  case "break":
  case "continue":
  case "debugger":
  case "with":
  case "async":
  case "abstract":
    return true;
  default:
    return false;
}
```

## private static method HasLineTerminator:(units:Array<Token>, prevIndex:int, tokenIndex:int)=>bool

```ts
for (let at = prevIndex + 1; at < tokenIndex; at++) {
  const item = units[at];
  if (!item.IsTriviaToken) {
    continue;
  }
  const text = item.AstText();
  if (text.indexOf("\n") >= 0 || text.indexOf("\r") >= 0 || text.indexOf("\u2028") >= 0 || text.indexOf("\u2029") >= 0) {
    return true;
  }
}
return false;
```
