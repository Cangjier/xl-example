# dependencies
```xl
import { Token } from "../../core/syntax/token.xl.md"
import { GetSkipNext, GetSkipPrevious, SkipNext, SkipPrevious } from "../../core/extensions/list-extension.xl.md"
import { WrapSymbol } from "./tokens/wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

文本层专用工具：一组模块级函数，作用于 `Token` / `Array<Token>`。

扩展方法落成**模块级 `# method`**，ts 侧就是模块级函数：
调用形式是 `SkipPreviousWrapSymbol(units, i)`，列表本身作为第一个参数。

这一组函数全是「跳过 `WrapSymbol`」的变体——软换行在语法结构里不该挡住相邻单元的判断，
所以「上一个 / 下一个**实义**单元」的查找必须跨过它们。

原先这里还有一个 `InitialStatementReorganizationQueue`（给单元装报废语句用的重组队列）。
它读的是 `ReorganizationTemplate.DefaultValue`，也就是**通用重组队列**，属于解析优先级契约的一部分，
已经搬到 `./parse-pipeline.xl.md`，与 `GeneralReorganize` 放在一起。

# method SkipNextWrapSymbol:(units:Array<Token>, index:int)=>int

从 `index + 1` 起向后跳过所有 `WrapSymbol`，返回第一个非 `WrapSymbol` 的下标。

转调 `SkipNext` 并固定判定器为 `item is WrapSymbol`。

```ts
return SkipNext(units, index, (item) => item instanceof WrapSymbol);
```

# method SkipPreviousWrapSymbol:(units:Array<Token>, index:int)=>int

从 `index - 1` 起向前跳过所有 `WrapSymbol`，返回第一个非 `WrapSymbol` 的下标；一路跳到底返回 `-1`。

```ts
return SkipPrevious(units, index, (item) => item instanceof WrapSymbol);
```

# method GetSkipNextWrapSymbol:(units:Array<Token>, index:int)=>Token | null

`SkipNextWrapSymbol` 之后再取值；越界给 `null`。

```ts
return GetSkipNext(units, index, (item) => item instanceof WrapSymbol);
```

# method GetSkipPreviousWrapSymbol:(units:Array<Token>, index:int)=>Token | null

`SkipPreviousWrapSymbol` 之后再取值；越界给 `null`。

```ts
return GetSkipPrevious(units, index, (item) => item instanceof WrapSymbol);
```
