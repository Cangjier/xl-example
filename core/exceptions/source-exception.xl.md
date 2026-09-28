# namespace cangjie

Cangjie 的异常族。`Core/Exceptions/` 是语法层与执行层共用的叶子模块。

# class SourceException

源于位置的错误。

原 C# 侧是 `public class SourceException : Exception`。xl 的 `extends` 只能指向规范内声明过的类型（`E1104`），BCL 的 `Exception` 不进 `extends`（M20）：ts 侧用 `Message` 字段承载基类那条信息，正文负责记录 C# 侧的基类关系。

原 C# 的 5 个静态属性每次访问都 `new` 一个实例；ts 侧写成 5 个静态只读字段，共享同一份实例。这些对象不可变，行为等价。

## field Message:string = ""

异常信息。

## constructor:(Msg:string)=>void

以信息创建。

原 C# 签名是 `SourceException(string Msg) : base(Msg)`。

```ts
this.Message = Msg;
```

## static readonly field SourceRangeContainsNull:SourceException = new SourceException("SourceRange.Start == null || SourceRange.End == null")

`SourceRange.Start == null || SourceRange.End == null`。

## static readonly field SourceRangeStartIsNull:SourceException = new SourceException("SourceRange.Start == null")

`SourceRange.Start == null`。

## static readonly field SourceRangeStartIsSetted:SourceException = new SourceException("SourceRange.Start has been setted")

`SourceRange.Start` 已被赋值，不允许再赋值。

## static readonly field SourceRangeEndIsNull:SourceException = new SourceException("SourceRange.End == null")

`SourceRange.End == null`。

## static readonly field SourceRangeEndIsSetted:SourceException = new SourceException("SourceRange.End has been setted")

`SourceRange.End` 已被赋值，不允许再赋值。
