# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Bracket } from "./bracket.xl.md"
import { CommonUtil } from "../../../core/common-util.xl.md"
import { Common } from "./common.xl.md"
import { Symbol } from "./symbol.xl.md"
import { ConstString } from "./string/const-string.xl.md"
import { String } from "./string/string.xl.md"
import { TypeLiteral } from "./type-literal/type-literal.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

导出语句：`export { a as b } from "m"` / `export * from "m"` / `export type { A } from "m"` /
`export { a }` 这一族，整条收成一个 `Export`。

**它只认「`export` 后面是 `*` 或 `{`」的那些**：`export default …` / `export const …` / `export function …`
是「导出 + 一条声明」，那条声明自己有节点（`Let` / `Function` / `Class` …），
再包一层 `Export` 只会把它们重复计一遍。所以判定里要求 `export` 之后紧跟的是 `*` 或 `{`。

`ExportReorganization` 写在 `Export` **之前**：后者的静态字段 `Instance` 在类定义时就
`new ExportReorganization()`，写反了会命中暂时性死区（TDZ）。

# class ExportReorganization extends Reorganization

## static readonly field Instance:ExportReorganization = new ExportReorganization()

唯一的实例，注册进通用重组队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `export` 这个词，**而且是一条「导出列表 / 全部导出」语句**。

```ts
const current = Get(units, index);
if (!(current instanceof Common) || current.TempToString() !== "export") {
  return false;
}
let nextIndex = this.SkipWrap(units, index);
const maybeType = Get(units, nextIndex);
if (maybeType instanceof Common && maybeType.TempToString() === "type") {
  nextIndex = this.SkipWrap(units, nextIndex);
}
const next = Get(units, nextIndex);
if (next instanceof Symbol && next.Is("*")) {
  return true;
}
if (next instanceof Symbol && next.Is("=")) {
  return true;
}
if (next instanceof Common && next.Is("default")) {
  return true;
}
if (next instanceof TypeLiteral) {
  return true;
}
return next !== null && next instanceof Bracket && next.StartBracketChar === "{";
```

**另外两种导出**：

- `export = foo`（导出赋值）——`export` 后面紧跟 `=`；
- `export default foo`（默认导出表达式）——`export` 后面紧跟 `default`。

两者都是**只收前缀**（`export` 与 `default` / `=` 两个词），
后面那段表达式留在外面由父单元照常解析——理由见 `Process` 里的说明。

`export default class C {}` / `export default function f() {}` 走的**不是**这一支：
`ClassReorganization` / `FunctionReorganization` 排在 `Export` **之前**，
轮到 `Export` 时它们已经把 `export,default` 折进自己的 `Modifiers` 了。

`TypeLiteral` 那一支是必须的：规则是**按规则轮询**的，`TypeLiteralReorganization` 排在
`ExportReorganization` **之前**——轮到 `Export` 时，`export type { A } from "m"` 里那对花括号
**已经**被收成 `TypeLiteral` 了，只认 `Bracket` 的话这条语句永远匹配不上。

`type` 那一跳是给 `export type { A } from "m"`（只导出类型）的。
它不会把 `export type X = …`（导出类型别名）也当成导出列表——
跳过 `type` 之后见到的是别名那个 `Common`，既不是 `*` 也不是 `{`，判定在这一支就断了。

## private method SkipWrap:(units:Array<Token>, index:int)=>int

跳过软换行之后的那个下标。

**`export` 与 `*` / `{` 之间允许换行**（`export` 换行 `*` 换行 `from "m"` 是常见排版），
所以判定与收集都要跳软换行；不跳的话多行导出语句整条不成形。

