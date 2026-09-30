# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBack, TakeRange } from "../../../core/extensions/list-extension.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

空条件运算符 `?.`：把「`?.` 之后到下一个运算符为止」的一段收成一个单元。

构造时从模板取自己的重组队列。

`NullConditionalOperatorReorganization` 写在 `NullConditionalOperator` 之前。

# class NullConditionalOperatorReorganization extends Reorganization

`Previous` 只认内容恰好是 `?.` 的 `Symbol`。

## static readonly field Instance:NullConditionalOperatorReorganization = new NullConditionalOperatorReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `?.`。

```ts
const current = Get(units, index);
return current instanceof Symbol && current.Is("?.");
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

从 `?.` 之后一路收集到下一个「断点」，收成一个单元，**返回新的下标**。

要点：

- 断点由 `SearchBack` 从 `index + 1` 往后找：`?.`、`??`、`&&`、`||`、`;`、`,`，或任何**比较符号**。
- 找不到断点（返回 `-1`）时，`count` 取「剩下全部」；否则取 `endIndex - index - 1`。
- 取区间用 `TakeRange(units, index + 1, count)`（取出不移除），随后靠 `ReplaceCountAt` 一次性替换。
- 签出时：收到东西就签到最后一个子单元，一个都没收到就签回 `?.` 自己。

```ts
const current = Get(units, index);
if (!(current instanceof Symbol)) {
  throw new Error("current 为空");
}
const endIndex = SearchBack(units, index + 1, (item) => {
  if (item instanceof Symbol) {
    if (item.Is("?.")) {
      return true;
    }
    if (item.Is("??")) {
      return true;
    }
    if (item.Is("&&")) {
      return true;
    }
    if (item.Is("||")) {
      return true;
    }
    if (item.Is(";")) {
      return true;
    }
    if (item.Is(",")) {
      return true;
    }
    if (template.SymbolTemplate.IsCompareSymbol(item.TempToString())) {
      return true;
    }
    return false;
  }
  return false;
});
const result = new NullConditionalOperator(template);
result.SignInToken(current);
const count = endIndex === -1 ? units.length - index - 1 : endIndex - index - 1;
result.AddRange(TakeRange(units, index + 1, count));
const nextIndex = ReplaceCountAt(units, index, count + 1, result);
if (result.Data.length === 0) {
  result.SignOutToken(current);
} else {
  result.SignOutToken(result.Data[result.Data.length - 1]);
}
result.TryToClose();
return nextIndex;
```

# class NullConditionalOperator extends IndependentToken

空条件运算符单元。

## constructor:(template:Template)=>void

构造器里取本类型的重组队列；运行时类型用 `this.constructor`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new NullConditionalOperator(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
