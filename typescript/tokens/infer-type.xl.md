# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, WordText, IsTypeContainerUnit } from "../text-common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { TypeParameter } from "./type-parameter.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**推断类型**：条件类型里的 `infer X` / `infer X extends Y` 收成一个 `InferType`。

TypeScript 那边它是**两层**：`InferType > TypeParameter > Identifier X (+ TypeOperator …)`——
`infer` 后面的那个名字（以及可选的 `extends` 约束）就是**类型参数**，只是没有名字列表的括号。
本工程原来把这段留成散单元（`<Keyword>infer</Keyword><Identifier>U</Identifier>`），
于是 `cases:align` 的 `TypeParameter` 一直缺 **86 处**（全是 `infer` 里的那个）。

规则排在**类型队列与通用队列两个地方**：`infer` 常见于条件类型（通用队列的地盘），
也常见于**函数类型的形参**（`T extends (a: infer U) => any ? U : never`）——
那里它的父单元是 `TypeDefine`，只有类型队列才跑得到（实测少了这一条这一族不成形）。

# class InferTypeReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:InferTypeReorganization = new InferTypeReorganization()

唯一的实例。

## private method IsInferWord:(item:Token | null)=>bool

这个单元是不是 `infer` 那个词。

**两种形态都要认**：类型队列里 `KeywordReorganization` 排在最后，所以此刻它可能是
还没升级的 `Identifier`；通用队列里它可能已经被升级成 `Keyword`（那一趟跑过）。
`WordText` 对两种都给文本 ✓。

```ts
if (item === null) {
  return false;
}
if (item instanceof Identifier) {
  return item.Is("infer");
}
if (item.constructor.name === "Keyword") {
  return WordText(item) === "infer";
}
return false;
```

## private method IsConstraintStop:(item:Token)=>bool

约束段的终点：顶层遇到这些就把 `infer` 收在它们前面。

`?` / `:` 是**条件类型**的边界（`T extends infer U extends string ? U : never`），
`;` / `,` / `=` / `)` / `]` / `>` 是语句、实参、形参与泛型段的边界。
`|` / `&` **不是**终点：`infer U extends A | B` 的约束就是那个联合 ✓。

```ts
if (item instanceof SymbolToken) {
  const text = item.TempToString();
  return (
    text === "?" ||
    text === ":" ||
    text === ";" ||
    text === "," ||
    text === "=" ||
    text === "=>" ||
    text === ")" ||
    text === "]" ||
    text === ">"
  );
}
return false;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个 `infer` 的开头。

三条：是 `infer` 这个词；**容器**是纯类型容器（`TypeDefine` / `TypeAssign` / `TypeParameter` /
`GenericType` / `TypeOperator` … 都在白名单里）；后面（跳软换行）紧跟一个 `Identifier` 名字
——`infer` 后面没有名字就不是推断类型（`infer` 也可能只是别处的标识符）。

```ts
const current = Get(units, index);
if (this.IsInferWord(current) === false) {
  return false;
}
if (current === null || IsTypeContainerUnit(current.Parent) === false) {
  return false;
}
return Get(units, SkipNextWrapSymbol(units, index)) instanceof Identifier;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `infer X` / `infer X extends Y` 收成一个 `InferType`（里面配一个 `TypeParameter`），
**返回新的下标**。

两层一起造：`InferType > TypeParameter > (X extends Y)`。外层收 `infer` 与内层，
内层收名字与约束——与 TS 的形状一对一 ✓。

**`Replace` 之前不许先 `Add`**（`type-bracket.xl.md` 记过这个坑）：`Token.Replace` 读的是
`this.Parent.Data`，先 `AddAndCloseLast` 会把 `Parent` 改成新节点。
这里两头都可能动，所以统一用 `ReplaceCountAt`（只做 `splice`、不看 `Parent`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("InferTypeReorganization.Process: current is null");
}
const nameIndex = SkipNextWrapSymbol(units, index);
const name = Get(units, nameIndex);
if (name === null) {
  throw new Error("InferTypeReorganization.Process: name is null");
}
// 约束段：`extends` 之后一路吃到边界（没有 `extends` 时就只有名字）
const parts: Token[] = [name];
let endIndex = nameIndex;
const extendsIndex = SkipNextWrapSymbol(units, nameIndex);
const extendsUnit = Get(units, extendsIndex);
if (extendsUnit !== null && WordText(extendsUnit) === "extends") {
  parts.push(extendsUnit);
  endIndex = extendsIndex;
  for (let i = SkipNextWrapSymbol(units, extendsIndex); i < units.length; i++) {
    const item = Get(units, i);
    if (item === null || this.IsConstraintStop(item)) {
      break;
    }
    parts.push(item);
    endIndex = i;
  }
}
const parameter = new TypeParameter(current.Template);
parameter.SignIn(name.SourceRange.Start!);
parameter.SignOut(parts[parts.length - 1].SourceRange.End!);
for (const item of parts) {
  parameter.AddAndCloseLast(item);
}
parameter.TryToClose();
const result = new InferType(current.Template);
result.SignIn(current.SourceRange.Start!);
result.SignOut(parts[parts.length - 1].SourceRange.End!);
result.AddAndCloseLast(current);
result.AddAndCloseLast(parameter);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class InferType extends IndependentToken

推断类型（`infer X` / `infer X extends Y`）。类名必须与产物的标签名一致。

内容装两件：`infer` 那个词、以及一个 `TypeParameter`（名字与约束）。

## constructor:(template:Template)=>void

转调基类构造器。

**不挂队列**：内容已经全部成形（词 + 类型参数），`TypeParameter` 自己会跑它的队列 ✓。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new InferType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
