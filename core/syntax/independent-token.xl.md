# dependencies
```xl
import { CloseStates } from "./close-states.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

# class IndependentToken extends Token

## constructor:(template:Template)=>void

```ts
super(template);
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void
