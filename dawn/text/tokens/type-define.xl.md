# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchFront } from "../../../core/extensions/list-extension.xl.md"
import { JsonObjectReorganization } from "./json/json-object.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型标注：把 `name: Type` 里的 `: Type` 那一段收成一个 `TypeDefine` 单元。它只在「类型位置」成立——三元表达式的 `?`、以及 Json 对象里的键值对都要排除。

`TypeDefineReorganization` 写在 `TypeDefine` **之前**，与同目录其它 token 一致。

# class TypeDefineReorganization extends Reorganization

`Previous` 认的是「内容是 `:` 或 `?:` 的 `Symbol`，且**它前面没有** `?`，且它的父单元不是 Json 对象」。最后那条排除很关键：Json 对象里的 `{a: 1}` 也是冒号，但不是类型标注。

`Process` 从冒号**之后**开始收集，直到 `;` / `,` / 赋值符号为止，整段装进 `TypeDefine`。

## static readonly field Instance:TypeDefineReorganization = new TypeDefineReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型标注的开头。

判定是一句合取：`index` 处是 `Is(":")` 或 `Is("?:")` 的 `Symbol`，并且往前**没有**问号（`SearchFront` 给 `-1`）。命中后再排除父单元是 Json 对象的情况。

判定要调 `JsonObjectReorganization.Instance.IsObject(...)`（`json-object.xl.md` 里那个方法落成了实例方法）。

```ts
const current = Get(units, index);
if (!(current instanceof Symbol)) {
  return false;
}
if (!(current.Is(":") || current.Is("?:"))) {
  return false;
}
if (SearchFront(units, index, (item) => item instanceof Symbol && item.Is("?")) !== -1) {
  return false;
}
if (current.Parent !== null && JsonObjectReorganization.Instance.IsObject(current.Parent)) {
  return false;
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把冒号之后那一段收成一个 `TypeDefine`，**返回新的下标**。

要点：

- 从 `index + 1` 往后扫，遇到内容为 `;` / `,` 的 `Symbol`，或者 `template.SymbolTemplate.IsAssignmentSymbol(...)` 认下的赋值符号，就停在它**前一位**（`endIndex = i - 1`）并跳出。
- 一路没遇到终止符就把 `endIndex` 取成 `units.length - 1`。
- 收集期间每个单元都要非空，取不到就抛错。
- 新单元用**当前单元**（`index` 处那个）作为 `Parent` 的来源：先 `new` 再赋值。
- 收集到的一批单元用 `AddRange` 整批加入；终点取**最后一个收集项**的 `End`。收集为空时这里直接取下标会抛异常，不额外兜底。
- 批量替换用四参数的 `ReplaceCountAt`（三个参数的版本才叫 `ReplaceAt`），返回的 `index` 就是新下标。

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
  if (item instanceof Symbol && (item.Is(";") || item.Is(",") || template.SymbolTemplate.IsAssignmentSymbol(item.TempToString()))) {
    endIndex = i - 1;
    break;
  }
  items.push(item);
}
if (endIndex === -1) {
  endIndex = units.length - 1;
}
const result = new TypeDefine(template);
result.Parent = current.Parent;
result.AddRange(items);
result.SignIn(current.SourceRange.Start!);
result.SignOut(items[items.length - 1].SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class TypeDefine extends IndependentToken
一段类型标注（`name: Type` 里的 `: Type`）。

单元值类型是单字符的 `string`。

它**没有**覆写 `ToXmlString`，所以 XML 由基类产出：`<TypeDefine>段内子单元的 XML 串接</TypeDefine>`（标签名即运行时类名）。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new TypeDefine(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
