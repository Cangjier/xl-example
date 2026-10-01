# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CommonUtil } from "../../core/common-util.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceAt } from "../../core/extensions/list-extension.xl.md"
import { RemoveItem } from "../list-extensions.xl.md"
import { GetSkipPreviousWrapSymbol, SkipNextWrapSymbol } from "../text-common-util.xl.md"
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

**前面紧跟 `.` / `?.` 的是属性名**（`a.import` / `a?.import`）：`import` 是关键字表里的词，
但它在成员位置就是一个普通的名字（TypeScript 的 AST 里那里是 `Identifier`，不是 `ImportKeyword`）。
不排除这一种时，规则的收集循环立刻撞上 `;`，`items` 为空，`items[items.length - 1]` 是 `undefined`
——直接抛 `TypeError`（不是 `SyntaxException`），整个文件解析失败。
判据与 `new.xl.md` 里 `a.new` 那一路同型：**关键字不能只看自己，要看它前面那一格。**

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || current.TempToString() !== "import") {
  return false;
}
const previous = GetSkipPreviousWrapSymbol(units, index);
if (previous instanceof SymbolToken && (previous.Is(".") || previous.Is("?."))) {
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

## private method FindStringUnit:(items:Array<Token>)=>String | null

在一批单元里找第一个字符串**单元**，找不到给 `null`。

**必须往子单元里递归找**（第 67 轮修）：`import fs = require("fs")` 走到这里时，
`require("fs")` 已经被 `MethodReorganization` 收成一个 `Method` 单元，
那个 `String` 是它的**子单元**——只看 `items` 的直接成员会漏掉，
`From` 于是留着空串（真实语料 `@types/node` 里这类 import-equals 很多）。

按文档顺序**取第一个**（深度优先、先自己后子单元），与「哪一行离 `import` 更近」一致。

```ts
for (const item of items) {
  if (item instanceof String) {
    return item;
  }
  const nested = this.FindStringUnit(item.Data);
  if (nested !== null) {
    return nested;
  }
}
return null;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

从 `import` 开始往后收集单元，直到遇到 `;` 或软换行，收成一个 `Import`，**返回新的下标**。

要点：

- 遇到 `;`（`SymbolToken.Is(";")`）或 `LineWrap` 就停（那个终止符**不进** `items`）。
- `from` 的取法有两路：先找内容为 `from` 的 `Identifier`，取它**之后**那段里的第一个 `String`；找不到 `from` 就退回到整段里的第一个 `String`（走 `FindStringUnit`，**递归**进子单元——`import fs = require("fs")` 的那个 `String` 装在 `Method` 里）。
- 从 `String` 的子单元里取第一个 `ConstString`，把它的文本当作 `From`。找不到匹配项就抛异常（不能用 `find` 的 `undefined` 蒙混过去）。
- 最后**逐个把吃掉的单元从列表里摘掉**（`RemoveItem`），再把 `result` 放回原来 `import` 那一格，返回 `index`。

**为什么不是 `ReplaceCountAt`**（这是本条规则最容易踩的一处）：`ReplaceCountAt` 假定
「`index` 起连续 `count` 个格子都还是那些旧单元」，而这里 `items` 是**按内容**收集的
（`import { A } \n from "m"` 里的软换行会被跳过），收集范围与「连续下标区间」不是一回事。
留下没摘掉的旧单元时，它们与 `Import` 的子单元是**同一批对象**，产物里就会各渲染一次；
更糟的是它们会让末尾那条语句重组规则（`StatementReorganization3`）在旧下标上再收一个 `Statement` 出来，
`<Import>` 旁边于是多出一个内容一模一样的 `<Statement>`——实测在「文件以 `import …` 结尾、
尾随既没有 `;` 也没有换行」时必现。按身份逐个摘干净之后这条路径不再存在。

必须先 `SignOut` / `TryToClose` 再摘：`TryToClose` 要的范围来自那些单元自己的 `SourceRange`，
而 `RemoveItem` 只动列表、不动单元。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const items: Token[] = [];
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("item 为空");
  }
  if ((item instanceof SymbolToken && item.Is(";")) || item instanceof LineWrap) {
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
  const firstString = this.FindStringUnit(items);
  if (firstString !== null) {
    const constString = firstString.Data.find((item) => item instanceof ConstString);
    if (constString === undefined) {
      throw new Error("找不到匹配的子单元");
    }
    result.From = constString.TempToString();
  }
}
result.ReadClause(items);
const headItem = items.length > 0 ? items[0] : null;
const headIsType = headItem instanceof Identifier && headItem.Is("type");
const children = headIsType ? items.slice(1) : items;
result.AddRange(children);
result.SignIn(current.SourceRange.Start!);
result.SignOut(items[items.length - 1].SourceRange.End!);
result.TryToClose();
for (const item of items.slice()) {
  RemoveItem(units, item);
}
ReplaceAt(units, index, result);
return index;
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

那个 `type` 词**不进产物**（第 56 轮修的）：它已经由 `typeOnly="true"` 表达，
再以一个 `<Identifier>type</Identifier>` 留在 `Import` 里是纯冗余
（`README.md` 的「结构性缺口」里挂着它）。`import type { A } from "m"` 与
`import { A } from "m"` 的差别只在属性上，这正是下游需要的形状。

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

**`import defer` 是相位修饰词，不是默认导入名**（TS 5.9 的延迟导入，第 67 轮补）：
`import defer * as ns from "m"` 里 `defer` 修饰的是那个命名空间导入。
判据必须带上**后面紧跟 `*`** 这半条——`import defer from "./defer.js"` 是**合法的默认导入**，
名字就叫 `defer`，无条件跳过会把它读丢（实测）。

```ts
let start = 0;
if (items.length > 0 && items[0] instanceof Identifier && (items[0] as Identifier).Is("type")) {
  this.typeOnly = true;
  start = 1;
}
if (
  start + 1 < items.length &&
  items[start] instanceof Identifier &&
  (items[start] as Identifier).Is("defer") &&
  items[start + 1] instanceof SymbolToken &&
  (items[start + 1] as SymbolToken).Is("*")
) {
  start = start + 1;
}
if (start >= items.length) {
  return;
}
if (
  start + 1 < items.length &&
  items[start + 1] instanceof SymbolToken &&
  (items[start + 1] as SymbolToken).Is("=")
) {
  // **import-equals**（`import A = B.C` / `import A = require("m")` / `export import A = B`）：
  // 等号左边是**本地别名**，不是默认导入——TS 那边 `ImportEqualsDeclaration` 里根本没有
  // 「default import」这个位置。不挡这一条，`defaultImport` 会被填成那个别名，
  // 而 `From`（require 那一支）又指向真实路径，下游按「默认导入 + 路径」读就会读歪（第 67 轮修）。
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

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `From` / `typeOnly` / `defaultImport` / `namespace` / `imported` 五个字段，外加子单元。

键名与 `ToXmlString` 开标签上的五个属性同名（连顺序也一致）、值同源：
`From` 的兜底照抄 XML 那处——`this.From === null` 时写空字符串，否则写字段本身
（XML 那次 `CommonUtil.XmlDecode` 只是属性转义，JSON 不需要）；
`typeOnly` 是 `bool`，这里写真布尔，而不是 XML 属性里插值出来的文本；
`imported` 是 `Array<string>`，按 `join(",")` 拼成字符串。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
const from = this.From === null ? "" : this.From;
result.set("From", from);
result.set("typeOnly", this.typeOnly);
result.set("defaultImport", this.defaultImport);
result.set("namespace", this.namespace);
result.set("imported", this.imported.join(","));
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
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
