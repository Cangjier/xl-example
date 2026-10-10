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
当时那把对齐尺子一直把它当口径登记着）。两者的成员语法完全不同：前者是**一个映射**，
后者是一串成员声明。

判定放在 `TypeLiteralCloseRule.Process` 里（**不新增规则**）：
那对花括号已经在类型位、也已经由 `TypeLiteralCloseRule.Previous` 认领，
区别只在这对括号的内容——**第一个实义单元是 `[` 括号、而那个括号里有顶层的 `in`** ⇒ 映射类型。
`{ [key: string]: number }` 那种**索引签名**没有 `in`，仍然收成 `TypeLiteral`。

与 `TypeLiteral` 的另一处不同：映射类型的内容**直接装在自己身上**（它只有一个成员，
再套一层 `TypeLiteralBody` 只是噪声），所以 `MappedType` 自己挂语句队列，成员在这里成形。

# class MappedType extends IndependentToken

映射类型（`{ [K in T]: X }`）。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<MappedType>成员的 XML</MappedType>`。

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 998 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

**两处回原文查各换掉了什么**：

- `ctx.TextOf(某一格)` → `ctx.ValueOf(某一格)`：词形（`;` / `readonly` / `+` / `-` / `?` / `in` /
  `as`）本来就是那一格**自己记的**；
- `ctx.source[ctx.StartOf(值类型段)] === "?"` → **那个 `TypeDefine` 的 `questionAt`**
  （第 996 / 998 轮）：`{ [K in T]?: X }` 里 `?` 与 `:` 同样是**一格** `SymbolToken("?:")`、
  不进任何 `Data`，所以它由 `TypeDefine` 自己记着并**写进字典**
  （`TypeDefine.ToDictionary` 的 `questionAt`；XML 一个字不动）——
  这里从子单元视图上读它（`ctx.Attr`），不再拿源码字符去猜。

```ts
  const flat: any[] = [];
  for (const k of ctx.Kids(v)) {
    if (k.Tag() === "Statement") {
      for (const inner of ctx.UnwrapNodes(k)) flat.push(inner);
      continue;
    }
    if (k.Tag() === "SymbolToken" && ctx.ValueOf(k) === ";") {
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
  const members: any[] = [];
  let sawValueType = false;
  for (let i = 0; i < flat.length; i++) {
    const k = flat[i];
    const kind = k.Tag();
    const word =
      kind === "Keyword" || kind === "Identifier" || kind === "SymbolToken" ? ctx.ValueOf(k) : "";
    if (word === "readonly") {
      readonlyToken = ctx.Project(k);
      continue;
    }
    if (word === "-" || word === "+") {
      const next = i + 1 < flat.length ? ctx.ValueOf(flat[i + 1]) : "";
      if (next === "readonly") {
        readonlyToken = ctx.Project(k);
        i++;
      } else {
        questionToken = ctx.Project(k);
      }
      continue;
    }
    if (word === "?") {
      if (questionToken === undefined) questionToken = ctx.Project(k);
      continue;
    }
    if (word === "in") continue;
    if (kind === "ArrayLiteral" || kind === "Bracket") {
      const parts = ctx.Kids(k);
      const cond = parts.find((x: any) => x.Tag() === "ConditionalType");
      const condParts = cond === undefined ? [] : ctx.Kids(cond);
      const asAt = condParts.findIndex(
        (x: any) =>
          (x.Tag() === "Keyword" || x.Tag() === "Identifier") && ctx.ValueOf(x) === "as",
      );
      if (asAt > 0) {
        const tp = condParts.find((x: any) => x.Tag() === "TypeParameter");
        if (tp !== undefined) typeParameter = ctx.Project(tp);
        const nameKids = condParts.slice(asAt + 1);
        if (nameKids.length > 0) nameType = ctx.ConditionalNode(nameKids, 0, nameKids.length);
        continue;
      }
      const flatAs = parts.findIndex(
        (x: any) =>
          (x.Tag() === "Keyword" || x.Tag() === "Identifier") && ctx.ValueOf(x) === "as",
      );
      if (flatAs > 0) {
        const tp = parts.find((x: any) => x.Tag() === "TypeParameter");
        if (tp !== undefined) typeParameter = ctx.Project(tp);
        const nameKids = parts.slice(flatAs + 1);
        if (nameKids.length > 0) nameType = ctx.TypeExpression(nameKids);
        continue;
      }
      const inner = parts.find((x: any) => x.Tag() === "TypeParameter");
      if (inner !== undefined) {
        typeParameter = ctx.Project(inner);
        continue;
      }
    }
    if (kind === "TypeParameter") {
      typeParameter = ctx.Project(k);
      continue;
    }
    if (kind === "TypeDefine") {
      sawValueType = true;
      rest.push(k);
      continue;
    }
    if (sawValueType) {
      members.push(k);
      continue;
    }
    rest.push(k);
  }
  if (readonlyToken !== undefined) props.readonlyToken = readonlyToken;
  if (typeParameter !== undefined) props.typeParameter = typeParameter;
  if (nameType !== undefined) props.nameType = nameType;
  // **可选映射的 `?`**（第 93 轮那一格）：它由值类型段那个子单元**自己记着**（`questionAt`），
  // 读不到就是没有——**不回原文看那个字符**。`-?` 那一支不走这里（`-` 已经是 `questionToken`）。
  const rawQuestionAt = rest.length > 0 ? rest[0].questionAt : undefined;
  if (questionToken === undefined && typeof rawQuestionAt === "number" && rawQuestionAt >= 0) {
    const at = rawQuestionAt;
    questionToken = { kind: "QuestionToken", text: "?", pos: at, end: at + 1 };
  }
  if (questionToken !== undefined) props.questionToken = questionToken;
  const typeNode = rest.length > 0 ? ctx.TypeExpression(rest) : undefined;
  if (typeNode !== undefined) props.type = typeNode;
  if (members.length > 0) props.members = ctx.MemberList(members, "TypeLiteral");
  return ctx.NodeHead("MappedType", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，然后把**语句队列**装进自己的规则队列——映射类型的内容是散单元
（`{ }` 括号没有队列，见 `../bracket.xl.md` 的 `Use`），要在这里再跑一遍才会收成成员
（`Field` 里的 `[K in T]` 与值类型）。

与 `TypeLiteralBody` / `ClassBody` 同一做法。

```ts
super(template);
ParsePipeline.InitialCloseRuleQueue(this);
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
