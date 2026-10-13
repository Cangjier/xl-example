# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ImportDeclarationShape extends ShapeToken

```txt
import a from "m";
import { a, b as c } from "m";
import * as ns from "m";
import "m";
import type { T } from "m";
import a, { b } from "m";
import a from "m" with { type: "json" };
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method Close:()=>void

```ts
this.Closed = true;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

```ts
const value = source.Value;
if (value === ";") {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
if (value === "\n" || value === "\r") {
  const previous = source.Pre();
  if (previous === null) {
    return BranchStates.Undo;
  }
  this.SignOut(previous);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```
