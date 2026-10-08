# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
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

第 66 轮之前它是**借调用节点**的：`MethodCloseRule` 把 `import("m")` 按「名字 + 括号」收成
`<Method name="import">`，外层再被类型运算符那条规则套一个 `<TypeQuery>`。**TypeScript 那边不是这样**：

```
const WebSocket: typeof import("undici-types").WebSocket;
```

TS 6 把整段收成**一个** `ImportType` 节点（`typeof` 是它身上的 `isTypeOf` 标志，限定名 `.WebSocket`
也是它的一部分），**没有** `TypeQuery`。于是产物与 AST 两边对不上：
当时那把对齐尺子的 `TypeQuery in TypeDefine` 117 处 / `TypeQuery in ConditionalType` 17 处 /
`TypeQuery in IntersectionType` 6 处 / `TypeQuery in As` 2 处 / `TypeQuery in TypeAssign` 2 处，
全部是「我们多套了一层 TypeQuery、而 TS 那边只有一个 ImportType」。

**只认类型位**：值位的 `await import("./m")` 是**真的动态调用**（TS 那边是 `CallExpression`），
那里的 `<Method name="import">` 必须留着——所以本规则与方括号 / 类型运算符那三条一样，
第一道闸是 `IsTypeContainerUnit`。

规则排在类型队列的**最前面**：`typeof` 要先被它吸收，否则类型运算符那一趟会先把
`typeof X` 收成 `TypeQuery`，导入类型就只能拿到半截。

# class ImportTypeCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:ImportTypeCloseRule = new ImportTypeCloseRule()

唯一的实例。

## private method IsImportStartAt:(units:Array<Token>, index:int)=>bool

`index` 处是不是导入类型的开头。**两种来路都要认**：

1. 已经收成调用的 `<Method name="import">`（类型位上 `MethodCloseRule` 会先把它收掉）；
2. **还是裸的** `import` 标识符 + `(` 括号——**类型实参段里没有调用规则**
   （`MethodCloseRule` 明确挡掉 `GenericType` 父单元，那是为了防止
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
  throw new Error("ImportTypeCloseRule.Process: current is null");
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

## method PrintAst:(ctx:any, v:any)=>any

类型位的导入类型 `import("m")` / `import("m").A.B` / `typeof import("m")` → `ImportType`
（**从 `ts-ast.xl.md` 的 `projectImportType` 搬来**，第 190 轮）。

产物那边的形状是 `[Keyword(typeof)?, Method(name="import")[String], SymbolToken(.), Identifier*]`；
TS 那边只有**两个**子字段：

- `argument`：**一层 `LiteralType` 包着**那个 `StringLiteral`（`import("buffer").Blob` 的 TS 是
  `ImportType > LiteralType > StringLiteral`）——照通用投影投时这一层整个没有
  （实测缺 `LiteralType` 221 处、`ImportType` 的字段名也整类不对 113 处）；
- `qualifier`：点号后面那一串名字，TS 用的是 **`QualifiedName`**（不是 `PropertyAccessExpression`）。

`typeof` 与 `import` 两个词都**不进子字段**：前者是 TS 节点的标志位、后者是语法词。

**实参可能在 `Method(name="import")` 里，也可能在一对圆括号里**（第 161 轮）：
值位那条调用规则先收过一遍时是 `Method`；而在**泛型实参段**里（`Array<import("m").X>`）
那个规则轮不到，形状是 `ImportType > [Keyword(import), Bracket((String)), ., Name]`。

