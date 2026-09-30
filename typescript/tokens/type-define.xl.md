# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { IsMemberBoundary } from "./declaration-common.xl.md"
import { Statement } from "./statement.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Get, ReplaceCountAt, SearchFront } from "../../core/extensions/list-extension.xl.md"
import { JsonObjectReorganization } from "./json/object-literal.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型标注：把 `name: Type` 里的 `: Type` 那一段收成一个 `TypeDefine` 单元。它只在「类型位置」成立——三元表达式的 `?`、以及 Json 对象里的键值对都要排除。

`TypeDefineReorganization` 写在 `TypeDefine` **之前**，与同目录其它 token 一致。

# class TypeDefineReorganization extends Reorganization

`Previous` 认的是「内容是 `:` 或 `?:` 的 `SymbolToken`，且**它前面没有** `?`，且它的父单元不是 Json 对象」。最后那条排除很关键：Json 对象里的 `{a: 1}` 也是冒号，但不是类型标注。

`Process` 从冒号**之后**开始收集，直到 `;` / `,` / 赋值符号为止，整段装进 `TypeDefine`。

## static readonly field Instance:TypeDefineReorganization = new TypeDefineReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型标注的开头。

判定是一句合取：`index` 处是 `Is(":")` 或 `Is("?:")` 的 `SymbolToken`，并且往前**没有**问号（`SearchFront` 给 `-1`）。命中后再排除父单元是 Json 对象的情况。

判定要调 `JsonObjectReorganization.Instance.IsObject(...)`（`json-object.xl.md` 里那个方法落成了实例方法）。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken)) {
  return false;
}
if (!(current.Is(":") || current.Is("?:"))) {
  return false;
}
if (SearchFront(units, index, (item) => item instanceof SymbolToken && item.Is("?")) !== -1) {
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

- 从 `index + 1` 往后扫，遇到内容为 `;` / `,` 的 `SymbolToken`，或者 `template.SymbolTemplate.IsAssignmentSymbol(...)` 认下的赋值符号，就停在它**前一位**（`endIndex = i - 1`）并跳出。
- **遇到成员边界（换行 + 下一行像新成员）也停**（`IsMemberBoundary`，见下）。
- **遇到语句边界也停**（`Statement.IsLineBreakBoundary`）：换行后面已经是下一条语句时，
  当前这条声明的类型到头了。少了这一条，`let a!: number` 换行 `class C { … }` 里的整个类
  会被收进 `TypeDefine`（实测 `tests/parse/cases/declarations/vars-definite.ts`）。
  合法折行不受影响：`A |` 换行 `B`（`|` 要右操作数）与 `A` 换行 `| B`（`|` 能续接）都不是语句边界。
- 一路没遇到终止符就把 `endIndex` 取成 `units.length - 1`。
- 收集期间每个单元都要非空，取不到就抛错。
- 新单元用**当前单元**（`index` 处那个）作为 `Parent` 的来源：先 `new` 再赋值。
- 收集到的一批单元用 `AddRange` 整批加入；终点取**最后一个收集项**的 `End`。
- **收集为空时什么都不做、返回原下标**：冒号后面直接就是终止符（`units[index + 1]` 是 `;` / `,` / 赋值符号）
  会走到这里。少了这一步，`items[items.length - 1]` 取的是 `items[-1]` → `undefined`，
  下一句读 `.SourceRange` 就抛**裸 `TypeError`**（实测：返回类型被 `import` / `abstract` 截断时
  `ReturnType` 里只剩一个冒号，就是这个形状）。空 `TypeDefine` 不携带信息，不如不动。
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
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(",") || template.SymbolTemplate.IsAssignmentSymbol(item.TempToString()))) {
    endIndex = i - 1;
    break;
  }
  if (item instanceof LineWrap && (IsMemberBoundary(units, i) || Statement.IsLineBreakBoundary(units, i))) {
    endIndex = i - 1;
    break;
  }
  items.push(item);
}
if (endIndex === -1) {
  endIndex = units.length - 1;
}
if (items.length === 0) {
  return index;
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

转调基类构造器，**并且把自己的重组队列装上**。

本单元是重组规则建出来的，它的内容（`:` 之后的类型文本）**没有**再被外层扫过一遍：
外层那一趟里 `KeywordReorganization` 排在**最后**（这是必须的，结构规则要先看到 `Identifier`），
而 `TypeDefine` 在它之前就把类型文本收走了——类型位的关键词于是永远停在 `Identifier` 上
（`function f(): void {}` 的 `void`、`let x: readonly string[]` 的 `readonly` 都这样）。
给本单元挂上**类型队列**（只有 `KeywordReorganization` 一条，见
`../../parse-pipeline.xl.md` 的 `InitialKeywordReorganizationQueue`）之后，它关闭时会再跑一趟，
`KeywordReorganization` 这一趟就能看见里面的词。

用类型队列而不是通用队列：通用队列里的 `TernaryOperatorReorganization` 会把**条件类型**
`T extends U ? A : B` 收成表达式三元——类型位的 `? :` 不是三元表达式。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
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
