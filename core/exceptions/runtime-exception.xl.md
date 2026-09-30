# dependencies
```xl
import { SourceRange } from "../syntax/source-range.xl.md"
```

# namespace cangjie

运行时异常：执行层抛出的错，带出错位置与脚本调用轨迹。语法层不抛它，但 `Undo` / `Branch` 相关的错误处理会用到同一套位置信息。

# class RuntimeException

运行时异常。

xl 规定一个类至多一个构造器（`E1206`），因此保留参数最全的那个做构造器，其余五个转成静态工厂。BCL 的 `Exception` 不进 `extends`，ts 侧用 `Message` / `InnerException` 两个字段承载基类信息。

## field Message:string = ""

异常信息。

## field InnerException:any = null

内层异常。

BCL 类型不进规范，这里记为 `any`。

## field SourceRange:SourceRange

出错的位置范围。

## field ScriptTrace:string = ""

脚本调用轨迹，取值就是位置范围所在的行。

## constructor:(sourceRange:SourceRange, message:string, innerException:any)=>void

带自定义信息与内层异常的构造。

信息拼成 `$"{message}\r\n{sourceRange.GetRangLines()}"`。

```ts
this.Message = `${message}\r\n${sourceRange.GetRangLines()}`;
this.InnerException = innerException;
this.SourceRange = sourceRange;
this.ScriptTrace = sourceRange.GetRangLines();
```

## static method FromSourceRange:(sourceRange:SourceRange)=>RuntimeException

以位置创建，信息就是位置所在的行。

```ts
const result = new RuntimeException(sourceRange, "", null);
result.Message = sourceRange.GetRangLines();
return result;
```

## static method FromMessage:(sourceRange:SourceRange, message:string)=>RuntimeException

以自定义文本作为异常信息。

```ts
return new RuntimeException(sourceRange, message, null);
```

## static method FromInner:(sourceRange:SourceRange, innerException:any)=>RuntimeException

信息以换行开头再接位置行，不带自定义文本。

```ts
const result = new RuntimeException(sourceRange, "", innerException);
result.Message = `\r\n${sourceRange.GetRangLines()}`;
return result;
```

## static method FromRuntimeException:(innerException:RuntimeException)=>RuntimeException

整份复制另一个运行时异常的信息与位置，并把它挂成内层异常。

```ts
const result = new RuntimeException(innerException.SourceRange, "", innerException);
result.Message = innerException.Message;
result.ScriptTrace = innerException.ScriptTrace;
return result;
```

## static method Copy:(toCopy:RuntimeException, isCopy:bool)=>RuntimeException

`isCopy` 为真时内层异常取 `toCopy` 自己的内层异常，为假时内层异常就是 `toCopy` 本身。

```ts
const result = new RuntimeException(toCopy.SourceRange, "", isCopy ? toCopy.InnerException : toCopy);
result.Message = toCopy.Message;
result.ScriptTrace = toCopy.ScriptTrace;
return result;
```
