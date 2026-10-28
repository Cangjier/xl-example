# dependencies
```xl
import { SourceRange } from "./source-range.xl.md"
```

# namespace cangjie

# type ValueGetter = (index:number)=>string

# type CountGetter = ()=>number

# class Document

## field GetValue:ValueGetter

## field GetCount:CountGetter

## field Parent:SourceRange | null = null

## field WholeRange:SourceRange | null = null

## constructor:(getValue:ValueGetter, getCount:CountGetter, Parent?:SourceRange | null)=>void

```ts
this.GetValue = getValue;
this.GetCount = getCount;
this.Parent = Parent ?? null;
```

## method GetRangeString:(range:SourceRange)=>string

```ts
return range.ToString();
```

## method GetRangeLines:(range:SourceRange)=>string

```ts
return range.ToString();
```

## method GetLine:(index:int)=>int

```ts
throw new Error("抽象成员未实现");
```

## method GetLineOffset:(index:int)=>int

```ts
throw new Error("抽象成员未实现");
```

## method GetLineInfo:(index:int)=>Array<int>

```ts
throw new Error("抽象成员未实现");
```

## method GetRaw:(start:int, end:int)=>string

```ts
throw new Error("抽象成员未实现");
```

## method GetScriptPath:()=>string

```ts
throw new Error("抽象成员未实现");
```
