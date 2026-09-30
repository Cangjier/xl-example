# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Statement } from "./statement.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型转换 `as`：把 `expr as Type` 整段收成一个 `As` 单元。触发点是内容恰好为 `as` 的 `Identifier`。

`AsReorganization` 写在 `As` 之前：它的 `Instance` 静态字段在类定义时立即求值，
而 `Root` 的重组队列会直接引用 `AsReorganization.Instance`。

# class AsReorganization extends Reorganization

它比其他重组类简单：`Previous` 只认「内容为 `as` 的 `Identifier`」；`Process` 从 `as` 之后一路收到**语句边界或 `,`**，
把收到的单元装进新的 `As`，再把原来那一段整体换掉。

## static readonly field Instance:AsReorganization = new AsReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个 `as` 关键字块。

`Get` 越界给 `null`，`instanceof` 对 `null` 不成立，所以写成两段判定。

```ts
const current = Get(units, index);
return current instanceof Identifier && current.TempToString() === "as";
```

## private method IsTypeContinuationAhead:(units:Array<Token>, index:int)=>bool

`index` 处那个**软换行**后面跟的是不是「类型还没写完」的续接符（`|` / `&` / `.` / `<` / `[` / `(` / `=>`）。

`as` 后面的类型可以折行排版（`x as\n  | A\n  | B`），那些换行是版面而不是语句边界。

```ts
const next = GetSkipNextWrapSymbol(units, index);
if (!(next instanceof SymbolToken)) {
  return false;
}
return (
  next.Is("|") ||
  next.Is("&") ||
  next.Is(".") ||
  next.Is("<") ||
  next.Is("[") ||
  next.Is("(") ||
  next.Is("=>") ||
  next.Is("->")
);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `as` 及其后的类型表达式收成一个 `As`，**返回新的下标**（不靠入参回写）。要点：

- **`as` 后面必须有一个类型**，所以还没收到任何实义单元时**不许收工**：
  `const v = x as` 换行 `A;` 是常见排版，可 `Statement.IsStatementEnd` 会把那个换行
  判成语句边界（它看的是换行**两侧**的单元，而 `as` 是 `Identifier`、不算「语句内部」），
  于是 `items` 为空、`items[items.length - 1]` 取到 `undefined`，下一句读 `.SourceRange` 抛**裸 `TypeError`**。
  实测 `const v = x as\n  A;` 就是这个形状（真实代码里 `as` 换行很常见）。
- **软换行不进 `items`**：它们只是排版。原来换行会被塞进 `As` 的 `Data`，
  而 `As` 是独立单元、**没有自己的重组队列**（`IndependentToken` 不装队列），
  那个换行于是以 `<LineWrap />` 的形式漏进产物（实测 `const v = x as A |\n B;`）。
- 换行处要不要收工，沿用 `Statement.IsStatementEnd`，但**类型续接符之后一律不算**。
- 终止符是 `;` / `,` / 赋值符号；`?` 与 `:` **也终止**——`x as A ? b : c` 在 TypeScript 里
  解析成 `(x as A) ? b : c`（实测 AST 是 `ConditionalExpression(AsExpression(…))`）。
  例外是**条件类型**：见过顶层的 `extends` 之后，`?` / `:` 属于类型
  （`x as A extends B ? C : D` 的 AST 是 `AsExpression(ConditionalType)`）。
- 收集为空时什么都不做、返回原下标。
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
let sawExtends = false;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("item 为空");
  }
  if (item instanceof LineWrap) {
    if (items.length > 0 && this.IsTypeContinuationAhead(units, i) === false && Statement.IsStatementEnd(units, i, [","])) {
      endIndex = i - 1;
      break;
    }
    continue;
  }
  if (item instanceof SymbolToken) {
    if (item.Is(";") || item.Is(",") || template.SymbolTemplate.IsAssignmentSymbol(item.TempToString())) {
      endIndex = i - 1;
      break;
    }
    if ((item.Is("?") || item.Is(":")) && sawExtends === false) {
      endIndex = i - 1;
      break;
    }
  }
  if (item instanceof Identifier && item.Is("extends")) {
    sawExtends = true;
  }
  items.push(item);
}
if (endIndex === -1) {
  endIndex = units.length - 1;
}
if (items.length === 0) {
  return index;
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
