# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextTrivia } from "../text-common-util.xl.md"
import { CommonUtil } from "../../core/common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**命名空间导出声明**：把 `export as namespace Foo;` 收成一个 `NamespaceExport` 单元
（TS 那边叫 `NamespaceExportDeclaration`）。

第 56 轮之前它**没有专属节点**：产物是 `<Keyword>export</Keyword>` + `<As>namespace Foo</As>`
——`as` 那条规则（类型转换 `as`）顺手把 `namespace Foo` 收走了，于是
「这是一个 UMD 全局名声明」这件事在产物里看不出来。

判据是**四个词连排**：`export` / `as` / `namespace` / 名字——四条都要对得上才接手，
所以不会误伤 `export { a as b }`（那个 `as` 前面不是 `export`）与类型转换 `x as namespace`。

`NamespaceExportCloseRule` 排在 `AsCloseRule` **之前**：不先认领的话，
`as` 那一条会先把 `namespace Foo` 收成 `As`。

# class NamespaceExportCloseRule extends CloseRule

## static readonly field Instance:NamespaceExportCloseRule = new NamespaceExportCloseRule()

唯一的实例，注册进通用规则队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `export as namespace <名字>` 的起点。

四段判定都跳 **trivia**（第 869 轮）：软换行与**注释**都算——
`export /* c */ as namespace Foo;` 是合法排法，只跳软换行时挨着 `export` 的那条注释会被当成第二格
⇒ 判定为否 ⇒ 四个词退回散单元（实测产品里多出 `AsExpression` / `ExpressionStatement` 一族，
缺 `NamespaceExportDeclaration` 与名字）。判据走 `SkipNextTrivia`——它是「下一个实义单元」的统一口径，
与 `export` / `import` 那两处同一做法。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || current.Is("export") === false) {
  return false;
}
const asIndex = SkipNextTrivia(units, index);
const asUnit = Get(units, asIndex);
if (!(asUnit instanceof Identifier) || asUnit.Is("as") === false) {
  return false;
}
const namespaceIndex = SkipNextTrivia(units, asIndex);
const namespaceUnit = Get(units, namespaceIndex);
if (!(namespaceUnit instanceof Identifier) || namespaceUnit.Is("namespace") === false) {
  return false;
}
const nameIndex = SkipNextTrivia(units, namespaceIndex);
const nameUnit = Get(units, nameIndex);
return nameUnit instanceof Identifier;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把四个单元收成一个 `NamespaceExport`，**返回新的下标**。

名字进 `name` 属性，四个词本身不再留在树里（与 `Label` / `Let` 同一做法：内容全进属性）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const asIndex = SkipNextTrivia(units, index);
const namespaceIndex = SkipNextTrivia(units, asIndex);
const nameIndex = SkipNextTrivia(units, namespaceIndex);
const nameUnit = Get(units, nameIndex);
if (!(nameUnit instanceof Identifier)) {
  throw new Error("命名空间导出不满足格式要求：export as namespace <名字>");
}
const result = new NamespaceExport(template);
result.Parent = current.Parent;
result.name = nameUnit.TempToString();
// **名字的位置当场记进字段**（见 `NameStart`）：四个词里只有名字要位置，
// 而它就在手上——投影直读，不再回原文 `indexOf("Foo")` 猜（注释里的同名标识符会先被找到）。
result.NameStart = nameUnit.SourceRange.Start!.Index;
result.NameEnd = nameUnit.SourceRange.End!.Index;
result.SignIn(current.SourceRange.Start!);
// **右端要把尾分号算上**（第 572 轮，与第 569 轮 `do-while` 那一处同一条口径）：
// `;` 是语句终结符 —— `Statement.FormFrom` 把它**切进壳体的区间**却不放进 `Data`
// ⇒ 这里只看得到名字那一格 ⇒ 右端比 TS 少一格
//（实测 `export as namespace N;`：产物 `NamespaceExportDeclaration [76,97)`
//  vs TS `[76,98)` —— 单看就是「漂移 1 + 多出 1」）。
// **只在名字是列表最后一格时才借宿主的右端**：宿主是 `Statement` 时它比名字多出来的那一格
// 就是那个 `;`；列表后面还有东西时不能借（那说明 `;` 之外还有内容），
// 别的宿主（`Root` / 各种体）的右端是**整个容器**的末尾，照借会一路拉到文件尾。
let end = nameUnit.SourceRange.End!;
const owner = current.Parent;
const ownerEnd = owner !== null && owner.constructor.name === "Statement" ? owner.SourceRange.End : null;
if (ownerEnd !== null && nameIndex === units.length - 1 && ownerEnd.Index > end.Index) {
  end = ownerEnd;
}
result.SignOut(end);
result.TryToClose();
return ReplaceCountAt(units, index, nameIndex - index + 1, result);
```

# class NamespaceExport extends IndependentToken

命名空间导出声明（`export as namespace Foo;`）。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## field name:string = ""

被导出的全局名（`export as namespace Foo` → `Foo`）。

## field NameStart:int = -1

**名字那一格的下标**（闭区间）。四个词本身不进 `Data`，位置只有认下这一趟知道——
投影的 `synthName` 直读它，不再回原文 `indexOf(名字)` 找。

## field NameEnd:int = -1

与 `NameStart` 同进退的终点（闭区间下标）。

## method ToXmlString:()=>string

产出**自闭合**标签：`<NamespaceExport name="Foo" nameStart=… nameEnd=… />`。

自闭合与 `Label` / `Let` / `LineWrap` 同款：内容全进了属性，没有子单元。

属性值过一遍 `CommonUtil.XmlDecode`（与 `Import` / `Export` 的 `From` 同一口径）。

**`nameStart` / `nameEnd` 也印**（第 987 轮五）：`ToDictionary` 一直在写这两个键、投影也一直在读
（「投影直读，不再回原文 `indexOf` 猜」），而 XML 从前没印。条件是**逐字照抄** JSON 那侧的那一条
（`NameStart >= 0 && NameEnd >= NameStart`）——两处各写一个条件就是两份口径。

```ts
const name = this.constructor.name;
const nameSpan =
  this.NameStart >= 0 && this.NameEnd >= this.NameStart
    ? ` nameStart="${this.NameStart}" nameEnd="${this.NameEnd}"`
    : "";
return `<${name} range="${this.RangeOf()}" name="${CommonUtil.XmlDecode(this.name)}"${nameSpan} />`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name`。

键名与 `ToXmlString` 的属性同名、值同源。
`NamespaceExport` **没有子单元**（XML 是自闭合的 `<NamespaceExport name="Foo" />`，四个词全进了属性），
所以这里也**不写 `children`**：空节点在 JSON 里只留 `type`。
XML 那次 `CommonUtil.XmlDecode` 是属性转义，JSON 的字符串不需要，所以直接写字段。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.name);
// **名字的位置**（见 `NameStart` / `NameEnd`）：投影直读，不再回原文 `indexOf` 猜。
if (this.NameStart >= 0 && this.NameEnd >= this.NameStart) {
  result.set("nameStart", this.NameStart);
  result.set("nameEnd", this.NameEnd);
}
return result;
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new NamespaceExport(this.Template);
result.Sign(this);
result.name = this.name;
result.NameStart = this.NameStart;
result.NameEnd = this.NameEnd;
result.TryToClose();
return result;
```
