# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol, WordText, IsTypeContainerUnit } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Method } from "./method.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**导入类型**：类型位的 `import("./m")` / `import("./m").A.B` / `typeof import("./m")` 收成一个 `ImportType`。

第 66 轮之前它是**借调用节点**的：`MethodReorganization` 把 `import("m")` 按「名字 + 括号」收成
`<Method name="import">`，外层再被类型运算符那条规则套一个 `<TypeQuery>`。**TypeScript 那边不是这样**：

```
const WebSocket: typeof import("undici-types").WebSocket;
```

TS 6 把整段收成**一个** `ImportType` 节点（`typeof` 是它身上的 `isTypeOf` 标志，限定名 `.WebSocket`
也是它的一部分），**没有** `TypeQuery`。于是产物与 AST 两边对不上：
`cases:align` 的 `TypeQuery in TypeDefine` 117 处 / `TypeQuery in ConditionalType` 17 处 /
`TypeQuery in IntersectionType` 6 处 / `TypeQuery in As` 2 处 / `TypeQuery in TypeAssign` 2 处，
全部是「我们多套了一层 TypeQuery、而 TS 那边只有一个 ImportType」。

**只认类型位**：值位的 `await import("./m")` 是**真的动态调用**（TS 那边是 `CallExpression`），
那里的 `<Method name="import">` 必须留着——所以本规则与方括号 / 类型运算符那三条一样，
第一道闸是 `IsTypeContainerUnit`。

规则排在类型队列的**最前面**：`typeof` 要先被它吸收，否则类型运算符那一趟会先把
`typeof X` 收成 `TypeQuery`，导入类型就只能拿到半截。

# class ImportTypeReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:ImportTypeReorganization = new ImportTypeReorganization()

唯一的实例。

## private method IsImportStartAt:(units:Array<Token>, index:int)=>bool

`index` 处是不是导入类型的开头。**两种来路都要认**：

1. 已经收成调用的 `<Method name="import">`（类型位上 `MethodReorganization` 会先把它收掉）；
2. **还是裸的** `import` 标识符 + `(` 括号——**类型实参段里没有调用规则**
   （`MethodReorganization` 明确挡掉 `GenericType` 父单元，那是为了防止
   `<T extends (a: any) => any>` 被当成调用），于是
   `Pick<typeof import("assert"), AssertMethodNames>` 里的 `import("assert")`
   到不了第 1 种形态（实测 `@types/node/test.d.ts:1437` 1 处）。

判定用**字段**（`Method.name === "import"`）或**词 + 括号**，不按括号里的文本。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (current.constructor.name === "Method") {
  return (current as any).name === "import";
}
if (!(current instanceof Identifier) || current.Is("import") === false) {
  return false;
}
const next = Get(units, SkipNextWrapSymbol(units, index));
if (!(next instanceof Bracket)) {
  return false;
}
return next.startBracket === "(";
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一次导入类型的重组起点。

三条：是导入类型的开头（见 `IsImportStartAt`）；**容器**是纯类型容器；不是成员开头。

**`typeof` 由本规则一起吸收**：`Process` 会往左看一格，如果是 `typeof` 就把它也收进来
（TS 那边 `ImportType` 自带 `isTypeOf`）。所以这里不需要为 `typeof` 加判定。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (this.IsImportStartAt(units, index) === false) {
  return false;
}
if (IsTypeContainerUnit(current.Parent) === false) {
  return false;
}
return true;
```

## private method IsNameTailAt:(units:Array<Token>, index:int)=>bool

`index` 处是不是限定名的一节（`.` + 标识符）。

`import("m").A.B` 的 `.A` / `.B` 都属于导入类型（TS 把它们收在 `ImportType` 里），
所以这一节要一起搬进去。

```ts
const dot = Get(units, index);
if (!(dot instanceof SymbolToken) || dot.Is(".") === false) {
  return false;
}
return Get(units, SkipNextWrapSymbol(units, index)) instanceof Identifier;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `import("m")`（连同左边的 `typeof`、右边的限定名尾巴）收成一个 `ImportType`，**返回新的下标**。

范围两头按「实际收进来的单元」给：左边有 `typeof` 就从它起，否则从 `import` 起；
右边一路吃到最后一个限定名。

**`Replace` 之前不许先 `Add`**（`type-bracket.xl.md` 记过这个坑）：`Token.Replace` 读的是
`this.Parent.Data`，先 `AddAndCloseLast` 会把 `Parent` 改成新节点。
这里两头都可能动，所以统一用 `ReplaceCountAt`（它只做 `splice`，不看 `Parent`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("ImportTypeReorganization.Process: current is null");
}
let startIndex = index;
const previousIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, previousIndex);
if (previous !== null && (previous instanceof Identifier || previous.constructor.name === "Keyword")) {
  if (WordText(previous) === "typeof") {
    startIndex = previousIndex;
  }
}
let endIndex = index;
let cursor = SkipNextWrapSymbol(units, index);
const nextUnit = Get(units, cursor);
if (nextUnit instanceof Bracket && nextUnit.startBracket === "(") {
  // 裸形状（类型实参段里的 `import("m")`）：括号还没被收进调用节点，要一起搬进来。
  endIndex = cursor;
  cursor = SkipNextWrapSymbol(units, endIndex);
}
while (this.IsNameTailAt(units, cursor)) {
  endIndex = SkipNextWrapSymbol(units, cursor);
  cursor = SkipNextWrapSymbol(units, endIndex);
}
const result = new ImportType(current.Template);
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
for (let i = startIndex; i <= endIndex; i++) {
  const item = Get(units, i);
  if (item !== null) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class ImportType extends IndependentToken

导入类型（`import("./m")` / `import("./m").A.B` / `typeof import("./m")`）。类名必须与产物的标签名一致。

内容直接装在自己身上：可选的 `typeof`、那个 `import(...)` 调用形状、以及限定名的尾巴。
**与值位的动态 `import()` 的区别只在容器**：值位的它仍是 `<Method name="import">`。

## constructor:(template:Template)=>void

转调基类构造器，并挂上**类型队列**——为了让里面那个 `typeof` 升级成 `Keyword`
（类型位的关键词口径，见 `keyword.xl.md`）。

**不会重复包装**：本节点的类名不在 `IsTypeContainerUnit` 的白名单里，
所以类型队列那一趟再看到里面那个 `Method(name="import")` 时，父亲判据给否 ✓。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new ImportType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
