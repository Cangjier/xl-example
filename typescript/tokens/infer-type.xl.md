# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextTrivia, SkipPreviousTrivia, WordText, IsTriviaUnit, IsTypeContainerUnit } from "../text-common-util.xl.md"
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
于是 当时那把对齐尺子的 `TypeParameter` 一直缺 **86 处**（全是 `infer` 里的那个）。

规则排在**类型队列与通用队列两个地方**：`infer` 常见于条件类型（通用队列的地盘），
也常见于**函数类型的形参**（`T extends (a: infer U) => any ? U : never`）——
那里它的父单元是 `TypeDefine`，只有类型队列才跑得到（实测少了这一条这一族不成形）。

# class InferTypeCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:InferTypeCloseRule = new InferTypeCloseRule()

唯一的实例。

## private method IsInferWord:(item:Token | null)=>bool

这个单元是不是 `infer` 那个词。

**两种形态都要认**：类型队列里 `KeywordCloseRule` 排在最后，所以此刻它可能是
还没升级的 `Identifier`；通用队列里它可能已经被升级成 `Keyword`（那一趟跑过）。
`WordText` 对两种都给文本。

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
`|` / `&` **不是**终点：`infer U extends A | B` 的约束就是那个联合。

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
`GenericType` / `TypeOperator` … 都在白名单里）；后面（跨过 trivia）紧跟一个 `Identifier` 名字
——`infer` 后面没有名字就不是推断类型（`infer` 也可能只是别处的标识符）。

**跳的是 trivia 而不是软换行**（第 667 轮）：`infer /*c*/ U` 里的注释夹在语法相邻的两格之间，
只跳软换行时下一格是那条注释 ⇒ 判否 ⇒ 整个 `InferType` 不成形（实测这一段落成
`TypeReference(infer)` + `TypeReference(U)`，TS 那边是 `InferType > TypeParameter > U`）。
`SkipNextTrivia` 是「下一个实义单元」的统一口径，与 `Statement` 那几处同一做法。

```ts
const current = Get(units, index);
if (this.IsInferWord(current) === false) {
  return false;
}
if (current === null || (IsTypeContainerUnit(current.Parent) === false && this.IsPendingTypePosition(units, index) === false)) {
  return false;
}
return Get(units, SkipNextTrivia(units, index)) instanceof Identifier;
```

## private method IsPendingTypePosition:(units:Array<Token>, index:int)=>bool

`index`（`infer` 那一格）**还没被收进类型容器**、可它这一行确实落在**类型位**上吗。

**为什么需要这一问**（第 902 轮）：`infer` 所在的整段类型**成形得比它晚**——
`type T<U> = U extends Array<infer V extends` 换行 `string> ? V : never;` 里，
`infer` 在**根那一趟**被问到，而 `Array<…>` 的尖括号、外层那个条件类型都还没成形
⇒ 父单元是 `Statement` / `Root` ⇒ 上面那句 `IsTypeContainerUnit` 判否 ⇒ `InferType` 一个都不成形
（实测 `token/types/gap-r900-infer-constraint-newline`：缺 10 个节点）。
**同类先例**：`IsTypeContainerUnit` 的 `Bracket` 那一支（`(infer U)`）就是为同一个时序问题补的。

判据三条（只看**已经读到**的那些单元）：

1. 父单元是 `Root` / `Statement`——`Statement` 是「根那一趟的壳」，`Root` 是「壳都还没收」；
2. 从 `index` 往回扫，**不跨过语句边界**（用 `WordText` 按词认，不 import `Statement`：那个方向会成环）；
3. 扫到 `extends` / `=` / `=>` 三者之一 ⇒ 这一段是类型位。

**为什么这三格够用**：`infer` 只可能出现在**类型**里，而「还没成形的 `infer`」只可能落在
`X extends …`（条件类型 / 泛型约束）或 `= …`（类型别名右值）或 `=> …`（函数类型返回位）
三种类型的**右边**；值位里 `infer` 只是一个普通标识符，而它前面是 `.` / `(` / `,` / 运算符
——三者都不是，所以判否，照旧留给标识符规则。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const parent = current.Parent;
if (parent === null) {
  return false;
}
const parentName = parent.constructor.name;
if (parentName !== "Root" && parentName !== "Statement") {
  return false;
}
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item === null) {
    continue;
  }
  // 成形的语句 / 块 / 类型位边界 ⇒ 这一段的左边到头了。
  if (item instanceof LineWrap === false && item instanceof SymbolToken === false) {
    if (item.constructor.name === "Statement" || item.constructor.name === "Root") {
      break;
    }
  }
  const word = WordText(item);
  if (word === "extends" || word === "=" || word === "=>") {
    return true;
  }
  // `;` / `{` / `}` / `,` 是硬边界：再往左就是上一条语句或另一段了。
  if (item instanceof SymbolToken && item.Is(";")) {
    break;
  }
  if (item.constructor.name === "Statement") {
    break;
  }
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `infer X` / `infer X extends Y` 收成一个 `InferType`（里面配一个 `TypeParameter`），
**返回新的下标**。

两层一起造：`InferType > TypeParameter > (X extends Y)`。外层收 `infer` 与内层，
内层收名字与约束——与 TS 的形状一对一。

