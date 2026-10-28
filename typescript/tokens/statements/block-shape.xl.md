# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../../../core/syntax/i-compute-possible-shapes.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class BlockShape extends ShapeToken

```txt
{ }
{ let x = 1; }
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
const mounted = this.MountedUnit;
if (!this.Closed && mounted !== null && mounted instanceof Bracket && (mounted as Bracket).Closed) {
  this.TryToClose(context);
}
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  return (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, source);
}
return ComputePossibleShapesStates.Nothing;
```
