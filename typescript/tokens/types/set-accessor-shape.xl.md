# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { MemberShellCatalog } from "./member-shell-catalog.xl.md"
```

# namespace cangjie

# class SetAccessorShape extends ShapeToken

```txt
class C { set a(v) {} }
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
if (MemberShellCatalog.IsOpen(this)) {
  if (MemberShellCatalog.HandOffOnBodyClose(this, value, context)) {
    return BranchStates.Reload;
  }
}
return BranchStates.Undo;
```

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
if (MemberShellCatalog.IsOpen(this)) {
  return MemberShellCatalog.HeadCompute(this, context);
}
return super.ComputePossibleShapes(context, source);
```

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

```ts
if (MemberShellCatalog.IsOpen(this)) {
  MemberShellCatalog.OnBracketCreated(this, bracket, context);
}
```
