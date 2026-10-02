# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol, SkipNextWrapSymbol, SkipPreviousWrapSymbol, IsTypeBracketPosition, IsTemplateTypeContent } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { Identifier } from "./identifier.xl.md"
import { IsDeclarationBoundary, IsStatementKeyword } from "./declaration-common.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Statement } from "./statement.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**联合类型与交叉类型**：把类型位的 `A | B | C` 收成一个 `UnionType`、`A & B & C` 收成一个
`IntersectionType`（真实语料 8461 + 206 处）。

第 58 轮之前它们**没有节点**：产物里就是散的 `Identifier` / `SymbolToken`，
`A | B` 与「三个互不相干的单元」在树里长得一样（`cases:align` 一直把它当口径登记着）。

**一条规则管两个运算符**，优先级靠**收进去的那一段再跑一趟**表达——`&` 比 `|` 紧：

- 收集 `|` 时允许穿过 `&`（`A | B & C` 先整段收成 `UnionType`，它内部的 `&` 再由
  这个 `UnionType` 自己的那一趟折成 `IntersectionType` ✓ 得到 `A | (B & C)`）；
- 收集 `&` 时**遇到 `|` 就停**（`A & B | C` 先收成 `IntersectionType(A & B)`，
  外层再收成 `UnionType(A & B | C)` ✓ 得到 `(A & B) | C`）。

两个节点都挂**类型队列**（`ParsePipeline.InitialKeywordReorganizationQueue`）：收进去的那一段
会再跑一趟这条规则（内层的紧运算符就是这样成形的），队列里的 `KeywordReorganization`
顺带把 `keyof` / `typeof` / `readonly` 升级成 `Keyword`。

规则本身**同时注册进通用队列与类型队列**：类型文本有的装在 `TypeDefine` / `TypeAssign` 里
（它们是类型队列），有的直接挂在 `GenericType` / `ReturnType` 的列表上（那是通用队列）。

`TypeUnionReorganization` 写在 `UnionType` / `IntersectionType` **之前**，与同目录其它 token 一致。

# class TypeUnionReorganization extends Reorganization

## static readonly field Instance:TypeUnionReorganization = new TypeUnionReorganization()

唯一的实例，注册进两张队列时用。

## private method IsTypeContainer:(parent:Token | null)=>bool

父单元是不是一个**装类型文本**的容器。

通用队列里这条规则会看到语句列表（值位的 `a | b` 就在那儿），所以必须问一句
「我是不是在类型里」。用**白名单**而不是「不是语句就算类型」：值位那些算符节点
（`BinaryOperator` / `UnaryOperator`）的内容也是值，黑名单式判据会把它们一并放进来。

名单里那些类型节点用**类名**判定：本文件 import 它们会绕出更深的环
（与 `statement.xl.md` 里 `Let` 那条同一个理由）。

```ts
if (parent === null) {
  return false;
}
if (IsTemplateTypeContent(parent)) {
  // **模板字面量类型里的联合 / 交叉**：插值段的内容是类型文本。
  // 判据与 `text-common-util.xl.md` 的 `IsTypeContainerUnit` 共用同一个函数
  // （问的是外层那个 `String` 在它自己那一格前面是什么），不各写一份近似。
  return true;
}
const name = parent.constructor.name;
return (
  name === "TypeDefine" ||
  name === "TypeAssign" ||
  name === "GenericType" ||
  name === "ReturnType" ||
  name === "Signature" ||
  name === "FunctionType" ||
  name === "ConditionalType" ||
  name === "UnionType" ||
  name === "IntersectionType" ||
  name === "TypeLiteral" ||
  name === "TypeLiteralBody" ||
  name === "ArrayLiteral" ||
  name === "ArrayType" ||
  name === "TupleType" ||
  name === "IndexedAccessType" ||
  name === "MappedType" ||
  name === "TypeParameter" ||
  name === "InferType" ||
  name === "As" ||
  name === "Satisfies"
);
```

**`TypeParameter` / `InferType` 是第 66 轮（第二轮）补的**：参数表收成 `TypeParameter` 之后，
**约束本身就在它里面**——`interface ChildProcessByStdio<I extends null | Writable, …>` 的
`null | Writable`、`{ [Key in string & {} | symbol]: … }` 的 `string & {} | symbol`
都要在这里成形；`infer U extends A | B` 的约束在 `InferType > TypeParameter` 里，同样靠它。
少了这两个名字，实测 `UnionType` 会从 1 处涨到 52 处、`IntersectionType` 从 1 处涨到 3 处
（全是这两族的约束）。

