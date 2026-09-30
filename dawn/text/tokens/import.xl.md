# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Common } from "./common.xl.md"
import { Symbol } from "./symbol.xl.md"
import { ConstString } from "./string/const-string.xl.md"
import { String } from "./string/string.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

导入语句：把 `import { … } from "…"` 整段收成一个 `Import` 单元。

`Import` 与 `String.String` 的 `From` 是加载依赖文件的入口：调用方从 `textContext.Root.Data` 里筛出 `Import` 单元即可。

`ImportReorganization` 写在 `Import` 之前。

# class ImportReorganization extends Reorganization

`Previous` 认的是「一个内容恰好等于 `import` 的 `Common`」——不是一个关键字 token，而是普通字符块。

## static readonly field Instance:ImportReorganization = new ImportReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `import` 这个词。

```ts
const current = Get(units, index);
return current instanceof Common && current.TempToString() === "import";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

从 `import` 开始往后收集单元，直到遇到 `;` 或软换行，收成一个 `Import`，**返回新的下标**。

要点：

- 遇到 `;`（`Symbol.Is(";")`）或 `WrapSymbol` 就停，结束下标记成 `i - 1`（**不含**这个终止符）。
- `from` 的取法有两路：先找内容为 `from` 的 `Common`，取它**之后**那段里的第一个 `String`；找不到 `from` 就退回到整段里的第一个 `String`。
- 从 `String` 的子单元里取第一个 `ConstString`，把它的文本当作 `From`。找不到匹配项就抛异常（不能用 `find` 的 `undefined` 蒙混过去）。
- 最后批量替换用 `ReplaceCountAt`，返回的 `index` 成为新下标。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const items: Token[] = [];
let endIndex = index;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("item 为空");
  }
  if ((item instanceof Symbol && item.Is(";")) || item instanceof WrapSymbol) {
    endIndex = i - 1;
    break;
  }
  items.push(item);
}
const result = new Import(template);
result.Parent = current.Parent;
const fromIndex = items.findIndex((item) => item instanceof Common && item.Is("from"));
if (fromIndex !== -1) {
  const fromUnits = items.slice(fromIndex + 1, items.length);
  const stringUnit = fromUnits.find((item) => item instanceof String);
  if (stringUnit instanceof String) {
    const constString = stringUnit.Data.find((item) => item instanceof ConstString);
    if (constString === undefined) {
      throw new Error("找不到匹配的子单元");
    }
    result.From = constString.TempToString();
  }
} else {
  const firstString = items.find((item) => item instanceof String);
  if (firstString instanceof String) {
    const constString = firstString.Data.find((item) => item instanceof ConstString);
    if (constString === undefined) {
      throw new Error("找不到匹配的子单元");
    }
    result.From = constString.TempToString();
  }
}
result.AddRange(items);
result.SignIn(current.SourceRange.Start!);
result.SignOut(items[items.length - 1].SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class Import extends IndependentToken

导入语句。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## field From:string | null = null

被导入的路径。

加载依赖文件时用它；为空表示这条导入没有可解析的目标。

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new Import(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
