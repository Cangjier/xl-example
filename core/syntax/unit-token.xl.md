# dependencies
```xl
import { ComputePossibleShapesStates } from "./compute-possible-shapes-states.xl.md"
import { SyntaxException } from "../exceptions/syntax-exception.xl.md"
import { BranchStates } from "./branch-states.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { IComputePossibleShapes } from "./i-compute-possible-shapes.xl.md"
import { PossibleSource } from "./possible-source.xl.md"
import { ReloadMessage } from "./messages/reload-message.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { TokenIndex } from "./token-index.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

# class UnitToken extends Token implements IComputePossibleShapes

## field CatalogGuide:CatalogGuide | null = null

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
if (this.CatalogGuide !== null) {
  return this.CatalogGuide.ComputePossibleShapes(this, context, source);
}
return ComputePossibleShapesStates.Nothing;
```

## method ComputePossibleShapesByIndex:(index:TokenIndex, context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
if (this.CatalogGuide !== null) {
  return this.CatalogGuide.ComputePossibleShapesByIndex(index, context, source);
}
return ComputePossibleShapesStates.Nothing;
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
throw new Error("abstract member: ExitOrPre");
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
try {
  const end = buffer.End;
  const messages = context.Messages;
  const replaying = context.Replaying;
  const queue = this.ProcessQueue;
  while (index < end) {
    const parent = this.Parent;
    if (parent !== null && parent.MountedUnit !== this) {
      return;
    }
    if (!replaying && messages.length > 0) {
      return;
    }
    const mountedUnit = this.MountedUnit;
    if (mountedUnit !== null) {
      mountedUnit.Process(context, buffer, index);
      if (context.Index === index) {
        return;
      }
      this.LastIndex = context.Index - 1;
      index = context.Index;
      continue;
    }
    const value = buffer.At(index);
    const exitState = this.ExitOrPre(context, buffer, index, value);
    if (exitState === BranchStates.Reload) {
      context.Messages.push(new ReloadMessage(null, index));
      return;
    }
    if (exitState === BranchStates.Done) {
      if (context.Index === index) {
        context.Index = index + 1;
      }
      this.LastIndex = index;
      index = context.Index;
      continue;
    }
    let transited = false;
    if (queue !== null) {
      const branches = queue.Data;
      for (let branch = 0; branch < branches.length; branch++) {
        const state = branches[branch](context, this, buffer, index, value);
        if (state === BranchStates.Reload) {
          context.Messages.push(new ReloadMessage(null, index));
          return;
        }
        if (state === BranchStates.Done) {
          if (context.Index === index) {
            context.Index = index + 1;
          }
          this.LastIndex = context.Index - 1;
          index = context.Index;
          transited = true;
          break;
        }
      }
    }
    if (!transited) {
      this.Default(context, buffer, index, value);
      if (context.Index === index) {
        context.Index = index + 1;
      }
      this.LastIndex = index;
      index = context.Index;
    }
  }
} catch (e) {
  throw e;
}
```