```ts
  const rawKids = ctx.Kids(v);
  // **点号链与 `typeof` 那一层都要先摊平**（第 554 轮）：实测 `type X = import("./m").A` 的
  // `ImportType` 里**只有一个（多层嵌套的）`PropertyAccess`** ✓ —— `import(...)` 那个 `Method`
  // 与后面那串名字全在链**里面** ✗ ⇒ 下面那三处 `find` / `filter` 一个都命中不了 ✗
  // ⇒ `argument` / `qualifier` **整类丢** ✓（实测 `ty-import-type.ts` 8 缺 / 字段名 3 ✓、
  // `type-import-type.ts` 8 缺 / 字段名 2 ✓ —— 一族九份文件同一个形状 ✓）。
  // `typeof import("m")` 那一档更外面还套着一层 `UnaryOperator` ✓（`Keyword(typeof)` 是它的第一格 ✓），
  // 一并摊平 ✓；摊平是**按 `Data` 次序**递归的 ✓，所以限定名的先后不会乱 ✓。
  const flat: Array<any> = [];
  const flatten = (unit: any): void => {
    const name = unit.get("type");
    if (name === "PropertyAccess" || name === "UnaryOperator") {
      for (const kid of ctx.Kids(unit)) {
        flatten(kid);
      }
      return;
    }
    flat.push(unit);
  };
  for (const kid of rawKids) {
    flatten(kid);
  }
  const kids = flat;
  let stringUnit = kids.find((k: any) => k.get("type") === "String" || k.get("type") === "ConstString");
  // **实参那一层的子单元**（第 161 / 623 轮 ✓）：形状有两种 ✓ —— 值位那条调用规则先收过一遍时
  // 是一个 `Method(name="import")` ✓（字符串与属性对象都在**它里面** ✓，不在 `kids` 上 ✓），
  // 泛型实参段里则是一对裸圆括号 `Bracket` ✓。下面找字符串、找属性对象都从这一层看 ✓。
  const call = kids.find((k: any) => k.get("type") === "Method" || k.get("type") === "Bracket");
  const callKids = call === undefined ? [] : ctx.Kids(call);
  if (stringUnit === undefined) {
    stringUnit = callKids.find((k: any) => k.get("type") === "String" || k.get("type") === "ConstString");
  }
  const props: any = {};
  if (stringUnit !== undefined) {
    const literal = {
      kind: "StringLiteral",
      text: ctx.StringText(stringUnit),
      pos: ctx.StartOf(stringUnit),
      end: ctx.EndOf(stringUnit),
    };
    props.argument = { kind: "LiteralType", literal, pos: literal.pos, end: literal.end };
  }
  // **导入属性**（第 623 轮 ✓）：`import("./m.json", { with: { type: "json" } })` 的第二个实参
  // 在 TS 那边是 `ImportType.attributes` ✓（一个 `AssertClause` ✓），而产物那边它只是
  // `Method(name="import")` 里的一个 `ObjectLiteral` ✓（外面还包着 `{ with: … }` 那层壳 ✓）⇒
  // 不摘出来的话字段名少一格 ✓、`AssertClause` / `AssertEntry` / 名字 / 值整族都缺 ✓
  //（实测 `type T = import("./m.json", { with: { type: "json" } }).T`：字段名 1 + 缺 4 ✓）。
  //
  // **取里面那一层** ✓：TS 的 `AssertClause` 区间就是那个内层 `{ … }` ✓（**不含** `with:` ✓），
  // 而 `tokens/import.xl.md` 那边（`import … with { … }` 声明 ✓）取的是括号自己 ✓
  // ——两种写法的属性节点是同一个 kind ✓、取值口径也一样（名字 + 字符串值 ✓）。
  const wrapper = [...kids, ...callKids].find((k: any) => {
    if (k.get("type") !== "ObjectLiteral") return false;
    const word = ctx
      .Kids(k)
      .find((c: any) => c.get("type") === "Identifier" || c.get("type") === "Keyword");
    if (word === undefined) return false;
    const text = ctx.TextOf(word);
    return text === "with" || text === "assert";
  });
  if (wrapper !== undefined) {
    const brace = ctx.Kids(wrapper).find((c: any) => c.get("type") === "ObjectLiteral");
    if (brace !== undefined) {
      const elements = [];
      for (const part of ctx.Split(ctx.Kids(brace), ",")) {
        const colonAt = part.findIndex(
          (c: any) => c.get("type") === "SymbolToken" && ctx.TextOf(c) === ":",
        );
        if (colonAt < 0) continue;
        const nameUnit = part.slice(0, colonAt).find((c: any) => ctx.IsNameNode(c));
        if (nameUnit === undefined) continue;
        const valueUnit = part
          .slice(colonAt + 1)
          .find((c: any) => c.get("type") === "String" || c.get("type") === "ConstString");
        elements.push({
          kind: "AssertEntry",
          name: ctx.NameOf(nameUnit),
          value: valueUnit === undefined ? undefined : ctx.Project(valueUnit),
          pos: ctx.StartOf(nameUnit),
          end: valueUnit === undefined ? ctx.EndOf(nameUnit) : ctx.EndOf(valueUnit),
        });
      }
      props.attributes = {
        kind: "AssertClause",
        elements,
        pos: ctx.StartOf(brace),
        end: ctx.EndOf(brace),
      };
    }
  }
  // **限定名里可能有被升级成 `Keyword` 的名字**（第 123 轮）：`typeof import("./d").default`
  // 的 `default` 是 `Keyword`。要滤的只有 **`typeof` 那个词**——它是 TS 节点的标志位、
  // 不是限定名的一部分；`import` 是外面那个 `Method` 的名字，本来就不在这串里。
  const names = kids.filter((k: any) => {
    if (!ctx.IsNameNode(k)) return false;
    if (k.get("type") !== "Keyword") return true;
    const word = ctx.TextOf(k);
    return word !== "typeof" && word !== "import";
  });
  if (names.length > 0) props.qualifier = ctx.QualifiedNameFrom(names);
  // **类型实参**（第 114 轮）：`import("stream/web").QueuingStrategy<T>` 的 `<T>` 在产物里是
  // 平级的 `GenericType`，而 TS 的 `ImportType.typeArguments` 要照收。
  const generic = kids.find((k: any) => k.get("type") === "GenericType");
  if (generic !== undefined) {
    const typeArguments = [];
    for (const group of ctx.Split(ctx.Kids(generic), ",")) {
      const one = ctx.TypeExpression(group);
      if (one !== undefined) typeArguments.push(one);
    }
    if (typeArguments.length > 0) props.typeArguments = typeArguments;
  }
  return {
    kind: "ImportType",
    pos: v.start,
    end: generic === undefined ? v.end : ctx.EndOf(generic),
    ...props,
  };
```

## constructor:(template:Template)=>void

转调基类构造器，并挂上**类型队列**——为了让里面那个 `typeof` 升级成 `Keyword`
（类型位的关键词口径，见 `keyword.xl.md`）。

**不会重复包装**：本节点的类名不在 `IsTypeContainerUnit` 的白名单里，
所以类型队列那一趟再看到里面那个 `Method(name="import")` 时，父亲判据给否 ✓。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
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
