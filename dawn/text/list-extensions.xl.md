# dependencies
```xl
import { Token } from "../../core/syntax/token.xl.md"
import { AreaAnnotation } from "./tokens/area-annotation.xl.md"
import { LineAnnotation } from "./tokens/line-annotation.xl.md"
import { WrapSymbol } from "./tokens/wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

token 列表专用工具：原 C# 的 `Dawn/Text/ListExtensions.cs`，一个 `static class`，四个挂在
`IList<Token<char>>` 上的扩展方法。

它们把「跳过软换行与注释」这一件事固定下来——**注释与软换行不该挡住相邻单元的判断**，
所以「上一个/下一个实义单元」的查找必须跨过 `WrapSymbol` / `AreaAnnotation` / `LineAnnotation`
这三种「透明」单元。这与 `TextCommonUtil` 里那组「只跳过 `WrapSymbol`」的函数是两套口径。

按 M11 落成**模块级 `# method`**：C# 的 `units.SkipNext(i)` 在 ts 里写成 `SkipNext(units, i)`。

这四个方法名与 `core/extensions/list-extension.xl.md` 里的同名函数**撞名**（那边是多一个判定器参数的通用版）。
为了不引入 import 别名，这里**直接实现循环**，不转调核心版——两边逻辑本来就只有判定器不同。

# method SkipNext:(units:Array<Token>, index:int)=>int

从 `index + 1` 起向后走，跳过所有软换行与注释，返回第一个**实义**单元的下标。

原 C# 是 `int SkipNext(this IList<Token<char>> self, int index)`，判定器固定为 `item is WrapSymbol || item is AreaAnnotation || item is LineAnnotation`。一路走到末尾也没遇到实义单元就返回 `units.Count`（越界值）。

```ts
let i = index + 1;
for (; i < units.length; i++) {
  const item = units[i];
  if (item instanceof WrapSymbol || item instanceof AreaAnnotation || item instanceof LineAnnotation) {
    continue;
  }
  break;
}
return i;
```

# method SkipPrevious:(units:Array<Token>, index:int)=>int

从 `index - 1` 起向前走，跳过所有软换行与注释，返回第一个**实义**单元的下标；一路走到开头返回 `-1`。

原 C# 是 `int SkipPrevious(this IList<Token<char>> self, int index)`。

```ts
let i = index - 1;
for (; i >= 0; i--) {
  const item = units[i];
  if (item instanceof WrapSymbol || item instanceof AreaAnnotation || item instanceof LineAnnotation) {
    continue;
  }
  break;
}
return i;
```

# method FindNext:(units:Array<Token>, index:int)=>int

与 `SkipNext` 同款查找，但**找不到时返回 `-1`**（而不是越界的 `units.Count`）。

原 C# 是 `int FindNext(this IList<Token<char>> self, int index)`。

```ts
let i = index + 1;
for (; i < units.length; i++) {
  const item = units[i];
  if (item instanceof WrapSymbol || item instanceof AreaAnnotation || item instanceof LineAnnotation) {
    continue;
  }
  return i;
}
return -1;
```

# method FindPrevious:(units:Array<Token>, index:int)=>int

与 `SkipPrevious` 同款查找，但找不到时返回 `-1`（与 `SkipPrevious` 一致，因为向前走到头本来就是 `-1`）。

原 C# 是 `int FindPrevious(this IList<Token<char>> self, int index)`。

```ts
let i = index - 1;
for (; i >= 0; i--) {
  const item = units[i];
  if (item instanceof WrapSymbol || item instanceof AreaAnnotation || item instanceof LineAnnotation) {
    continue;
  }
  return i;
}
return -1;
```
