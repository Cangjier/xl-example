# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**映射类型**：把 `{ [K in T]: X }` 收成一个 `MappedType` 单元（TS 那边叫 `MappedTypeNode`）。

第 60 轮之前它**没有专属标签**：产物是 `TypeLiteral` + `TypeLiteralBody` + `Field`——
`{ [K in keyof T]: T[K] }` 与 `{ a: number }` 在树里长得一样（真实语料 36 处，
`cases:align` 一直把它当口径登记着）。两者的成员语法完全不同：前者是**一个映射**，
后者是一串成员声明。

判定放在 `TypeLiteralCloseRule.Process` 里（**不新增规则**）：
那对花括号已经在类型位、也已经由 `TypeLiteralCloseRule.Previous` 认领，
区别只在这对括号的内容——**第一个实义单元是 `[` 括号、而那个括号里有顶层的 `in`** ⇒ 映射类型。
`{ [key: string]: number }` 那种**索引签名**没有 `in`，仍然收成 `TypeLiteral` ✓。

与 `TypeLiteral` 的另一处不同：映射类型的内容**直接装在自己身上**（它只有一个成员，
再套一层 `TypeLiteralBody` 只是噪声），所以 `MappedType` 自己挂语句队列，成员在这里成形。

# class MappedType extends IndependentToken

映射类型（`{ [K in T]: X }`）。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<MappedType>成员的 XML</MappedType>`。

## method PrintAst:(ctx:any, v:any)=>any

映射类型 `{ readonly [P in keyof T]-?: T[P] }` → `MappedType`（**从 `ts-ast.xl.md` 的
`projectMappedType` 搬来**，第 191 轮）。

TS 那边的子字段（实测 `{ [P in keyof T]-?: T[P] }`）：

    MappedType[9,35)  typeParameter:TypeParameter[12,24)
                      questionToken:MinusToken[25,26)      ← `-?` 那个 `-`（`?` 不进子节点）
                      type:IndexedAccessType[29,33)

产物那边它们与一层 `Statement` 壳混在一起
（`[Statement[ ArrayLiteral(TypeParameter), SymbolToken(-), TypeDefine ]]`）——
照通用投影会投出一个 `ExpressionStatement`（实测「多出来」465 个）并把修饰符当成它的内容。
所以这里把这层壳摊平、按词形分派到四个字段。

**`-readonly` 的 `readonlyToken` 就是那个 `-`**（TS 的类型是
`ReadonlyKeyword | PlusToken | MinusToken`），后面那个 `readonly` 词**不再单独成节点**——
不收掉它会多出一个 `ReadonlyKeyword`，同时缺一个 `MinusToken`。

**`as` 键重映射有两种形状**：条件类型里那个 `as`（`nameType = conditionalNode(...)`）与
**平级的一格** `as`（`ArrayLiteral > [TypeParameter, Keyword(as), String]`）。
后者必须走 `ctx.TypeExpression`（会打上 `ctx.typePosition`，
模板字面量因此投成 `TemplateLiteralType` 而不是 `TemplateExpression`）。

```ts
  const flat: any[] = [];
  for (const k of ctx.Kids(v)) {
    if (k.get("type") === "Statement") {
      for (const inner of ctx.UnwrapNodes(k)) flat.push(inner);
      continue;
    }
    flat.push(k);
  }
  const props: any = {};
  let readonlyToken;
  let questionToken;
  let typeParameter;
  let nameType;
  const rest: any[] = [];
  for (let i = 0; i < flat.length; i++) {
    const k = flat[i];
    const kind = k.get("type");
    const word =
      kind === "Keyword" || kind === "Identifier" || kind === "SymbolToken" ? ctx.TextOf(k) : "";
    if (word === "readonly") {
      readonlyToken = ctx.Project(k);
      continue;
    }
    if (word === "-" || word === "+") {
      const next = i + 1 < flat.length ? ctx.TextOf(flat[i + 1]) : "";
      if (next === "readonly") {
        readonlyToken = ctx.Project(k);
        i++;
      } else {
        questionToken = ctx.Project(k);
      }
      continue;
    }
    if (word === "?") {
      questionToken = ctx.Project(k);
      continue;
    }
    if (word === "in") continue;
    if (kind === "ArrayLiteral" || kind === "Bracket") {
      const parts = ctx.Kids(k);
      const cond = parts.find((x: any) => x.get("type") === "ConditionalType");
      const condParts = cond === undefined ? [] : ctx.Kids(cond);
      const asAt = condParts.findIndex(
        (x: any) =>
          (x.get("type") === "Keyword" || x.get("type") === "Identifier") && ctx.TextOf(x) === "as",
      );
      if (asAt > 0) {
        const tp = condParts.find((x: any) => x.get("type") === "TypeParameter");
        if (tp !== undefined) typeParameter = ctx.Project(tp);
        const nameKids = condParts.slice(asAt + 1);
        if (nameKids.length > 0) nameType = ctx.ConditionalNode(nameKids, 0, nameKids.length);
        continue;
      }
      const flatAs = parts.findIndex(
        (x: any) =>
          (x.get("type") === "Keyword" || x.get("type") === "Identifier") && ctx.TextOf(x) === "as",
      );
      if (flatAs > 0) {
        const tp = parts.find((x: any) => x.get("type") === "TypeParameter");
        if (tp !== undefined) typeParameter = ctx.Project(tp);
        const nameKids = parts.slice(flatAs + 1);
        if (nameKids.length > 0) nameType = ctx.TypeExpression(nameKids);
        continue;
      }
      const inner = parts.find((x: any) => x.get("type") === "TypeParameter");
      if (inner !== undefined) {
        typeParameter = ctx.Project(inner);
        continue;
      }
    }
    if (kind === "TypeParameter") {
      typeParameter = ctx.Project(k);
      continue;
    }
    rest.push(k);
  }
  if (readonlyToken !== undefined) props.readonlyToken = readonlyToken;
  if (typeParameter !== undefined) props.typeParameter = typeParameter;
  if (nameType !== undefined) props.nameType = nameType;
  // **可选映射的 `?` 被吞进了值类型的区间**（第 93 轮）：`{ [K in T]?: X }` 里那个
  // `TypeDefine` 从 `?` 起（与属性、形参两处同源），所以按「值类型段第一个字符是不是 `?`」切。
  // `-?` 那一支不走这里（`-` 已经是 `questionToken`）。
  if (questionToken === undefined && rest.length > 0 && ctx.source[ctx.StartOf(rest[0])] === "?") {
    const at = ctx.StartOf(rest[0]);
    questionToken = { kind: "QuestionToken", text: "?", pos: at, end: at + 1 };
  }
  if (questionToken !== undefined) props.questionToken = questionToken;
  const typeNode = rest.length > 0 ? ctx.TypeExpression(rest) : undefined;
  if (typeNode !== undefined) props.type = typeNode;
  return ctx.NodeHead("MappedType", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，然后把**语句队列**装进自己的规则队列——映射类型的内容是散单元
（`{ }` 括号没有队列，见 `../bracket.xl.md` 的 `Use`），要在这里再跑一遍才会收成成员
（`Field` 里的 `[K in T]` 与值类型）。

与 `TypeLiteralBody` / `ClassBody` 同一做法。

```ts
super(template);
ParsePipeline.InitialStatementCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new MappedType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
