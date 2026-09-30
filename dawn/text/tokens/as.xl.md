# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Common } from "./common.xl.md"
import { Statement } from "./statement.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型转换 `as`：把 `expr as Type` 整段收成一个 `As` 单元。触发点是内容恰好为 `as` 的 `Common`。

`AsReorganization` 写在 `As` 之前：它的 `Instance` 静态字段在类定义时立即求值，
而 `Root` 的重组队列会直接引用 `AsReorganization.Instance`。

# class AsReorganization extends Reorganization

它比其他重组类简单：`Previous` 只认「内容为 `as` 的 `Common`」；`Process` 从 `as` 之后一路收到**语句边界或 `,`**，
把收到的单元装进新的 `As`，再把原来那一段整体换掉。

## static readonly field Instance:AsReorganization = new AsReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个 `as` 关键字块。

`Get` 越界给 `null`，`instanceof` 对 `null` 不成立，所以写成两段判定。

```ts
const current = Get(units, index);
return current instanceof Common && current.TempToString() === "as";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `as` 及其后的类型表达式收成一个 `As`，**返回新的下标**（不靠入参回写）。要点：

- 从 `index + 1` 往后扫，遇到 `Statement.IsStatementEnd(units, i, ",")` 就停在 `i - 1`；
  一直没遇到（`endIndex == -1`）就收到列表末尾。
- **`items` 只装 `as` 之后的单元**，不含 `as` 本身。
- 父单元取 `current.Parent`；批量加子单元用 `AddRange`。
- 范围两头直接取 `current.SourceRange.Start!` 与 `items` 末项的 `SourceRange.End!`：
  `Start` / `End` 本身就是 `Source | null`，**不要再取 `.Value`**，否则会把字符塞进范围字段。
- 最后整体替换用四参数的 `ReplaceCountAt`（三个参数的版本才叫 `ReplaceAt`），
  返回值即新下标；取末项写成 `items[items.length - 1]`。

先 `new` 出单元，再赋 `Parent`。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const items: Token[] = [];
let endIndex = -1;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("item 为空");
  }
  if (Statement.IsStatementEnd(units, i, [","])) {
    endIndex = i - 1;
    break;
  }
  items.push(item);
}
if (endIndex === -1) {
  endIndex = units.length - 1;
}
const result = new As(template);
result.Parent = current.Parent;
result.AddRange(items);
result.SignIn(current.SourceRange.Start!);
result.SignOut(items[items.length - 1].SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class As extends IndependentToken

类型转换 `as` 表达式。

单元值类型是单字符的 `string`。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token` 产出：`<As>子单元的 XML 串接</As>`（标签名即运行时类名）。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；
批量加入用 `AddRange`。

```ts
const result = new As(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
