# namespace cangjie

Cangjie 的异常族。`Core/Exceptions/` 是语法层与执行层共用的叶子模块。

# class SourceException

源于位置范围的错误。

xl 的 `extends` 只能指向规范内声明过的类型（`E1104`），BCL 的 `Exception` 不进 `extends`：ts 侧用 `Message` 字段承载基类那条信息。

这些异常实例写成静态只读字段，共享同一份实例；对象不可变，共享是安全的。

范围改成半开 `[Start, End)` 之后，「未设置」统一记作 `-1`（`Start < 0` / `End < 0`），异常名保持旧名，文本按新语义写清楚。

## field Message:string = ""

异常信息。

## constructor:(Msg:string)=>void

以信息创建。

```ts
this.Message = Msg;
```

## static readonly field SourceRangeContainsNull:SourceException = new SourceException("SourceRange is not set: SourceRange.Start < 0 || SourceRange.End < 0")

`SourceRange.Start < 0 || SourceRange.End < 0`（半开范围的两端都还没设过）。

## static readonly field SourceRangeStartIsNull:SourceException = new SourceException("SourceRange.Start < 0 (Start is not set)")

`SourceRange.Start` 未设置。

## static readonly field SourceRangeStartIsSetted:SourceException = new SourceException("SourceRange.Start has already been set")

`SourceRange.Start` 已被赋值，不允许再赋值。

## static readonly field SourceRangeEndIsNull:SourceException = new SourceException("SourceRange.End < 0 (End is not set)")

`SourceRange.End` 未设置。

## static readonly field SourceRangeEndIsSetted:SourceException = new SourceException("SourceRange.End has already been set")

`SourceRange.End` 已被赋值，不允许再赋值。

## static readonly field SourceRangeIndexOutOfRange:SourceException = new SourceException("index is out of range: SourceRange.Start <= index < SourceRange.End is required")

下标不在半开范围 `[Start, End)` 内：`SourceRange.At` 越界。
