# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { TypeDefine } from "../type-define.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 的**一个形参**：`LamdaParameters` 的每个子单元就是一个 `Parameter`，它自己的子单元是「名字 + 可选的 `?` + 可选的类型标注」那一串。

# class Parameter extends IndependentToken

Lambda 的一个形参。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<Parameter>子单元</Parameter>`。

## method PrintAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 996 轮）：这一格出哪个节点，只许用这个 token 自己的属性、子单元与 `Parent`，不回原文查——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintAst`。

**两处回原文查各换掉了什么**：

- `ctx.TextOf(某一格)` → `ctx.ValueOf(某一格)`：符号（`?` / `...` / `=`）与修饰词
  （`private` / `readonly`）的字面值本来就是那一格**自己记的**，不回原文兜底；
- `ctx.source[ctx.StartOf(类型段)] === "?"` → **那个 `TypeDefine` 自己记的 `QuestionAt`**
  （第 996 轮）：`a?: T` 的 `?` 与 `:` 被词法并成一格、**不进任何 `Data`**，
  所以这个 `?` 在 token 树上没有叶子——它是 `TypeDefine` 的区间起点那一格事实，
  由 `TypeDefineCloseRule.Process` 记在 `TypeDefine.QuestionAt` 上。
  直出版从自己的 `Data` 里取出那个子单元读它，不再拿源码字符去猜。

```ts
  const kids = ctx.Kids(v);
  const leadingModifiers: any[] = [];
  for (const k of kids) {
    if (k.Tag === "Keyword" && PARAMETER_MODIFIERS.has(k.TextValue)) {
      leadingModifiers.push(k);
      continue;
    }
    break;
  }
  const body = leadingModifiers.length > 0 ? kids.slice(leadingModifiers.length) : kids;
  const nameNode = body.find(
    (k: any) =>
      k.Tag === "Identifier" ||
      k.Tag === "Keyword" ||
      k.Tag === "ArrayLiteral" ||
      k.Tag === "ObjectLiteral",
  );
  const typeNode = body.find((k: any) => k.Tag === "TypeDefine");
  const question = body.find(
    (k: any) => k.Tag === "SymbolToken" && k.TextValue === "?",
  );
  const dots = body.find((k: any) => k.Tag === "SymbolToken" && k.TextValue === "...");
  const rest = body.find((k: any) => k.Tag === "Spread");
  const props: any = {
    name:
      nameNode === undefined
        ? undefined
        : nameNode.Tag === "ArrayLiteral" || nameNode.Tag === "ObjectLiteral"
          ? ctx.BindingPattern(nameNode)
          : nameNode.Tag === "Keyword" || nameNode.Tag === "Identifier"
            ? nameNode.NameNode
            : ctx.Project(nameNode),
    type: typeNode === undefined ? undefined : ctx.Project(typeNode),
  };
  const paramDecorators = body.filter((k: any) => k.Tag === "Decorator");
  if (leadingModifiers.length > 0 || paramDecorators.length > 0) {
    props.modifiers = [...ctx.ProjectEach(paramDecorators), ...ctx.ProjectEach(leadingModifiers)];
  }
  if (question !== undefined) {
    props.questionToken = ctx.Project(question);
  } else if (typeNode !== undefined) {
    // **可选标记被吞进类型标注那一格时**（`a?: T`）：问号的位置由那个子单元自己记着。
    const typeToken = this.Data.find((x) => x instanceof TypeDefine);
    const at = typeToken === undefined ? -1 : typeToken.QuestionAt;
    if (at >= 0) {
      props.questionToken = { kind: "QuestionToken", text: "?", pos: at, end: at + 1 };
    }
  }
  const eq = body.findIndex((k: any) => k.Tag === "SymbolToken" && k.TextValue === "=");
  if (eq >= 0 && eq + 1 < body.length) {
    const init = body[eq + 1];
    props.initializer =
      init.Tag === "Bracket" && init.startBracket === "("
        ? ctx.ParenthesizedOf(init)
        : ctx.Expression(body.slice(eq + 1));
  }
  if (dots !== undefined) {
    props.dotDotDotToken = {
      kind: "DotDotDotToken",
      text: "...",
      pos: dots.start,
      end: dots.start + 3,
    };
  } else if (rest !== undefined) {
    props.dotDotDotToken = ctx.Project(rest);
  }
  return {
    kind: "Parameter",
    pos: kids.length > 0 ? kids[0].start : v.start,
    end: v.ProjectionEnd,
    ...props,
  };
```

## constructor:(Template:Template)=>void

转调基类构造器，然后从规则模板里取出「本类」对应的一组收尾规则。

`CloseRuleTemplate` 以类的构造器对象为键，所以这里写 `this.constructor`。

```ts
super(Template);
this.CloseRuleQueue = Template.CloseRuleTemplate.Get(this.constructor);
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

## field AstKind:string | undefined = "Parameter"

**我这一格投成目标语言形状时叫什么节点**（第 1025 轮）：标签是我的类名（`Tag`），
节点名也是我自己的事实——过去它住在投影层那张按标签查的 `KIND_BY_TAG` 中央表里，
同一份事实于是被声明了两遍（我这一页一次、表里一次）。
基类答 `undefined`＝「这个标签没有对应节点」（原样透传 + 记 `unmapped`）。

## field IsTypeUnit:bool = true

**我是一个类型位的单元**（第 1098 轮）：`Parameter` 就是这一页自己的类名，所以常量答 `true`——
口径与理由见 `core/syntax/token.xl.md` 的 `IsTypeUnit`（投影那一侧「这一段是不是类型单元」
过去是十几处现场比类名，今天由被问的那一页答）。

## field IsParameterUnit:bool = true

**我这一格就是一个形参单元**（第 1098 轮）：`Parameter` 就是这一页自己的类名，所以常量答
`true`——它与 `IsTypeUnit` **不是同一问**：那一格答「我是不是类型位那一族的一员」（十二页答
`true`），这一格只认本页（投影那一处在一对构造签名的圆括号里找**都是形参的那几格**）。


# private const PARAMETER_MODIFIERS:Set<string>

**形参前面哪几个词是修饰词**（第 1037 轮从投影层搬到这里）。

`a: T` 与 `private readonly a: T` 在产物那边同形：都把那几个词当**子单元**摆在前面，
只有这一页知道它们不是参数名的一部分。这一份词表过去写在
`typescript/print-ast-common.xl.md`（`# private const PARAMETER_MODIFIERS`）、
并挂在 `ctx.ParameterModifiers` 上递过来，可它**全仓只有一个读者**——就是本页的
`PrintAst`：一份只服务一处的词表住在投影层，搬回来说的是同一件事，而 `ctx` 上
那一格出口也随之删掉（出口表 64 → 62）。

```ts
new Set(["public", "private", "protected", "readonly", "override"])
```
