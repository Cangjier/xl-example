# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 的**一个形参**：`LamdaParameters` 的每个子单元就是一个 `Parameter`，它自己的子单元是「名字 + 可选的 `?` + 可选的类型标注」那一串。

# class Parameter extends IndependentToken

Lambda 的一个形参。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<Parameter>子单元</Parameter>`。

## method PrintAst:(ctx:any, v:any)=>any

形参 `x: string` → `Parameter`（`name` + `type`；**从 `ts-ast.xl.md` 的 `projectParameter`
整块搬来**，第 196 轮。`tokens/parameter.xl.md` 里的 `LamdaParameter` 走的是**同一份实现**）。

**形参上的修饰词**（TS 4.x 起的参数属性）：`constructor(private readonly a: number)` 的
`private` / `readonly` 在 TS 那边是 `modifiers` 里的节点，在产物这边是 `Parameter` 下的平铺
`Keyword`——所以它们既要从名字搜索里排掉，也要收进 `modifiers`。

**`TypeDefine` 要摊平**：产物里 `x: string` 是 `Parameter > [Identifier, TypeDefine > Identifier]`，
而 TS 的 `Parameter.type` **直接就是那个类型引用**，中间没有 `TypeDefine` 这一层。

**解构形参**（第 122 轮）：`(...[a, b]: T)` / `({ p, q }: T)` 的名字是 `ArrayLiteral` /
`ObjectLiteral`，只找 `Identifier` / `Keyword` 会漏掉整格 `name`。

**形参名永远是 `Identifier`**（第 129 轮）：`this` / `async` / `await` / `type` 这些词做形参名时，
TS 那边是一个文本就是那个词的 `Identifier`（真实语料 `Parameter` 下缺 1149 个 `Identifier`，
绝大多数就是这一条）。

**`...` 的位置用它自己的 `range`**（不是从名字往回推一位）。
**起点跳过前导 trivia**（第 170 轮）：形参之间夹着注释时单元区间从注释起，而 TS 的
`Parameter.getStart()` 跳过它。

```ts
  const kids = ctx.Kids(v);
  const leadingModifiers: any[] = [];
  for (const k of kids) {
    if (k.get("type") === "Keyword" && ctx.ParameterModifiers.has(ctx.TextOf(k))) {
      leadingModifiers.push(k);
      continue;
    }
    break;
  }
  const body = leadingModifiers.length > 0 ? kids.slice(leadingModifiers.length) : kids;
  const nameNode = body.find(
    (k: any) =>
      k.get("type") === "Identifier" ||
      k.get("type") === "Keyword" ||
      k.get("type") === "ArrayLiteral" ||
      k.get("type") === "ObjectLiteral",
  );
  const typeNode = body.find((k: any) => k.get("type") === "TypeDefine");
  const question = body.find(
    (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "?",
  );
  const dots = body.find((k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "...");
  const rest = body.find((k: any) => k.get("type") === "Spread");
  const props: any = {
    name:
      nameNode === undefined
        ? undefined
        : nameNode.get("type") === "ArrayLiteral" || nameNode.get("type") === "ObjectLiteral"
          ? ctx.BindingPattern(nameNode)
          : nameNode.get("type") === "Keyword" || nameNode.get("type") === "Identifier"
            ? ctx.NameOf(nameNode)
            : ctx.Project(nameNode),
    type: typeNode === undefined ? undefined : ctx.Project(typeNode),
  };
  const paramDecorators = body.filter((k: any) => k.get("type") === "Decorator");
  if (leadingModifiers.length > 0 || paramDecorators.length > 0) {
    props.modifiers = [...ctx.ProjectEach(paramDecorators), ...ctx.ProjectEach(leadingModifiers)];
  }
  if (question !== undefined) {
    props.questionToken = ctx.Project(question);
  } else if (typeNode !== undefined && ctx.source[ctx.StartOf(typeNode)] === "?") {
    const at = ctx.StartOf(typeNode);
    props.questionToken = { kind: "QuestionToken", text: "?", pos: at, end: at + 1 };
  }
  const eq = body.findIndex((k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "=");
  if (eq >= 0 && eq + 1 < body.length) props.initializer = ctx.Project(body[eq + 1]);
  if (dots !== undefined) {
    props.dotDotDotToken = {
      kind: "DotDotDotToken",
      text: "...",
      pos: ctx.StartOf(dots),
      end: ctx.StartOf(dots) + 3,
    };
  } else if (rest !== undefined) {
    props.dotDotDotToken = ctx.Project(rest);
  }
  return {
    kind: "Parameter",
    pos: kids.length > 0 ? ctx.StartOf(kids[0]) : v.start,
    end: ctx.StmtEndOf(v),
    ...props,
  };
```

## constructor:(Template:Template)=>void

转调基类构造器，然后从重组模板里取出「本类」对应的一组重组规则。

`ReorganizationTemplate` 以类的构造器对象为键，所以这里写 `this.constructor`。

```ts
super(Template);
this.ReorganizationQueue = Template.ReorganizationTemplate.Get(this.constructor);
```

## property IsOptional:bool

这个形参是不是可选的：有两个以上子单元，且第二个是 `?` 符号。

### get

长度检查提成提前返回，避免在短列表上先取下标。

`Dawn/Steper` 的 `LamdaStep` 用它算出「哪些形参可以不传」；执行层不在本规范范围内。

```ts
if (this.Data.length < 2) {
  return false;
}
const second = this.Data[1];
return second instanceof SymbolToken && second.TempToString() === "?";
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new Parameter(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