**`Replace` 之前不许先 `Add`**（`type-bracket.xl.md` 记过这个坑）：`Token.Replace` 读的是
`this.Parent.Data`，先 `AddAndCloseLast` 会把 `Parent` 改成新节点。
这里两头都可能动，所以统一用 `ReplaceCountAt`（只做 `splice`、不看 `Parent`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("InferTypeCloseRule.Process: current is null");
}
const nameIndex = SkipNextTrivia(units, index);
const name = Get(units, nameIndex);
if (name === null) {
  throw new Error("InferTypeCloseRule.Process: name is null");
}
// 约束段：`extends` 之后一路吃到边界（没有 `extends` 时就只有名字）
const parts: Token[] = [name];
let endIndex = nameIndex;
const extendsIndex = SkipNextTrivia(units, nameIndex);
const extendsUnit = Get(units, extendsIndex);
if (extendsUnit !== null && WordText(extendsUnit) === "extends") {
  // 先把候选约束段扫出来，**收不收**由下面那条判据决定。
  //
  // **trivia 不进约束段、也不进区间**（第 948 轮）：`infer C extends D//c` 换行 ` ? E : F`
  // 里那条行注释原来被当成约束段的一格 ⇒ `SignOut` 取到它的末尾 ⇒ `InferType` 的区间跨过
  // 注释（实测 `TS[19,36) vs 产物[19,39)`：漂 1 + 多 1）。TS 那个 `InferType` 到 `D` 为止，
  // 注释是**节点外面**的 trivia。所以这里：夹在实义单元**中间**的 trivia 跟着约束段走
  // （它们在区间里面，不加进子单元就会被 `ReplaceCountAt` 抹掉），**末尾**那一段留在外面。
  const constraintParts: Token[] = [];
  let constraintEnd = extendsIndex;
  let lastReal = extendsIndex;
  let pending: Token[] = [];
  for (let i = extendsIndex + 1; i < units.length; i++) {
    const item = Get(units, i);
    if (item === null) {
      break;
    }
    if (IsTriviaUnit(item)) {
      pending.push(item);
      continue;
    }
    if (this.IsConstraintStop(item)) {
      break;
    }
    for (const held of pending) {
      constraintParts.push(held);
    }
    pending = [];
    constraintParts.push(item);
    lastReal = i;
    constraintEnd = i;
  }
  // **`?` 紧跟约束段之后时，这个 `extends` 未必是约束**（第 148 轮）：同一段文本
  // `infer E extends F ? G : H` 在两种上下文里 TS 读法**相反**——
  //
  //     T extends infer U extends string ? U : never   ⇒ InferType = `infer U extends string`
  //     A extends B ? infer E extends F ? G : H : J    ⇒ InferType = `infer E`（`F` 是**外层条件类型**的 extendsType）
  //
  // （实测 `ts.createSourceFile`：前者的 `TypeParameter` 到 `string` 为止，后者只到 `E`。）
  // 判据是「从 `infer` 往回看，最近的实义单元是 `extends` 还是别的」：前者的 `infer`
  // 落在某个条件类型的 **extendsType** 位置上（回扫先撞上那个 `extends`），后者回扫先撞上 `?`。
  // **这一问也要跨过 trivia**（第 948 轮）：`constraintEnd` 现在是**最后一个实义单元**，
  // 它和 `?` 之间可能夹着一条注释（`infer U extends string /*c*/ ? U : never`）——
  // 只跳软换行时会撞上那条注释、`questionNext` 答否，三元判据当场翻向另一边、约束整段丢掉。
  const nextAfter = Get(units, SkipNextTrivia(units, constraintEnd));
  const questionNext = nextAfter instanceof SymbolToken && nextAfter.Is("?");
  if (constraintParts.length === 0 || questionNext === false || this.IsInsideExtendsType(units, index)) {
    parts.push(extendsUnit);
    for (const item of constraintParts) {
      parts.push(item);
    }
    endIndex = constraintEnd;
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

## private method IsInsideExtendsType:(units:Array<Token>, index:int)=>bool

从 `index`（`infer` 那一格）往回看，**最近的实义单元是不是 `extends`**。

是 ⇒ 这个 `infer` 落在某个条件类型的 `extendsType` 位置上：后面那个 `extends` 只能是
**infer 自己的约束**（TypeScript 在 extendsType 里关掉了条件类型的解析）。

`LineWrap` 跳过；撞上别的实义单元（`?` / `;` / `=` / 逗号 / 括号…）就算「不是」。
见 `Process` 里那一处的说明。

**注释也算 trivia**（第 874 轮）：`U extends /*c*/ infer V extends string ? V : never` 里
那个 `infer` **就在** `extendsType` 的位置上，可它前面紧挨着的是那条 `AreaAnnotation`——
只跳软换行时回扫第一步就撞上注释 ⇒ 答否 ⇒ `Process` 那条三元判据翻向另一边
⇒ **约束被整段丢掉**（实测 `gap-r869-infer-extends-comment-5`：`InferType` 只到 `V` 为止、
缺 `StringKeyword`）。这一问要的是**上一个实义单元**，所以走 `SkipPreviousTrivia`
——与 `Previous` 里那一处（第 667 轮）同一个口径。

```ts
const before = Get(units, SkipPreviousTrivia(units, index));
if (before === null) {
  return false;
}
return WordText(before) === "extends";
```

# class InferType extends IndependentToken
推断类型（`infer X` / `infer X extends Y`）。类名必须与产物的标签名一致。

内容装两件：`infer` 那个词、以及一个 `TypeParameter`（名字与约束）。

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  const param = ctx.Kids(v).find((k: any) => k.Tag() === "TypeParameter");
  const props: any = {};
  if (param !== undefined) props.typeParameter = ctx.Project(param);
  return ctx.NodeHead("InferType", props, v);
```


## constructor:(template:Template)=>void

转调基类构造器。

**不挂队列**：内容已经全部成形（词 + 类型参数），`TypeParameter` 自己会跑它的队列。

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
