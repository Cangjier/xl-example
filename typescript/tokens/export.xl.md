# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Bracket } from "./bracket.xl.md"
import { CommonUtil } from "../../core/common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { ConstString } from "./string/const-string.xl.md"
import { String } from "./string/string.xl.md"
import { TypeLiteral } from "./type-literal/type-literal.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { NextLineStartsWithWord, SkipPreviousWrapSymbol, IsTriviaUnit } from "../text-common-util.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

导出语句：`export { a as b } from "m"` / `export * from "m"` / `export type { A } from "m"` /
`export { a }` 这一族，整条收成一个 `Export`。

**它只认「`export` 后面是 `*` 或 `{`」的那些**：`export default …` / `export const …` / `export function …`
是「导出 + 一条声明」，那条声明自己有节点（`Let` / `Function` / `Class` …），
再包一层 `Export` 只会把它们重复计一遍。所以判定里要求 `export` 之后紧跟的是 `*` 或 `{`。

`ExportCloseRule` 写在 `Export` **之前**：后者的静态字段 `Instance` 在类定义时就
`new ExportCloseRule()`，写反了会命中暂时性死区（TDZ）。

# class ExportCloseRule extends CloseRule

## static readonly field Instance:ExportCloseRule = new ExportCloseRule()

唯一的实例，注册进通用规则队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `export` 这个词，**而且是一条「导出列表 / 全部导出」语句**。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || current.TempToString() !== "export") {
  return false;
}
// **点号后面那个 `export` 是成员名**（第 154 轮）：`interfaceInstance.export = true` 里
// 它是一个属性名（TS 那边是 `PropertyAccessExpression.name`），不是导出语句。
// 不挡的话这一串 `.export =` 会被收成一个 `Export` 单元，
// 于是 `PropertyAccessExpression` 漂移、`EqualsToken` / `TrueKeyword` 整个丢
// （实测 `dist/ts/typescript/tokens/interface/interface.ts`）。
const beforeExport = Get(units, SkipPreviousWrapSymbol(units, index));
if (beforeExport instanceof SymbolToken && (beforeExport.Is(".") || beforeExport.Is("?."))) {
  return false;
}
let nextIndex = this.SkipWrap(units, index);
const maybeType = Get(units, nextIndex);
if (maybeType instanceof Identifier && maybeType.TempToString() === "type") {
  nextIndex = this.SkipWrap(units, nextIndex);
}
const next = Get(units, nextIndex);
if (next instanceof SymbolToken && next.Is("*")) {
  return true;
}
if (next instanceof SymbolToken && next.Is("=")) {
  return true;
}
if (next instanceof Identifier && next.Is("default")) {
  return true;
}
if (next instanceof TypeLiteral) {
  return true;
}
return next !== null && next instanceof Bracket && next.startBracket === "{";
```

**另外两种导出**：

- `export = foo`（导出赋值）——`export` 后面紧跟 `=`；
- `export default foo`（默认导出表达式）——`export` 后面紧跟 `default`。

两者都是**只收前缀**（`export` 与 `default` / `=` 两个词），
后面那段表达式留在外面由父单元照常解析——理由见 `Process` 里的说明。

`export default class C {}` / `export default function f() {}` 走的**不是**这一支：
`ClassCloseRule` / `FunctionCloseRule` 排在 `Export` **之前**，
轮到 `Export` 时它们已经把 `export,default` 折进自己的 `modifiers` 了。

`TypeLiteral` 那一支是必须的：规则是**按规则轮询**的，`TypeLiteralCloseRule` 排在
`ExportCloseRule` **之前**——轮到 `Export` 时，`export type { A } from "m"` 里那对花括号
**已经**被收成 `TypeLiteral` 了，只认 `Bracket` 的话这条语句永远匹配不上。

`type` 那一跳是给 `export type { A } from "m"`（只导出类型）的。
它不会把 `export type X = …`（导出类型别名）也当成导出列表——
跳过 `type` 之后见到的是别名那个 `Identifier`，既不是 `*` 也不是 `{`，判定在这一支就断了。

## private method SkipWrap:(units:Array<Token>, index:int)=>int

跳过 **trivia**（软换行与注释）之后的那个下标。

**`export` 与 `*` / `{` 之间允许换行**（`export` 换行 `*` 换行 `from "m"` 是常见排版），
所以判定与收集都要跳过它；不跳的话多行导出语句整条不成形。

**注释也算 trivia**（第 669 轮）：`export  /* c */ { a as b, c, type D };` 是合法排法，
只跳软换行时 `Previous` 看到的是那条注释 ⇒ 判定为否 ⇒ 整条语句退回散单元
（实测缺 `ExportDeclaration` / `NamedExports` / `ExportSpecifier` 一族 9 个节点、漂 0 多 2）。
判据走 `IsTriviaUnit`——它是「下一个实义单元」的统一口径，与 `import` / `statement` 那几处同一做法。

```ts
let i = index + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item !== null && IsTriviaUnit(item)) {
    i = i + 1;
    continue;
  }
  break;
}
return i;
```

## method IsComplete:(items:Array<Token>)=>bool

收到的这些单元**够不够成一条完整的导出声明**（第 869 轮）。

导出声明有**四种**完整形状，判据因此分三支——这一条比 `import.xl.md` 那一条（只认模块路径）多。
**收尾规则（`Process`）与语句分派层（`Statement.IsPendingExportHead`）问的是同一句**，
所以它是一格公开方法，不是私有近似：

  export * as ns from "m";   星号那一支：`*` 后面还必须有 `from` 与路径，缺一样都不完整
  export { a, b } from "m";  花括号那一支：子句自己就完整，`from` 是可选的
  export { a };              同上——所以**不能**拿「有没有路径」当唯一判据
  export = a;                赋值 / 默认导出那一支：`=` / `default` 后面还要有一个实义单元
  export default a;          （`=` 与 `default` 都只算前缀，操作数还没到手就不算写完）

星号与花括号那两支里，写了 `from` 就必须等到路径：`export { a } from` 换行 `"m"` 与
`export * from` 换行 `"m"` 都是 TS 照收的排法，而那时路径还没到手。

```ts
const first = items.length > 0 ? items[0] : null;
if (first instanceof SymbolToken && first.Is("=")) {
  return items.length > 1;
}
if (first instanceof Identifier && first.Is("default")) {
  return items.length > 1;
}
const brace = items.find(
  (item) => (item instanceof Bracket && item.startBracket === "{") || item instanceof TypeLiteral,
);
const star = items.find((item) => item instanceof SymbolToken && item.Is("*"));
const fromIndex = items.findIndex((item) => item instanceof Identifier && item.Is("from"));
const hasPath = items.slice(fromIndex + 1).some((item) => item instanceof String);
if (star !== undefined) {
  return fromIndex !== -1 && hasPath;
}
if (brace === undefined) {
  return false;
}
if (fromIndex === -1) {
  return true;
}
return hasPath;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

