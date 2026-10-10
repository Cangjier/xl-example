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

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
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
