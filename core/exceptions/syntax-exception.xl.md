# dependencies
```xl
import { SourceRange } from "../syntax/source-range.xl.md"
```

# namespace cangjie

# class SyntaxException

## field Message:string = ""

## field InnerException:unknown = null

## constructor:(sourceRange:SourceRange, message:string, innerException:any, callerLineNumber?:int)=>void

```ts
const head = message.length > 0 ? `${message} ---> \r\n` : "";
this.Message = head + sourceRange.GetRangLines();
this.InnerException = innerException;
```

## static method FromSourceRange:(sourceRange:SourceRange, callerLineNumber?:int)=>SyntaxException

```ts
const result = new SyntaxException(sourceRange, "", null, callerLineNumber ?? 0);
result.Message = sourceRange.GetRangLines();
return result;
```

## static method FromMessage:(sourceRange:SourceRange, message:string, callerLineNumber?:int)=>SyntaxException

```ts
const result = new SyntaxException(sourceRange, message, null, callerLineNumber ?? 0);
return result;
```

## static method FromInner:(sourceRange:SourceRange, innerException:any, callerLineNumber?:int)=>SyntaxException

```ts
const result = new SyntaxException(sourceRange, "", innerException, callerLineNumber ?? 0);
result.Message = sourceRange.GetRangLines();
return result;
```