从 `export` 开始往后收集单元，直到遇到 `;` 或软换行，收成一个 `Export`，**返回新的下标**。

与 `import.xl.md` 的 `Process` 同一套做法（两条语句的形状本来就对称）：

- 遇到 `;`（`SymbolToken.Is(";")`）或 `LineWrap` 就停，结束下标记成 `i - 1`（**不含**这个终止符）。
- `From` 的取法：先找内容为 `from` 的 `Identifier`，取它**之后**那段里的第一个 `String`；
  没有 `from`（`export { a }` 这种本地导出）就**没有** `From`，也不抛错。
- 从 `String` 的子单元里取第一个 `ConstString`，把它的文本当作 `From`。

**`export =` / `export default` 只收「前缀那两个词」**，后面那段表达式留在外面：
它的体里是表达式（`export default (a: number) => a` 里是箭头），
而 `Export` 装的是精简队列，表达式规则不在里面——收进来只会得到一个散单元。
留在外面则由父单元的队列照常收成 `Lamda` / `Method` 等。
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
if (maybeType instanceof Identifier && maybeType.Is("type")) {
  headEnd = this.SkipWrap(units, headIndex);
}
const head = Get(units, headEnd);
const isPrefixOnly =
  (head instanceof Identifier && head.Is("default")) || (head instanceof SymbolToken && head.Is("="));
