# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# interface DirectSession

```txt
let x = 2*3+1   -> VariableStatementDirectSession(owner=shell)   -> Finish() -> VariableStatementShape
2*3+1           -> ExpressionStatementDirectSession(owner=shell) -> Finish() -> ExpressionStatementShape
```

## property Owner:Token | null

## property Declined:bool

## property Reason:string

## property Finished:bool

## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void

## method Finish:(endIndex:int, context:SyntaxContext)=>Token | null

## method Summary:()=>string
