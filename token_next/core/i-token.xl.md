# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Template } from "./template.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

# interface IToken

## field Template:Template

## field Parent:Token | null

## field Data:Array<Token>

## field MountedUnit:Token | null

## field Closed:bool

## field Start:Source | null

## field End:Source | null

## method Add:(item:Token)=>Token

## method AddRange:(items:Array<Token>)=>void

## method AddToMounted:(item:Token)=>Token

## method Quit:()=>void

## method Mount:(item:Token)=>Token

## method RemoveSelf:()=>void

## method MoveDataTo:(target:Token)=>void

## method SignIn:(source:Source)=>void

## method SignOut:(source:Source)=>void

## method TryToClose:(context:SyntaxContext, source:Source)=>void

## method Process:(context:SyntaxContext, source:Source)=>bool

## method ToXmlString:()=>string