```ts
let i = index + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof WrapSymbol) {
    i = i + 1;
    continue;
  }
  break;
}
return i;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

从 `export` 开始往后收集单元，直到遇到 `;` 或软换行，收成一个 `Export`，**返回新的下标**。

与 `import.xl.md` 的 `Process` 同一套做法（两条语句的形状本来就对称）：

- 遇到 `;`（`Symbol.Is(";")`）或 `WrapSymbol` 就停，结束下标记成 `i - 1`（**不含**这个终止符）。
- `From` 的取法：先找内容为 `from` 的 `Common`，取它**之后**那段里的第一个 `String`；
  没有 `from`（`export { a }` 这种本地导出）就**没有** `From`，也不抛错。
- 从 `String` 的子单元里取第一个 `ConstString`，把它的文本当作 `From`。

**`export =` / `export default` 只收「前缀那两个词」**，后面那段表达式留在外面：
它的体里是表达式（`export default (a: number) => a` 里是箭头），
而 `Export` 装的是精简队列，表达式规则不在里面——收进来只会得到一个散单元。
留在外面则由父单元的队列照常收成 `Lamda` / `Method` 等 ✓。
这也是构造器里「不装通用队列」那个取舍的配套做法。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const items: Token[] = [];
let endIndex = index;
const headIndex = this.SkipWrap(units, index);
let headEnd = headIndex;
const maybeType = Get(units, headIndex);
if (maybeType instanceof Common && maybeType.Is("type")) {
  headEnd = this.SkipWrap(units, headIndex);
}
const head = Get(units, headEnd);
const isPrefixOnly =
  (head instanceof Common && head.Is("default")) || (head instanceof Symbol && head.Is("="));
if (isPrefixOnly) {
  for (let i = index + 1; i <= headEnd; i++) {
    const item = Get(units, i);
    if (item !== null && !(item instanceof WrapSymbol)) {
      items.push(item);
    }
  }
  endIndex = headEnd;
} else {
  for (let i = index + 1; i < units.length; i++) {
    const item = Get(units, i);
    if (item === null) {
      continue;
    }
    if (item instanceof WrapSymbol) {
      break;
    }
    if (item instanceof Symbol && item.Is(";")) {
      endIndex = i;
      break;
    }
    items.push(item);
    endIndex = i;
  }
}
const result = new Export(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.AddAndCloseLast(current);
for (const item of items) {
  result.AddAndCloseLast(item);
}
let fromIndex = -1;
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  if (item instanceof Common && item.TempToString() === "from") {
    fromIndex = i;
    break;
  }
}
let target: String | null = null;
const searchFrom = fromIndex < 0 ? 0 : fromIndex + 1;
for (let i = searchFrom; i < items.length; i++) {
  const item = items[i];
  if (item instanceof String) {
    target = item;
    break;
  }
}
if (target !== null) {
  let text: string | null = null;
  for (const item of target.Data) {
    if (item instanceof ConstString) {
      text = item.TempToString();
      break;
    }
  }
  if (text === null) {
    throw new Error("导出语句不满足格式要求：export ... from \"...\"");
  }
  result.From = text;
}
result.ReadClause(items);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class Export extends IndependentToken

导出语句。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## constructor:(template:Template)=>void

转调基类构造器，**并且把自己的重组队列装上**。

理由与 `type-define.xl.md` 的同名构造器相同：本单元是重组规则建出来的，
`KeywordReorganization` 排在通用队列**最后**、轮不到它里面的词——
`export` / `type` / `from` 这些词于是停在 `Common` 上（`Import` 那边也一样，属于既有行为）。

装的是**精简队列**（只有 `KeywordReorganization` + `WrapSymbolReorganization`，
见 `../parse-pipeline.xl.md` 的 `InitialKeywordReorganizationQueue`）。

**试过换成通用队列、退回来了**：通用队列能顺带把 `export default (a: number) => a` 里的箭头
收成 `Lamda`，但同时弄坏了十来条既有用例（`ex-named` / `ex-default-class` / `ex-reexport` /
`ex-type-from` / `am-declare-module-css` …）——`Export` 的内容是「导出列表 / 目标模块」，
不该再跑一遍表达式与语句规则。`export =` / `export default` 改成**只收前缀两个词**（见 `Process`），
表达式留在外面照常成形。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## field From:string | null = null

导出目标模块的路径；本地导出（`export { a }`）为 `null`。

与 `Import.From` 同一个含义，加载依赖文件时用它。

## field IsTypeOnly:boolean = false

`export type { … }` 的 type-only 导出。

判据与 `Import.IsTypeOnly` 同款：收集到的第一个单元就是内容为 `type` 的 `Common`。

## field NamespaceName:string = ""

`export * as ns from "m"` 里的那个 `ns`（具名转发）。

## field ExportedNames:Array<string> = []

导出列表里每一项的**对外名**（`export { a as b, c }` → `b,c`）。

取法与 `Import.ImportedNames` 对称、但取的是**最后一个** `Common`：`a as b` 对外是 `b` ✓，
`c` 对外是 `c` ✓，`type D` 对外是 `D` ✓。空列表表示这条语句没有花括号列表。

**为什么这些属性值得加**：与 `Import` 那边是同一个问题（`known-gaps.json` 的
`_notes.exports-no-node` 里剩的就是这一块）——原来 `Export` 只带 `From`，
而且 `From` **没有进 XML**（`Export` 没有覆写 `ToXmlString`）。`import { a as b }` 与
`export { a as b }` 在产物里长得一样、下游分不出方向与别名。

## method ReadClause:(items:Array<Token>)=>void

从收集到的单元里读出 `IsTypeOnly` / `NamespaceName` / `ExportedNames`。

与 `Import.ReadClause` 对称，差别只在「取最后一个是**对外**名」这件事上（导入取本地名）。

```ts
let start = 0;
if (items.length > 0 && items[0] instanceof Common && (items[0] as Common).Is("type")) {
  this.IsTypeOnly = true;
  start = 1;
}
if (start >= items.length) {
  return;
}
const head = items[start];
if (head instanceof Symbol && head.Is("*")) {
  const asIndex = items.findIndex((item) => item instanceof Common && (item as Common).Is("as"));
  if (asIndex !== -1 && asIndex + 1 < items.length && items[asIndex + 1] instanceof Common) {
    this.NamespaceName = (items[asIndex + 1] as Common).TempToString();
  }
  return;
}
for (const item of items) {
  if (!(item instanceof Bracket) || item.StartBracketChar !== "{") {
    continue;
  }
  const names: string[] = [];
  let lastCommon: Common | null = null;
  for (const child of item.Data) {
    if (child instanceof Common) {
      lastCommon = child;
      continue;
    }
    if (child instanceof Symbol && child.Is(",")) {
      if (lastCommon !== null) {
        names.push(lastCommon.TempToString());
        lastCommon = null;
      }
    }
  }
  if (lastCommon !== null) {
    names.push(lastCommon.TempToString());
  }
  this.ExportedNames = names;
  return;
}
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `From` / `IsTypeOnly` / `NamespaceName` / `ExportedNames`。

`From` 过一遍 `CommonUtil.XmlDecode`（路径里可能有 `&`），`IsTypeOnly` 写成 `true` / `false`。

```ts
const name = this.constructor.name;
let body = "";
for (const item of this.Data) {
  body = body + item.ToXmlString();
}
const from = this.From === null ? "" : CommonUtil.XmlDecode(this.From);
const isTypeOnly = this.IsTypeOnly ? "true" : "false";
return `<${name} From="${from}" IsTypeOnly="${isTypeOnly}" NamespaceName="${this.NamespaceName}" ExportedNames="${this.ExportedNames.join(",")}">${body}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new Export(this.Template);
result.Sign(this);
result.From = this.From;
result.IsTypeOnly = this.IsTypeOnly;
result.NamespaceName = this.NamespaceName;
result.ExportedNames = this.ExportedNames.slice();
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
