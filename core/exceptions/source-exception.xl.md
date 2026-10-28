# namespace cangjie

# class SourceException

## field Message:string = ""

## constructor:(Msg:string)=>void

```ts
this.Message = Msg;
```

## static readonly field SourceRangeContainsNull:SourceException = new SourceException("SourceRange is not set: SourceRange.Start < 0 || SourceRange.End < 0")

## static readonly field SourceRangeStartIsNull:SourceException = new SourceException("SourceRange.Start < 0 (Start is not set)")

## static readonly field SourceRangeStartIsSetted:SourceException = new SourceException("SourceRange.Start has already been set")

## static readonly field SourceRangeEndIsNull:SourceException = new SourceException("SourceRange.End < 0 (End is not set)")

## static readonly field SourceRangeEndIsSetted:SourceException = new SourceException("SourceRange.End has already been set")

## static readonly field SourceRangeIndexOutOfRange:SourceException = new SourceException("index is out of range: SourceRange.Start <= index < SourceRange.End is required")
