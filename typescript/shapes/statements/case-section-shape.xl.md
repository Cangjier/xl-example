# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class CaseSectionShape extends ShapeToken


## field Test:Token | null = null

## static method HandBack:(section:Token, tokenIndex:int, context:SyntaxContext)=>void

```ts
const units = section.Data;
const token = units[tokenIndex];
units.splice(tokenIndex, 1);
const tail:Array<Token> = [];
while (units.length > 0 && units[units.length - 1].IsTriviaToken) {
  tail.unshift(units.pop()!);
}
let end = section.SourceRange.End;
for (let at = units.length - 1; at >= 0; at--) {
  const unit = units[at];
  if (unit.IsTriviaToken || unit.IsBasicToken) {
    continue;
  }
  if (unit.SourceRange.End > end) {
    end = unit.SourceRange.End;
  }
  break;
}
section.SourceRange.End = end;
section.TryToClose(context);
const parent = section.Parent;
section.Quit();
if (parent === null) {
  return;
}
const at = parent.Data.indexOf(section);
for (const item of tail) {
  item.Parent = parent;
  parent.Data.splice(at + 1, 0, item);
}
token.Parent = parent;
parent.Data.splice(at + 1 + tail.length, 0, token);
const block = parent as UnitToken;
block.MountedUnit = null;
block.ComputePossibleShapesByIndex(at + 1 + tail.length, context, PossibleSource.Close);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
if (this.SourceRange.End < 0) {
  for (let at = this.Data.length - 1; at >= 0; at--) {
    const unit = this.Data[at];
    if (unit.IsTriviaToken || unit.IsBasicToken) {
      continue;
    }
    if (unit.SourceRange.End >= 0) {
      this.SourceRange.End = unit.SourceRange.End;
    }
    break;
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
this.Closed = true;
return CloseStates.Nothing;
```
