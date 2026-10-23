# dependencies
```xl
import { Token } from "../token.xl.md"
```

# namespace cangjie

shell handoff（批内 token 交接）：批次里剩下的 token 全部属于新壳前缀时，
把它们交给新壳重放。递归深度上限 8，超限抛 `SyntaxException`（真缺陷，不静默）。

# class HandoffRequest

## field Shell:Token | null = null

接收 token 的新壳；`null` 表示当前没有交接请求。

## field Depth:int = 0

当前交接已经递归了几层。

## field From:int = -1

交接区间起点（宿主 `Data` 下标，含）。

## field To:int = -1

交接区间终点（宿主 `Data` 下标，不含）。

## static field MaxDepth:int = 8

递归深度上限（U3 裁决：保留 8，WP-6 专项用例覆盖）。

## method Reset:()=>void

清空请求。

```ts
this.Shell = null;
this.Depth = 0;
this.From = -1;
this.To = -1;
```

## method Begin:(shell:Token, from:int, to:int)=>bool

登记一次交接；深度超限返回 `false`（调用方负责抛 `SyntaxException`）。

```ts
this.Shell = shell;
this.From = from;
this.To = to;
this.Depth = this.Depth + 1;
return this.Depth <= HandoffRequest.MaxDepth;
```

## method IsActive:()=>bool

是否有活动交接。

```ts
return this.Shell !== null;
```
