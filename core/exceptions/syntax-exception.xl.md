# dependencies
```xl
import { SourceRange } from "../syntax/source-range.xl.md"
```

# namespace cangjie

语义解析异常：语法层里任何一步抛错都会被包成它，并带上出错的位置范围。

# class SyntaxException

语义解析异常。

xl 规定一个类至多一个构造器（`E1206`），因此保留参数最全的那个做构造器，其余三个转成静态工厂。BCL 的 `Exception` 不进 `extends`，ts 侧用 `Message` / `InnerException` 两个字段承载基类信息。

`callerLineNumber` 是历史调用点参数，保留签名兼容；调用点不传，产物里的行号恒为 `0`，因此不再写进 `Message`（属于无效信息）。

## field Message:string = ""

异常信息，构造时就拼好。

## field InnerException:unknown = null

内层异常。

BCL 类型不进规范，这里记为 `unknown`：写的这一侧接受任何抛出物（`catch` 拿到的本来就是 `unknown`），读的一侧必须先显式收窄 / 转型——这正是 `unknown` 与 `any` 的分界。

## constructor:(sourceRange:SourceRange, message:string, innerException:any, callerLineNumber?:int)=>void

带自定义信息的构造。

信息拼成 `$"{message} ---> \r\n{sourceRange.GetRangLines()}"`；`message` 为空时只保留位置行，不再拼接 `throw by line 0`。

```ts
const head = message.length > 0 ? `${message} ---> \r\n` : "";
this.Message = head + sourceRange.GetRangLines();
this.InnerException = innerException;
```

## static method FromSourceRange:(sourceRange:SourceRange, callerLineNumber?:int)=>SyntaxException

以位置创建，信息就是位置所在的行。

```ts
const result = new SyntaxException(sourceRange, "", null, callerLineNumber ?? 0);
result.Message = sourceRange.GetRangLines();
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
result.Message = sourceRange.GetRangLines();
return result;
```