**`ArrayType` / `TupleType` / `IndexedAccessType` / `MappedType` 是第 66 轮补的**：
方括号那三个节点由 `type-bracket.xl.md` 造出来之后，它们自己挂的正是这张类型队列——
`T[] | U` 里的联合、`[A | B]` 里元素类型的联合、`T[K | L]` 里下标的联合都要在这里成形。
少了这四个名字，那些联合会退回散单元（`A | B` 与「三个互不相干的单元」在树里长得一样）。

## private method IsTypeContext:(parent:Token | null)=>bool

父单元链上是不是一个**类型上下文**：直接父单元是类型容器就成立；
父单元是**括号**时再看两层——**括号自己那一格**（`IsTypeParen`）与**括号的父单元**。

**为什么括号那一格要按前文判**：括号的内容是在**括号关闭那一刻**重组的，那时外层的
`Statement` / `TypeDefine` 还没成形（实测插桩：`let x: (A | B) & C` 里那个 `|` 被问到时
`parent=Bracket grand=Root`），所以「往上找类型容器」这条路在这一刻是断的——
只能看括号**在它自己那一层**前面是什么（`:` / `?:` / `|` / `&` / `=>` ⇒ 类型位；
`=` 再往左找 `type` 还是 `let` / `const` / `var`）。这一段与 `lamda.xl.md` 的
`IsWrappedByTypeContext` 同源。

**为什么这次不会误判 `for (…)`**：那里括号前面是 `for` 这个名字（不是符号），
一次就判值位——第 57 轮退回来的那次是**跨好几格扫文本**，两者不是一回事。

```ts
let node = parent;
for (let hop = 0; hop < 5 && node !== null; hop++) {
  if (this.IsTypeContainer(node)) {
    return true;
  }
  const name = node.constructor.name;
  if (!(node instanceof Bracket)) {
    return false;
  }
  const owner = node.Parent;
  if (owner !== null && this.IsTypeParen(node, owner)) {
    return true;
  }
  node = node.Parent;
}
return false;
```

## private method IsTypeParen:(bracket:Bracket, owner:Token)=>bool

括号**在它自己那一层**是不是类型位——判定逻辑在
`../text-common-util.xl.md` 的 `IsTypeBracketPosition`（`generic-type.xl.md` 也要用同一个答案，
不能各写一份近似）。

```ts
return IsTypeBracketPosition(owner, bracket);
```

## private method IsTypeOperand:(item:Token | null)=>bool

这个单元能不能当类型运算的操作数。

类型文本里的操作数**不是符号**（`Identifier` / `Keyword` / 字符串字面量类型 /
已经成形的类型节点……），再放行几个「粘在操作数上的」符号：
`.` / `?.` / `!`（限定名与非空断言）、`-` / `+`（**负数 / 正数字面量类型**，
`-1 | 0 | 1` 在 TS 的 AST 里是字面量类型里的 `PrefixUnaryExpression`）。
软换行不算内容，也不划边界。

**`in` 是唯一的例外**：`{ [K in T]: X }` 里它是**映射类型的标记**，不是联合的操作数。软换行不算内容，也不划边界。

