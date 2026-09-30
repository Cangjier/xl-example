# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CommonUtil } from "../../core/common-util.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { ConstString } from "./string/const-string.xl.md"
import { String } from "./string/string.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

导入语句：把 `import { … } from "…"` 整段收成一个 `Import` 单元。

`Import` 与 `String.String` 的 `From` 是加载依赖文件的入口：调用方从 `textContext.Root.Data` 里筛出 `Import` 单元即可。

`ImportReorganization` 写在 `Import` 之前。

# class ImportReorganization extends Reorganization

`Previous` 认的是「一个内容恰好等于 `import` 的 `Identifier`」——不是一个关键字 token，而是普通字符块。

## static readonly field Instance:ImportReorganization = new ImportReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `import` 这个词，**而且它是一个导入声明**。

`import` 后面紧跟 `(` 的是**动态导入**——它是调用表达式（`await import("m")` / `import("m").then(…)`），
不是导入声明。少了这一条，`import("m")` 会被收成 `<Import><Bracket>…`，
既挡住调用规则收 `Method`，也让 `xl:absent Import` 的用例失败。

**后面紧跟 `.` 的是元属性 `import.meta`**（不是导入声明）：它是 TypeScript / ESM 里的一个表达式，
收成 `Import` 会把 `import.meta.url` 整段吞进一个假的导入节点里（`expr-call-import-meta` 那条用例）。
合法的导入声明后面跟的是 `{` / `*` / 一个名字 / 一个字符串，不会是 `.`。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || current.TempToString() !== "import") {
  return false;
}
const next = Get(units, SkipNextWrapSymbol(units, index));
if (next instanceof Bracket && next.startBracket === "(") {
  return false;
}
if (next instanceof SymbolToken && next.Is(".")) {
  return false;
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

从 `import` 开始往后收集单元，直到遇到 `;` 或软换行，收成一个 `Import`，**返回新的下标**。

要点：

- 遇到 `;`（`SymbolToken.Is(";")`）或 `LineWrap` 就停，结束下标记成 `i - 1`（**不含**这个终止符）。
- `from` 的取法有两路：先找内容为 `from` 的 `Identifier`，取它**之后**那段里的第一个 `String`；找不到 `from` 就退回到整段里的第一个 `String`。
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
  if ((item instanceof SymbolToken && item.Is(";")) || item instanceof LineWrap) {
    endIndex = i - 1;
    break;
  }
  items.push(item);
}
const result = new Import(template);
result.Parent = current.Parent;
const fromIndex = items.findIndex((item) => item instanceof Identifier && item.Is("from"));
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
result.ReadClause(items);
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

## field typeOnly:boolean = false

`import type …` 的 type-only 导入。

**判据是收集到的第一个单元就是内容为 `type` 的 `Identifier`**：`import type { A } from "m"` ✓；
`import { type A } from "m"`（逐项 type 修饰）不算整条 type-only ✓。

## field defaultImport:string = ""

默认导入的本地名（`import Default from "m"` → `Default`）。

## field namespace:string = ""

命名空间导入的本地名（`import * as ns from "m"` → `ns`）。

## field imported:Array<string> = []

具名导入的**本地名**列表（`import { A, B as C } from "m"` → `A,C`）。

取的是每一项的**最后一个 `Identifier`**：`A` 取 `A`、`B as C` 取 `C`、`type B` 取 `B` ✓。
空列表表示这条导入没有具名子句（`import "m"` / 默认导入 / 命名空间导入）。

**为什么这些属性值得加**（`known-gaps.json` 的 `_notes.imports-unstructured`）：
原来 `Import` 只带 `From`，两条形状完全不同的导入只能靠子单元去分辨；
而且 `From` **根本没有进 XML**（`Import` 没有覆写 `ToXmlString`）——下游拿不到路径。
现在这些信息都成了属性，`ToXmlString` 一并渲染。

## method ReadClause:(items:Array<Token>)=>void

从子句里读出 `typeOnly` / `defaultImport` / `namespace` / `imported`。

`Process` 在把 `items` 装进 `Data` **之前**调用它（那时这些单元还没被关闭，读起来最方便）。

三种子句的形态互斥、按顺序判：

- 头一个是 `type` → `typeOnly`，后面按「剩下的部分」继续判；
- 紧跟 `*`：命名空间导入，`as` 之后的那个 `Identifier` 是本地名；
- 头一个是 `Identifier`（不是 `from`）：默认导入；
- 有 `{` 括号：具名导入，括号里按 `,` 分段、每段取最后一个 `Identifier`。

```ts
let start = 0;
if (items.length > 0 && items[0] instanceof Identifier && (items[0] as Identifier).Is("type")) {
  this.typeOnly = true;
  start = 1;
}
if (start >= items.length) {
  return;
}
const head = items[start];
if (head instanceof SymbolToken && head.Is("*")) {
  const asIndex = items.findIndex((item) => item instanceof Identifier && (item as Identifier).Is("as"));
  if (asIndex !== -1 && asIndex + 1 < items.length && items[asIndex + 1] instanceof Identifier) {
    this.namespace = (items[asIndex + 1] as Identifier).TempToString();
  }
  return;
}
if (head instanceof Identifier && head.Is("from") === false) {
  this.defaultImport = head.TempToString();
  return;
}
if (head instanceof Bracket && head.startBracket === "{") {
  const names: string[] = [];
  let lastCommon: Identifier | null = null;
  for (const item of head.Data) {
    if (item instanceof Identifier) {
      lastCommon = item;
      continue;
    }
    if (item instanceof SymbolToken && item.Is(",")) {
      if (lastCommon !== null) {
        names.push(lastCommon.TempToString());
        lastCommon = null;
      }
    }
  }
  if (lastCommon !== null) {
    names.push(lastCommon.TempToString());
  }
  this.imported = names;
}
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `From` / `typeOnly` / `defaultImport` / `namespace` / `imported`。

`From` 要过一遍 `CommonUtil.XmlDecode`（路径里可能有 `&` 这类字符）。

`typeOnly` 写成 `true` / `false`——与 `Interface` 的 `export` 同款。

```ts
const name = this.constructor.name;
let body = "";
for (const item of this.Data) {
  body = body + item.ToXmlString();
}
const from = this.From === null ? "" : CommonUtil.XmlDecode(this.From);
const isTypeOnly = this.typeOnly ? "true" : "false";
return `<${name} From="${from}" typeOnly="${isTypeOnly}" defaultImport="${this.defaultImport}" namespace="${this.namespace}" imported="${this.imported.join(",")}">${body}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 抄五个字段 → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new Import(this.Template);
result.Sign(this);
result.From = this.From;
result.typeOnly = this.typeOnly;
result.defaultImport = this.defaultImport;
result.namespace = this.namespace;
result.imported = this.imported.slice();
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
