# dependencies
```xl
import { SourceRange } from "../syntax/source-range.xl.md"
```

# namespace cangjie

语义解析异常：语法层里任何一步抛错都会被包成它，并带上出错的位置范围。

# class SyntaxException

语义解析异常。

xl 规定一个类至多一个构造器（`E1206`），因此保留参数最全的那个做构造器，其余三个转成静态工厂。BCL 的 `Exception` 不进 `extends`，ts 侧用 `Message` / `InnerException` 两个字段承载基类信息。

`callerLineNumber` 表示调用点行号，写成可选的普通参数；调用点不传，因此产物里的行号恒为 `0`。

## field Message:string = ""

异常信息，构造时就拼好。

## field InnerException:any = null

内层异常。

BCL 类型不进规范，这里记为 `any`。

## constructor:(sourceRange:SourceRange, message:string, innerException:any, callerLineNumber?:int)=>void

带自定义信息的构造。

信息拼成 `$"throw by line {callerLineNumber}, {message} ---> \r\n{sourceRange.GetRangLines()}"`。

```ts
this.Message = `throw by line ${callerLineNumber ?? 0}, ${message} ---> \r\n${sourceRange.GetRangLines()}`;
this.InnerException = innerException;
```

## static method FromSourceRange:(sourceRange:SourceRange, callerLineNumber?:int)=>SyntaxException

以位置创建，信息就是位置所在的行。

```ts
const result = new SyntaxException(sourceRange, "", null, callerLineNumber ?? 0);
result.Message = `throw by line ${callerLineNumber ?? 0} ---> \r\n${sourceRange.GetRangLines()}`;
return result;
```

## static method FromMessage:(sourceRange:SourceRange, message:string, callerLineNumber?:int)=>SyntaxException

信息里带自定义文本。

```ts
const result = new SyntaxException(sourceRange, message, null, callerLineNumber ?? 0);
return result;
```

## static method FromInner:(sourceRange:SourceRange, innerException:any, callerLineNumber?:int)=>SyntaxException

不额外加信息，只挂内层异常。

```ts
const result = new SyntaxException(sourceRange, "", innerException, callerLineNumber ?? 0);
result.Message = `throw by line ${callerLineNumber ?? 0} ---> \r\n${sourceRange.GetRangLines()}`;
return result;
```