```ts
if (item === null) {
  return false;
}
if (item instanceof Identifier && item.Is("in")) {
  // **映射类型的 `in` 标记不是操作数**：`{ [K in "a" | "b"]: X }` 里它属于 `[K in …]` 的语法，
  // 让联合把它当操作数吞进去的话，`[` 括号里就只剩一个 UnionType、
  // 映射类型的判定（`type-literal.xl.md` 的 `IsMappedTypeBrace`）再也找不到标记（实测）。
  return false;
}
if (item instanceof SymbolToken) {
  const text = item.TempToString();
  return text === "." || text === "?." || text === "!" || text === "-" || text === "+";
}
return !(item instanceof LineWrap);
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是类型位的 `|` / `&`。

三条：`index` 处是这两个符号之一；父单元链上是类型上下文（`IsTypeContext`——
所以**括号类型**里的联合 / 交叉也认得出来）；
右边的单元是类型操作数，**左边**要么是类型操作数、要么是类型位的边界（前导 `|` 那种写法）。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken)) {
  return false;
}
const operator = current.TempToString();
if (operator !== "|" && operator !== "&") {
  return false;
}
if (this.IsTypeContext(current.Parent) === false) {
  return false;
}
const beforeIndex = SkipPreviousWrapSymbol(units, index);
const before = Get(units, beforeIndex);
if (this.IsTypeOperand(before) === false) {
  // **前导 `|`**：`type X =\n | A\n | B` / `m(): | A`——左边是类型位的边界（`=` / `:` / `,` /
  // 列表开头）。TypeScript 也把它们读成一个联合（成员从 `|` 后面开始），
  // 挡掉的话那个 `|` 会孤零零地留在产物里，后面的成员也没有节点。
  const isTypeBoundary =
    beforeIndex < 0 ||
    (before instanceof SymbolToken && (before.Is("=") || before.Is(":") || before.Is("?:")));
  if (isTypeBoundary === false) {
    return false;
  }
}
return this.IsTypeOperand(Get(units, SkipNextWrapSymbol(units, index)));
```

## private method IsConditionalAhead:(units:Array<Token>, index:int)=>bool

`index`（一个 `|` / `&`）右边**同一段里**是不是还有一个 `?`——有就说明这一段是
**条件类型里 `extends` 的右侧**，收集时**不能跨过那个 `extends`**。

第 123 轮修。根因：收集是从运算符往两边走「类型操作数」的，而 `extends` 在产物里是
`Identifier` / `Keyword`，**也是**类型操作数——于是一路吃到 `extends` 左边去：

    type X = A extends B | C ? D : E;
    → UnionType[«A extends B | C»]                        ✗
    TS：ConditionalType[«A extends B | C ? D : E»] > UnionType[«B | C»]

而 `UnionType` 是**不透明单元**，条件类型规则回扫 `extends` 时撞上它就再也找不到
（`FindExtendsIndex` 的 if 链里没有它），整条条件类型一个节点都出不来——实测
`lib.es5.d.ts` 的 `Awaited` 那一屏、`typescript.d.ts` 的二十多条全挂在这里。

**只看 `?`、不看有没有 `extends`**：`?` 在类型位只可能来自条件类型（可选元组成员的
`A?` 也在类型容器里，但它右边不会跟一个 `|`）。**同一段**的边界是 `,` / `;` / `=`——
`<T extends A | B, U = X ? Y : Z>` 里那个 `|` 的 `?` 在后一个类型参数上，不是它的。

```ts
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === "?") {
      return true;
    }
    if (text === "," || text === ";" || text === "=") {
      return false;
    }
  }
}
return false;
```

## private method IsExtendsWord:(item:Token | null)=>bool

`item` 是不是那个 `extends` 词。

**词法身份不固定**：`<T extends U>` 里它升成了 `Keyword`，而接口 / 条件类型那几处
一直是 `Identifier`（本仓库记过「接口的 `extends` 永远升不成 `Keyword`」）。
`Identifier` 与 `Keyword` **没有共同的取文本方法**（`Identifier` 有 `Is` / `TempToString`，
`Keyword` 只有 `Value`），所以必须分两支写——写成一支会在运行期抛
`item.TempToString is not a function`（`ternary-operator.xl.md` 记过同一个坑）。

```ts
if (item instanceof Identifier) {
  return item.Is("extends");
}
if (item !== null && item.constructor.name === "Keyword") {
  return (item as any).Value === "extends";
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「同族的类型运算」整段收成一个 `UnionType`（`|`）或 `IntersectionType`（`&`），
**返回新的下标**。

- 起点：从运算符往左走，只要单元是类型操作数、或者**同族运算符**就继续；遇到别的符号
  （`=` / `:` / `,` / `;` / `?` / `(` …）就停。「同族」= 同一个运算符，
  外加「收集 `|` 时的 `&`」（`&` 更紧、属于联合的某个操作数）；
  **收集 `&` 时不认 `|`**（`|` 更松，那一段该由外层收）。
  少了这一条区分，`A | B & C` 里的 `&` 会把左边界一路拉到 `|` 左边、
  于是触发下面那条「整段重包」的守卫，内层就折不出来了（实测）。
- 终点：往右走同样的规则；**收集 `&` 时遇到 `|` 要停**（`|` 松、`&` 紧，让外层那一趟去收联合）；
  `.` / `?.` / `!` 与左边一样算「粘在名字上」，不划边界
  （少了这一条，`ArrayBuffer | NodeJS.TypedArray` 会在第一个点号处断掉）。
- 换行不进子单元，但**换行处要是语句 / 声明边界就收工**——否则一条多行联合会把下一行整条声明吞进来
  （`function-type.xl.md` 踩过同一个坑）。
- **已经在一个类型运算节点里、而且这一段就是它的全部内容 ⇒ 不许再包一层**：
  本节点挂的是类型队列（队列里有这条规则），收进去的那一段会再跑一趟；
  `A | B` 收成 `UnionType` 之后，那一趟又会在同一段上看到同一个 `|`——
  不挡就是**无限递归**（实测 `RangeError: Maximum call stack size exceeded`）。
  判据是「起点在本层第 0 格、终点之后只剩软换行」：`A | B & C` 里的内层 `&`
  只覆盖第 2–4 格，不属于这一条，照常折成 `IntersectionType` ✓。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
if (!(current instanceof SymbolToken)) {
  throw new Error("类型运算不满足格式要求：| 或 &");
}
const operator = current.TempToString();
// **这一段是不是条件类型里 `extends` 的右侧**（见 `IsConditionalAhead`）：是的话
// `extends` 就是收集的硬边界，左右两边都不能跨过去。
const conditionalAhead = this.IsConditionalAhead(units, index);
let startIndex = index;
let scan = SkipPreviousWrapSymbol(units, index);
while (scan >= 0) {
  const item = Get(units, scan);
  if (conditionalAhead && this.IsExtendsWord(item)) {
    break;
  }
  const sameFamily = item instanceof SymbolToken && (item.Is(operator) || (operator === "|" && item.Is("&")));
  if (this.IsTypeOperand(item) || sameFamily) {
    startIndex = scan;
    scan = SkipPreviousWrapSymbol(units, scan);
    continue;
  }
  break;
}
let endIndex = index;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    break;
  }
  if (conditionalAhead && this.IsExtendsWord(item)) {
    break;
  }
  if (item instanceof LineWrap) {
    const next = GetSkipNextWrapSymbol(units, i);
    if (next === null || IsStatementKeyword(next) || IsDeclarationBoundary(next) || Statement.IsLineBreakBoundary(units, i)) {
      break;
    }
    continue;
  }
  if (item instanceof SymbolToken) {
    if (item.Is("|") && operator === "|") {
      endIndex = i;
      continue;
    }
    if (item.Is("&")) {
      endIndex = i;
      continue;
    }
    if (this.IsTypeOperand(item)) {
      // `.` / `?.` / `!`：限定名是**一个**操作数（`ArrayBuffer | NodeJS.TypedArray`）——
      // 右扫漏了这一条，节点会在第一个点号处断掉，`TypedArray` 留在外面（实测）。
      endIndex = i;
      continue;
    }
    break;
  }
  endIndex = i;
}
const parentName = current.Parent === null ? "" : current.Parent.constructor.name;
let trailingOnlyWraps = true;
for (let i = endIndex + 1; i < units.length; i++) {
  if (!(Get(units, i) instanceof LineWrap)) {
    trailingOnlyWraps = false;
    break;
  }
}
if ((parentName === "UnionType" || parentName === "IntersectionType") && startIndex === 0 && trailingOnlyWraps) {
  return index;
}
const result = operator === "|" ? new UnionType(template) : new IntersectionType(template);
result.Parent = current.Parent;
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
for (let i = startIndex; i <= endIndex; i++) {
  const item = Get(units, i);
  if (item !== null && !(item instanceof LineWrap)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class UnionType extends IndependentToken

联合类型（`A | B`）。类名必须与产物的标签名一致。

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（内层的 `&` 在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method PrintAst:(ctx:any, v:any)=>any

**这一格是它自己出的**（第 77 轮）：`A | B` 在 TS 那边就是 `UnionType`，成员是 `types`；
切分规则由 `parentKind` 选（`|` 那一档，见 `typescript/ts-ast.xl.md` 的 `TYPE_MEMBER_SEPARATORS`）——
所以「`|` 是成员分隔符」这件事跟着这条规则待在同一个文件里。

```ts
return ctx.Node("UnionType", { types: ctx.Each(v, "UnionType") }, v);
```

## method Clone:()=>Token

克隆自身（`Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`）。

```ts
const result = new UnionType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class IntersectionType extends IndependentToken

交叉类型（`A & B`）。类名必须与产物的标签名一致。

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（更内层的运算在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method PrintAst:(ctx:any, v:any)=>any

**这一格是它自己出的**（第 77 轮）：`A & B` 在 TS 那边是 `IntersectionType`，成员是 `types`；
`&` 比 `|` 紧，所以切分按 `&` 那一档（`TYPE_MEMBER_SEPARATORS`）。

```ts
return ctx.Node("IntersectionType", { types: ctx.Each(v, "IntersectionType") }, v);
```

## method Clone:()=>Token

克隆自身（`Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`）。

```ts
const result = new IntersectionType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
