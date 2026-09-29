# dependencies
```xl
import { SourceRange } from "../syntax/source-range.xl.md"
```

# namespace cangjie

语义解析异常：语法层里任何一步抛错都会被包成它，并带上出错的位置范围。

# class SyntaxException

语义解析异常。

原 C# 侧是 `public class SyntaxException<ValueType> : Exception`，四个构造器。按 M14(b) 保留参数最全的那个做构造器，其余三个转成静态工厂；按 M20，BCL 的 `Exception` 不进 `extends`，ts 侧用 `Message` / `InnerException` 两个字段承载基类信息。

原 C# 的四个构造器都有一个 `[CallerLineNumber] int callerLineNumber = 0` 参数，由编译器自动填充调用点行号；按 M24，ts 里它退化成普通的可选参数，调用点不传，因此产物里的行号恒为 `0`。

## field Message:string = ""

异常信息，构造时就拼好。

## field InnerException:any = null

内层异常。

原 C# 侧由 `Exception.InnerException` 承载；xl 里 BCL 类型按 M20 记为 `any`。

## constructor:(sourceRange:SourceRange, message:string, innerException:any, callerLineNumber?:int)=>void

带自定义信息的构造。

原 C# 签名是 `SyntaxException(SourceRange<ValueType> sourceRange, string message, Exception innerException, [CallerLineNumber] int callerLineNumber = 0)`，信息拼成 `$"throw by line {callerLineNumber}, {message} ---> \r\n{sourceRange.GetRangLines()}"`。

```ts
this.Message = `throw by line ${callerLineNumber ?? 0}, ${message} ---> \r\n${sourceRange.GetRangLines()}`;
this.InnerException = innerException;
```

## static method FromSourceRange:(sourceRange:SourceRange, callerLineNumber?:int)=>SyntaxException

原 C# 构造器 `SyntaxException(SourceRange<ValueType> sourceRange, [CallerLineNumber] int callerLineNumber = 0)` 的替代：信息就是位置所在的行。

```ts
const result = new SyntaxException(sourceRange, "", null, callerLineNumber ?? 0);
result.Message = `throw by line ${callerLineNumber ?? 0} ---> \r\n${sourceRange.GetRangLines()}`;
return result;
```

## static method FromMessage:(sourceRange:SourceRange, message:string, callerLineNumber?:int)=>SyntaxException

原 C# 构造器 `SyntaxException(SourceRange<ValueType> sourceRange, string message, [CallerLineNumber] int callerLineNumber = 0)` 的替代：信息里带自定义文本。

```ts
const result = new SyntaxException(sourceRange, message, null, callerLineNumber ?? 0);
return result;
```

## static method FromInner:(sourceRange:SourceRange, innerException:any, callerLineNumber?:int)=>SyntaxException

原 C# 构造器 `SyntaxException(SourceRange<ValueType> sourceRange, Exception innerException, [CallerLineNumber] int callerLineNumber = 0)` 的替代：不额外加信息，只挂内层异常。

```ts
const result = new SyntaxException(sourceRange, "", innerException, callerLineNumber ?? 0);
result.Message = `throw by line ${callerLineNumber ?? 0} ---> \r\n${sourceRange.GetRangLines()}`;
return result;
```
