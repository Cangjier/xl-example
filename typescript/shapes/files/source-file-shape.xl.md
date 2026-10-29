# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BlockPossibleShape } from "../statements/block-possible-shape.xl.md"
import { StatementGuide } from "../statements/statement-guide.xl.md"
```

# namespace cangjie

# class SourceFileShape extends ShapeToken

## constructor:(template:Template)=>void

```ts
super(template);
this.ProcessQueue = Template.BasicBranchQueue();
this.SignIn(0);
this.CatalogGuide = StatementGuide.Create(null, [new BlockPossibleShape()]);
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
super.Process(context, buffer, index);
if (buffer.Start >= buffer.End) {
  this.CloseAtEnd(context);
}
```

## private method CloseAtEnd:(context:SyntaxContext)=>void

```ts
// EOF 这一格是零宽窗口：先把最深处那个还开着的 basic token 收口，让它的 possible 把最后一段形状补完。
let host: Token = this;
while (host.MountedUnit !== null) {
  host = host.MountedUnit;
}
const last = host.Last();
if (last !== null && !last.Closed) {
  last.TryToClose(context);
}
if (!this.Closed) {
  this.TryToClose(context);
}
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken);
this.Closed = true;
return CloseStates.Nothing;
```
