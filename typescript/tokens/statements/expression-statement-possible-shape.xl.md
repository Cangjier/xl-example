# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
```

# namespace cangjie

# class ExpressionStatementScan

## field Start:int = -1

## field Checked:int = 0

## field Admitted:bool = false

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class ExpressionStatementPossibleShape extends PossibleShape

```txt
a;
a + b * c;
f(a, b).c;
a ? b : c;
a = b, c = d;
```

## method CanStart:(unit:Token)=>bool

```ts
if (unit instanceof Bracket) {
  return (unit as Bracket).StartBracketChar === "(";
}
if (unit instanceof RegexToken) {
  return true;
}
if (unit instanceof String) {
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "!"
    || text === "~"
    || text === "+"
    || text === "-"
    || text === "++"
    || text === "--";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "true" || text === "false" || text === "null" || text === "this") {
    return true;
  }
  if (text === "typeof" || text === "void" || text === "delete" || text === "new") {
    return true;
  }
  if (text.length > 0) {
    const ch = text[0];
    if (ch >= "0" && ch <= "9") {
      return true;
    }
  }
  return text !== "import"
    && text !== "export"
    && text !== "declare"
    && text !== "const"
    && text !== "let"
    && text !== "var"
    && text !== "function"
    && text !== "class"
    && text !== "interface"
    && text !== "enum"
    && text !== "namespace"
    && text !== "module"
    && text !== "type"
    && text !== "if"
    && text !== "else"
    && text !== "for"
    && text !== "while"
    && text !== "do"
    && text !== "switch"
    && text !== "case"
    && text !== "default"
    && text !== "try"
    && text !== "catch"
    && text !== "finally"
    && text !== "throw"
    && text !== "return"
    && text !== "break"
    && text !== "continue"
    && text !== "debugger"
    && text !== "with"
    && text !== "extends"
    && text !== "implements"
    && text !== "abstract"
    && text !== "public"
    && text !== "private"
    && text !== "protected"
    && text !== "static"
    && text !== "readonly"
    && text !== "async"
    && text !== "await"
    && text !== "yield"
    && text !== "using";
}
return false;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ExpressionStatementScan>(name);
if (state === null) {
  state = new ExpressionStatementScan();
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  state.Admitted = false;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!state.Admitted) {
    state.Admitted = true;
    if (!this.CanStart(unit)) {
      state.Rejected = true;
    }
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    state.Done = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
  }
}
state.Checked = tokenIndex + 1;
if (state.Rejected) {
  return ShapeStates.Reject;
}
if (state.Done) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<ExpressionStatementScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ExpressionStatementScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
const built = ExpressionStatementShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
