# dependencies
```xl
import { SourceRange } from "../syntax/source-range.xl.md"
```

# namespace cangjie

运行时异常：执行层抛出的错，带出错位置与脚本调用轨迹。语法层不抛它，但 `Undo` / `Branch` 相关的错误处理会用到同一套位置信息。

# class RuntimeException<ValueType>

运行时异常。

原 C# 侧是 `public class RuntimeException<ValueType> : Exception`，六个构造器。按 M14(b) 保留参数最全的那个做构造器，其余五个转成静态工厂；按 M20，BCL 的 `Exception` 不进 `extends`，ts 侧用 `Message` / `InnerException` 两个字段承载基类信息。

## field Message:string = ""

异常信息。

## field InnerException:any = null

内层异常。

原 C# 侧由 `Exception.InnerException` 承载；xl 里 BCL 类型按 M20 记为 `any`。

## field SourceRange:SourceRange<ValueType>

出错的位置范围。原 C# 侧是只读属性 `SourceRange<ValueType> SourceRange { get; }`。

## field ScriptTrace:string = ""

脚本调用轨迹。原 C# 侧是只读属性 `string ScriptTrace { get; }`，取值就是位置范围所在的行。

## constructor:(sourceRange:SourceRange<ValueType>, message:string, innerException:any)=>void

带自定义信息与内层异常的构造。

原 C# 签名是 `RuntimeException(SourceRange<ValueType> sourceRange, string message, Exception? innerException)`，信息拼成 `$"{message}\r\n{sourceRange.GetRangLines()}"`。

```ts
this.Message = `${message}\r\n${sourceRange.GetRangLines()}`;
this.InnerException = innerException;
this.SourceRange = sourceRange;
this.ScriptTrace = sourceRange.GetRangLines();
```

## static method FromSourceRange:(sourceRange:SourceRange<any>)=>RuntimeException<any>

原 C# 构造器 `RuntimeException(SourceRange<ValueType> sourceRange)` 的替代：信息就是位置所在的行。

按 M27，泛型类的静态成员不能引用类的类型参数，所以这里用 `SourceRange<any>`。

```ts
const result = new RuntimeException<any>(sourceRange, "", null);
result.Message = sourceRange.GetRangLines();
return result;
```

## static method FromMessage:(sourceRange:SourceRange<any>, message:string)=>RuntimeException<any>

原 C# 构造器 `RuntimeException(SourceRange<ValueType> sourceRange, string message)` 的替代。

```ts
return new RuntimeException<any>(sourceRange, message, null);
```

## static method FromInner:(sourceRange:SourceRange<any>, innerException:any)=>RuntimeException<any>

原 C# 构造器 `RuntimeException(SourceRange<ValueType> sourceRange, Exception? innerException)` 的替代：信息以换行开头再接位置行，不带自定义文本。

```ts
const result = new RuntimeException<any>(sourceRange, "", innerException);
result.Message = `\r\n${sourceRange.GetRangLines()}`;
return result;
```

## static method FromRuntimeException:(innerException:RuntimeException<any>)=>RuntimeException<any>

原 C# 构造器 `RuntimeException(RuntimeException<ValueType> innerException)` 的替代：整份复制另一个运行时异常的信息与位置，并把它挂成内层异常。

```ts
const result = new RuntimeException<any>(innerException.SourceRange, "", innerException);
result.Message = innerException.Message;
result.ScriptTrace = innerException.ScriptTrace;
return result;
```

## static method Copy:(toCopy:RuntimeException<any>, isCopy:bool)=>RuntimeException<any>

原 C# 构造器 `RuntimeException(RuntimeException<ValueType> toCopy, bool isCopy)` 的替代。

`isCopy` 为真时内层异常取 `toCopy` 自己的内层异常，为假时内层异常就是 `toCopy` 本身。

```ts
const result = new RuntimeException<any>(toCopy.SourceRange, "", isCopy ? toCopy.InnerException : toCopy);
result.Message = toCopy.Message;
result.ScriptTrace = toCopy.ScriptTrace;
return result;
```
