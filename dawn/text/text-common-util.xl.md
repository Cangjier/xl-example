# dependencies
```xl
import { Token } from "../../core/syntax/token.xl.md"
import { GetSkipNext, GetSkipPrevious, SkipNext, SkipPrevious } from "../../core/extensions/list-extension.xl.md"
import { StatementReorganization2, StatementReorganization3 } from "./tokens/statement.xl.md"
import { WrapSymbol, WrapSymbolReorganization } from "./tokens/wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

文本层专用工具：原 C# 的 `Dawn/Text/TextCommonUtil.cs`，一个 `static class`，里面是挂在
`Token<char>` / `List<Token<char>>` 上的扩展方法。

按 M11，扩展方法落成**模块级 `# method`**，ts 侧就是模块级函数：
C# 的 `units.SkipPreviousWrapSymbol(i)` 在 ts 里写成 `SkipPreviousWrapSymbol(units, i)`。

这一组函数全是「跳过 `WrapSymbol`」的变体——软换行在语法结构里不该挡住相邻单元的判断，
所以「上一个 / 下一个**实义**单元」的查找必须跨过它们。

# method SkipNextWrapSymbol:(units:Array<Token<string>>, index:int)=>int

从 `index + 1` 起向后跳过所有 `WrapSymbol`，返回第一个非 `WrapSymbol` 的下标。

原 C# 是 `int SkipNextWrapSymbol(this List<Token<char>> units, int index)`，转调 `ListExtension.SkipNext` 并固定判定器为 `item is WrapSymbol`。

```ts
return SkipNext(units, index, (item) => item instanceof WrapSymbol);
```

# method SkipPreviousWrapSymbol:(units:Array<Token<string>>, index:int)=>int

从 `index - 1` 起向前跳过所有 `WrapSymbol`，返回第一个非 `WrapSymbol` 的下标；一路跳到底返回 `-1`。

原 C# 是 `int SkipPreviousWrapSymbol(this List<Token<char>> units, int index)`。

```ts
return SkipPrevious(units, index, (item) => item instanceof WrapSymbol);
```

# method GetSkipNextWrapSymbol:(units:Array<Token<string>>, index:int)=>Token<string> | null

`SkipNextWrapSymbol` 之后再取值；越界给 `null`。

原 C# 返回 `Token<char>?`。

```ts
return GetSkipNext(units, index, (item) => item instanceof WrapSymbol);
```

# method GetSkipPreviousWrapSymbol:(units:Array<Token<string>>, index:int)=>Token<string> | null

`SkipPreviousWrapSymbol` 之后再取值；越界给 `null`。

```ts
return GetSkipPrevious(units, index, (item) => item instanceof WrapSymbol);
```

# method InitialStatementReorganizationQueue:(unit:Token<string>)=>void

给一个单元装上报废语句用的重组队列。

原 C# 是 `void InitialStatementReorganizationQueue(this Token<char> unit)`，体里把默认的
重组队列取出来，并在其中**插入**两个语句重组类：

`unit.ReorganizationQueue = unit.Template.ReorganizationTemplate.Get(unit.GetType(), defaultValue => defaultValue?.InsertedBefore<WrapSymbol.Reorganization>(Statement.Reorganization2.Instance, Statement.Reorganization3.Instance))`

`InsertedBefore<T1>` 内部靠 `is T1` 找位置，而 ts 的泛型被擦除（M18），所以改用判定器版本
`InsertedBeforeWhere(items, predicate)`。注意 ts 版的参数顺序是**先元素、后判定器**（M22：函数类型参数必须在最后）。

`unit.GetType()` 按 M17 写成 `unit.constructor`。

```ts
unit.ReorganizationQueue = unit.Template.ReorganizationTemplate.Get(
  unit.constructor,
  (defaultValue: any) =>
    defaultValue == null
      ? null
      : defaultValue.InsertedBeforeWhere(
          [StatementReorganization2.Instance, StatementReorganization3.Instance],
          (item: any) => item instanceof WrapSymbolReorganization,
        ),
);
```