if (isPrefixOnly) {
  for (let i = index + 1; i <= headEnd; i++) {
    const item = Get(units, i);
    if (item !== null && !(item instanceof LineWrap)) {
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
    // **跨 trivia 的判据是「这条导出声明已经成形了吗」**（第 869 轮，与 `import.xl.md` 第 829 轮
    // 同一口径）——第 669 轮那一版只在**一格都没收到**时跨过 trivia，而导出声明比导入声明多一种
    // 「自己就完整」的形状（`export { a }` 不带 `from`），所以不能照抄「有没有路径」那一条。
    // 没成形时注释与软换行一律跨过去（`export * ⏎ as ns ⏎ from "m"` 是合法排法，
    // TS 那边导出声明在 `;` 之前没有 ASI）：原来在换行那一格 `break` ⇒ 整条断成两截
    // （实测 `export * as ns from "m"` 的四份换行排版各缺 3 个节点、字段差 1 处）。
    //
    // **「花括号那一支自己就完整」也要看右边**（第 876 轮）：`export { a }` 换行 `from "m"` 里
    // `done` 在换行那一刻就是真（`from` 对花括号子句是可选的），可下一行那个 `from` 说明
    // **还没写完** ⇒ 照旧 `continue`。判据与 `Statement.IsPendingExportHead` 那一格**同一句**
    // （`NextLineStartsWithWord`，本体在 `text-common-util.xl.md`——两处共用一格、又都不能
    // 反过来 import 对方，所以放在两者共同的下层），语句壳那一侧也问它。
    // **起点从那个单元自己的 `SourceRange.Start` 取，不用下标 `i`**（踩过）：这一段在
    // `Process` 里，而外层还有一个同名的 `i`（`headEnd` 那一支用的是它）——`i` 在这条支路上
    // 是**外层那个**（`export = …` 的等号位置），拿它建 `Source` 会从 `export` 中间开始扫。
    const done = this.IsComplete(items);
    if (done) {
      const brace = items.some(
        (item) =>
          (item instanceof Bracket && item.startBracket === "{") || item instanceof TypeLiteral,
      );
      const fromAt = items.findIndex((item) => item instanceof Identifier && item.Is("from"));
      if (brace && fromAt === -1) {
        const newline = Get(units, i);
        const start = newline === null ? null : newline.SourceRange.Start;
        if (start !== null && NextLineStartsWithWord(new Source(start.Document, start.Index), "from")) {
          continue;
        }
      }
    }
    if (IsTriviaUnit(item) && done === false) {
      continue;
    }
    if (item instanceof LineWrap) {
      break;
    }
    if (item instanceof SymbolToken && item.Is(";")) {
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
const headItem = items.length > 0 ? items[0] : null;
const headIsType = headItem instanceof Identifier && headItem.Is("type");
for (const item of items) {
  if (headIsType && item === headItem) {
    // `export type { A } from "m"` 的 `type` 词**不进产物**：它已经由 `typeOnly="true"` 表达
    // （与 `import.xl.md` 同一口径）。
    continue;
  }
  result.AddAndCloseLast(item);
}
let fromIndex = -1;
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  if (item instanceof Identifier && item.TempToString() === "from") {
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

转调基类构造器，**并且把自己的规则队列装上**。

理由与 `type-define.xl.md` 的同名构造器相同：本单元是收尾规则建出来的，
`KeywordCloseRule` 排在通用队列**最后**、轮不到它里面的词——
`export` / `type` / `from` 这些词于是停在 `Identifier` 上（`Import` 那边也一样，属于既有行为）。

装的是**精简队列**（只有 `KeywordCloseRule` + `WrapSymbolCloseRule`，
见 `../parse-pipeline.xl.md` 的 `InitialKeywordCloseRuleQueue`）。

**试过换成通用队列、退回来了**：通用队列能顺带把 `export default (a: number) => a` 里的箭头
收成 `Lamda`，但同时弄坏了十来条既有用例（`ex-named` / `ex-default-class` / `ex-reexport` /
`ex-type-from` / `am-declare-module-css` …）——`Export` 的内容是「导出列表 / 目标模块」，
不该再跑一遍表达式与语句规则。`export =` / `export default` 改成**只收前缀两个词**（见 `Process`），
表达式留在外面照常成形。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## field From:string | null = null

导出目标模块的路径；本地导出（`export { a }`）为 `null`。

与 `Import.From` 同一个含义，加载依赖文件时用它。

## field typeOnly:boolean = false

`export type { … }` 的 type-only 导出。

判据与 `Import.typeOnly` 同款：收集到的第一个单元就是内容为 `type` 的 `Identifier`。
那个 `type` 词**不进产物**（第 56 轮修的）——它已经由 `typeOnly="true"` 表达，
再以一个 `<Identifier>type</Identifier>` 留在 `Export` 里是纯冗余。

## field namespace:string = ""

`export * as ns from "m"` 里的那个 `ns`（具名转发）。

## field exported:Array<string> = []

导出列表里每一项的**对外名**（`export { a as b, c }` → `b,c`）。

取法与 `Import.imported` 对称、但取的是**最后一个** `Identifier`：`a as b` 对外是 `b`，
`c` 对外是 `c`，`type D` 对外是 `D`。空列表表示这条语句没有花括号列表。

**为什么这些属性值得加**：与 `Import` 那边是同一个问题——原来 `Export` 只带 `From`，
而且 `From` **没有进 XML**（`Export` 没有覆写 `ToXmlString`）。`import { a as b }` 与
`export { a as b }` 在产物里长得一样、下游分不出方向与别名。

## method ReadClause:(items:Array<Token>)=>void

从收集到的单元里读出 `typeOnly` / `namespace` / `exported`。

与 `Import.ReadClause` 对称，差别只在「取最后一个是**对外**名」这件事上（导入取本地名）。

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
for (const item of items) {
  if (!(item instanceof Bracket) || item.startBracket !== "{") {
    continue;
  }
  const names: string[] = [];
  let lastCommon: Identifier | null = null;
  for (const child of item.Data) {
    if (child instanceof Identifier) {
      lastCommon = child;
      continue;
    }
    if (child instanceof SymbolToken && child.Is(",")) {
      if (lastCommon !== null) {
        names.push(lastCommon.TempToString());
        lastCommon = null;
      }
    }
  }
  if (lastCommon !== null) {
    names.push(lastCommon.TempToString());
  }
  this.exported = names;
  return;
}
```

## method NameField:()=>string | undefined

**这一格自己的名字**（第 1006 轮）：名字就在本页的 `namespace` 字段上，所以由这一页回答——
投影那一层过去拿一张「哪些页把名字叫什么」的字符串名单逐个试
（`owner["name"]` / `owner["fieldName"]` / `owner["namespace"]`），现在只问这一格
（见 `typescript/print-ast-common.xl.md` 的 `tokenNameOf`）。

基类那一格答 `undefined`＝「名字不在字段上」（见 `core/syntax/token.xl.md`）。

```ts
return this.namespace === "" ? undefined : this.namespace;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `From` / `typeOnly` / `namespace` / `exported`。

`From` 过一遍 `CommonUtil.XmlDecode`（路径里可能有 `&`），`typeOnly` 写成 `true` / `false`。

```ts
const name = this.constructor.name;
let body = "";
for (const item of this.Data) {
  body = body + item.ToXmlString();
}
const from = this.From === null ? "" : CommonUtil.XmlDecode(this.From);
const isTypeOnly = this.typeOnly ? "true" : "false";
return `<${name} range="${this.RangeOf()}" From="${from}" typeOnly="${isTypeOnly}" namespace="${this.namespace}" exported="${this.exported.join(",")}">${body}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `From` / `typeOnly` / `namespace` / `exported` 四个字段，外加子单元。

键名与 `ToXmlString` 开标签上的四个属性同名、值同源：
`From` 的兜底照抄 XML 那处——`this.From === null` 时写空字符串，否则写字段本身
（XML 那次 `CommonUtil.XmlDecode` 只是属性转义，JSON 不需要）；
`typeOnly` 是 `bool`，这里写真布尔，而不是 XML 属性里插值出来的 `"true"` / `"false"` 文本；
`exported` 是 `Array<string>`，按 `join(",")` 拼成字符串。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.Tag());
const from = this.From === null ? "" : this.From;
result.set("From", from);
result.set("typeOnly", this.typeOnly);
result.set("namespace", this.namespace);
result.set("exported", this.exported.join(","));
if (this.Data.length !== 0) {

  result.set("children", this.children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new Export(this.Template);
result.Sign(this);
result.From = this.From;
result.typeOnly = this.typeOnly;
result.namespace = this.namespace;
result.exported = this.exported.slice();
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
