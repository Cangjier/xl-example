# dependencies
```xl
import { Token } from "../token.xl.md"
```

# namespace cangjie

raw 回退的口袋：item 引擎判不出 / 建造器返回 `null` / 建造器抛错时，
把「这一段没建成 item」的事实记下来交给容器，由容器决定保留原始单元还是抛出。
本类**不建 AST**（INV-7：只有既有建造器能建）。

# class RawFallback

## field From:int = -1

回退区间起点（宿主 `Data` 下标，含）。

## field To:int = -1

回退区间终点（宿主 `Data` 下标，不含）。

## field Reason:string = ""

为什么要回退（`incomplete` / `classify-failed` / `build-null` / `build-throw`）。

## constructor:(from:int, to:int, reason:string)=>void

```ts
this.From = from;
this.To = to;
this.Reason = reason;
```

## method IsArmed:()=>bool

是否记下了一次回退。

```ts
return this.From >= 0 && this.To > this.From;
```

## method Reset:()=>void

清空口袋。

```ts
this.From = -1;
this.To = -1;
this.Reason = "";
```

## method Text:(host:Token)=>string

回退区间的原始文本（诊断与 raw item 建造用）。

```ts
const document = host.SourceRange.Document;
if (document === null || this.From < 0 || this.To <= this.From) {
  return "";
}
const first = host.Data[this.From];
if (first === undefined) {
  return "";
}
const last = host.Data[this.To - 1];
if (last === undefined) {
  return "";
}
return document.GetRaw(first.SourceRange.Start, last.SourceRange.End);
```
