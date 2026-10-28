# dependencies
```xl
import { CloseStates } from "./close-states.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

# class GuideToken extends Token

## constructor:(Template:Template)=>void

```ts
super(Template);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

## protected method Navigate:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
throw new Error("abstract member: Navigate");
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(context, buffer, index);
  if (context.Index > index) {
    this.LastIndex = index;
  }
  return;
}
const messageCount = context.Messages.length;
this.Navigate(context, buffer, index);
if (context.Index > index) {
  this.LastIndex = index;
  return;
}
if (context.Messages.length > messageCount) {
  return;
}
context.Index = index + 1;
this.LastIndex = index;
```
