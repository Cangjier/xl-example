# dependencies
```xl
import { Token } from "../core/syntax/token.xl.md"
import { AreaAnnotation } from "./tokens/area-annotation.xl.md"
import { LineAnnotation } from "./tokens/line-annotation.xl.md"
import { LineWrap } from "./tokens/line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

token 列表专用工具：四个模块级函数，作用于 `Array<Token>`。

它们把「跳过软换行与注释」这一件事固定下来——**注释与软换行不该挡住相邻单元的判断**，
所以「上一个/下一个实义单元」的查找必须跨过 `LineWrap` / `AreaAnnotation` / `LineAnnotation`
这三种「透明」单元。这与 `TextCommonUtil` 里那组「只跳过 `LineWrap`」的函数是两套口径。

按**模块级 `# method`** 落成：调用形式是 `SkipNext(units, i)`，列表本身作为第一个参数。

这四个方法名与 `core/extensions/list-extension.xl.md` 里的同名函数**撞名**（那边是多一个判定器参数的通用版）。
为了不引入 import 别名，这里**直接实现循环**，不转调核心版——两边逻辑本来就只有判定器不同。

# method SkipNext:(units:Array<Token>, index:int)=>int

从 `index + 1` 起向后走，跳过所有软换行与注释，返回第一个**实义**单元的下标。

判定器固定为 `item is LineWrap || item is AreaAnnotation || item is LineAnnotation`。一路走到末尾也没遇到实义单元就返回 `units.Count`（越界值）。

```ts
let i = index + 1;
for (; i < units.length; i++) {
  const item = units[i];
  if (item instanceof LineWrap || item instanceof AreaAnnotation || item instanceof LineAnnotation) {
    continue;
  }
  break;
}
return i;
```

# method SkipPrevious:(units:Array<Token>, index:int)=>int

从 `index - 1` 起向前走，跳过所有软换行与注释，返回第一个**实义**单元的下标；一路走到开头返回 `-1`。

```ts
let i = index - 1;
for (; i >= 0; i--) {
  const item = units[i];
  if (item instanceof LineWrap || item instanceof AreaAnnotation || item instanceof LineAnnotation) {
    continue;
  }
  break;
}
return i;
```

# method FindNext:(units:Array<Token>, index:int)=>int

与 `SkipNext` 同款查找，但**找不到时返回 `-1`**（而不是越界的 `units.Count`）。

```ts
let i = index + 1;
for (; i < units.length; i++) {
  const item = units[i];
  if (item instanceof LineWrap || item instanceof AreaAnnotation || item instanceof LineAnnotation) {
    continue;
  }
  return i;
}
return -1;
```

# method FindPrevious:(units:Array<Token>, index:int)=>int

与 `SkipPrevious` 同款查找，但找不到时返回 `-1`（与 `SkipPrevious` 一致，因为向前走到头本来就是 `-1`）。

```ts
let i = index - 1;
for (; i >= 0; i--) {
  const item = units[i];
  if (item instanceof LineWrap || item instanceof AreaAnnotation || item instanceof LineAnnotation) {
    continue;
  }
  return i;
}
return -1;
```

# method RemoveItem:(units:Array<Token>, item:Token)=>void

按**对象身份**把一个单元从列表里摘掉；不在列表里就什么都不做。

为什么不用下标：收尾规则一边改列表一边还要按「原来扫描到的下标区间」清理，
而下标在 `splice` 之后就不再指同一个单元了。按身份找（`indexOf` + `splice`）对
「把吃掉的单元逐个摘干净」这件事是稳定的——这也是 `ImportCloseRule.Process` 需要它的原因
（见 `tokens/import.xl.md`：那里若只按「连续 count 格」清理，
`import` 与 `from` 之间的软换行会让清理范围算错，产物里就会多出一份重复内容）。

```ts
const found = units.indexOf(item);
if (found !== -1) {
  units.splice(found, 1);
}
```
