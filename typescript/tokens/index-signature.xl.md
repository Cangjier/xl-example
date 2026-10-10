# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**索引签名**：`{ [k: string]: T }` 里的 `[k: string]: T` 收成一个 `IndexSignature`。

TypeScript 那边它是**独立节点**（`IndexSignature`，内容是一个 `Parameter` 与值类型：

    IndexSignature «[k: string]: number»
      Parameter «k: string»
      NumberKeyword «number»

）。本工程原来把它**借字段节点**收（`<Field name="k">` 里装一个 `ArrayLiteral` 与两个 `TypeDefine`），
当时那把对齐尺子里登记成共用标签的口径；`REVERSE` 里 `Field` 的构造集合因此也挂着 `IndexSignature`。

**节点由 `field.xl.md` 分流出来**（索引签名与字段在成员表里同形，都在成员的起首）：
名字是「`[` + 标识符 + `:`」这一形状时，`FieldCloseRule` 造的是本节点。
判据写在那边（它手上才有名字单元），这里只负责节点本身。

**方括号消费掉**（不进产物）：与 `ArrayType` / `TupleType` 同一条口径——
TS 那边 `IndexSignature` 里也没有 `[` `]` 节点，只有参数与类型。

# class IndexSignature extends IndependentToken

索引签名（`[k: string]: T` / `readonly [k: string]: T`）。类名必须与产物的标签名一致。

内容直接装在自己身上：参数名、参数类型、值类型（各是一个 `TypeDefine` 或散单元）。

## method PrintAst:(ctx:any, v:any)=>any

索引签名 `{ [k: string]: T }` / `readonly [k: symbol]: T` → **`IndexSignature`**
（**从 `ts-ast.xl.md` 的 `projectIndexSignature` 搬来**，第 187 轮。
注意投出的 kind 字面量就是 `"IndexSignature"`——`ts.SyntaxKind` 里那个枚举名是
`IndexSignatureDeclaration`，但本工程一直用短名，改成全名会让这一整类算成「缺 19 + 多 19」）。

TS 那边它有三个具名字段：`parameters`（`[k: string]` 那个 `k: string`）、`type`（值类型）、
`modifiers`（`readonly` / **`static`**）；产物那边是**一串平级子单元**（`Parameter` + `TypeDefine`
（+ 修饰词那个单元）），照通用投影会全塞进一个 `children`（实测 `IndexSignatureDeclaration`
的字段名整类不符）。

`readonly` 在产物里是**子单元**（不是一个属性），所以这里单独把它收成修饰词节点——
`addModifiers` 读的是 `modifiers` 属性 / 布尔属性，这一格两样都没有。

**`static` 那一位是第 893 轮补的**（**片段普查当场红的**）：`class C { static [k: string]: number; }`
在 TS 里那个 `IndexSignature` 的 `modifiers` 是 `[StaticKeyword[10,16)]`，而这一格原来
**只找 `readonly`** ⇒ 缺 `StaticKeyword` 一格、字段名也少一项。
**两者都要收**（`static readonly [k: string]: number` 在 TS 里是**两个**修饰词，次序就是源码里的次序）：
所以这一趟收的是**一张表、按源码次序**，不是「两处各写一句」。
`ctx.Project` 把那个词投成 `StaticKeyword`（与 `readonly` 走同一个关键字表，见
`print-ast-common.xl.md` 的 `KEYWORD_KIND`）。

**形参的区间要去掉那对方括号**（第 92 轮）：产物的 `Parameter` 单元把 `[` 也圈进来了
（`[key: string]` 给 [14,26)），而 TS 的 `Parameter` 是 `key: string`（[15,26)）——
实测这一族 104 处漂移，都是「起点早一格」。

```ts
  const kids = ctx.Kids(v);
  const params = kids.filter((k: any) => k.get("type") === "Parameter");
  const typeNode = kids.find((k: any) => k.get("type") === "TypeDefine");
  // **修饰词那一摞**（第 893 轮）：`readonly` 与 `static` 都是子单元，按源码次序收。
  const modifierUnits = kids.filter(
    (k: any) =>
      (k.get("type") === "Keyword" || k.get("type") === "Identifier") &&
      (ctx.TextOf(k) === "readonly" || ctx.TextOf(k) === "static"),
  );
  const props: any = {};
  if (params.length > 0) {
    props.parameters = ctx.ProjectEach(params, "IndexSignature").map((one: any) => ({
      ...one,
      pos: one.name !== undefined ? one.name.pos : one.pos,
      end: one.type !== undefined ? one.type.end : one.end,
    }));
  }
  if (typeNode !== undefined) {
    props.type = ctx.Project(typeNode);
  }
  if (modifierUnits.length > 0) {
    props.modifiers = modifierUnits.map((one: any) => ctx.Project(one));
  }
  return ctx.NodeHead("IndexSignature", props, v);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const kids = ctx.Kids(v);
  const params = kids.filter((k: any) => k.Tag() === "Parameter");
  const typeNode = kids.find((k: any) => k.Tag() === "TypeDefine");
  // **修饰词那一摞**（第 893 轮）：`readonly` 与 `static` 都是子单元，按源码次序收。
  const modifierUnits = kids.filter(
    (k: any) =>
      (k.Tag() === "Keyword" || k.Tag() === "Identifier") &&
      (ctx.ValueOf(k) === "readonly" || ctx.ValueOf(k) === "static"),
  );
  const props: any = {};
  if (params.length > 0) {
    props.parameters = ctx.ProjectEach(params, "IndexSignature").map((one: any) => ({
      ...one,
      pos: one.name !== undefined ? one.name.pos : one.pos,
      end: one.type !== undefined ? one.type.end : one.end,
    }));
  }
  if (typeNode !== undefined) {
    props.type = ctx.Project(typeNode);
  }
  if (modifierUnits.length > 0) {
    props.modifiers = modifierUnits.map((one: any) => ctx.Project(one));
  }
  return ctx.NodeHead("IndexSignature", props, v);
```


## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——参数类型与值类型都要照常成形
（`[k: string]: A | B` 的联合、`[k: symbol]: () => void` 的函数类型……）。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new IndexSignature(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
