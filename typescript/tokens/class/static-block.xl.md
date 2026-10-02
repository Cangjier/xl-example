# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { ClassBody } from "./class-body.xl.md"
import { Identifier } from "../identifier.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**类静态块**：把类体里的 `static { … }` 收成一个 `StaticBlock` 单元
（TS 那边叫 `ClassStaticBlockDeclaration`）。

第 56 轮之前它**没有专属标签**：内容完整地留在
`<Statement><Keyword>static</Keyword><Bracket>{…}</Bracket></Statement>` 里——**内容没丢**，
但整个构造只是一个语句加一个括号，下游拿不到「这是一段类静态初始化」这件事
（`README.md` 的「结构性缺口」里挂着它）。

判据落在**位置**上：`{` 括号前一个实义单元是内容为 `static` 的词，**而且两者的父单元是 `ClassBody`**。
成员规则排在本条之前（`MethodDeclaration` / `Field`），所以 `static m() {}` / `static x = 1`
早就被它们认领了，走到这里的只可能是静态块。

`StaticBlockReorganization` 写在 `StaticBlock` **之前**，与同目录其它 token 一致。

# class StaticBlockReorganization extends Reorganization

## static readonly field Instance:StaticBlockReorganization = new StaticBlockReorganization()

唯一的实例，注册进通用重组队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是静态块的那对花括号。

三条判据：`index` 处是 `{` 开头的括号；它前面（跳软换行）是内容为 `static` 的 `Identifier`；
括号的父单元是 `ClassBody`。

**父单元必须是类体**：对象字面量里的 `{ static: 1 }` 也长着「`static` + 括号」的样子，
但那个括号的父单元是 `ObjectLiteral`。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket) || current.startBracket !== "{") {
  return false;
}
if (!(current.Parent instanceof ClassBody)) {
  return false;
}
const beforeIndex = SkipPreviousWrapSymbol(units, index);
const before = Get(units, beforeIndex);
return before instanceof Identifier && before.Is("static");
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `static` 与那对花括号收成一个 `StaticBlock`，**返回新的下标**。

花括号的内容**整体搬进** `StaticBlock`（与 `FunctionBody` / `MethodBody` / `ForBody` 同一做法：
括号本身不进树，`{ }` 的边框由容器承担），搬完 `TryToClose()` 一次让体内的语句重组跑起来。

替换范围从 `static` 起算（`startIndex`），而不是从括号起算——`static` 这个词也是这段构造的一部分。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket)) {
  throw new Error("静态块不满足格式要求：static { ... }");
}
const startIndex = SkipPreviousWrapSymbol(units, index);
const keyword = Get(units, startIndex);
if (keyword === null) {
  throw new Error("静态块不满足格式要求：static { ... }");
}
const result = new StaticBlock(template);
result.Parent = current.Parent;
result.SignIn(keyword.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
current.MoveDataTo(result);
result.TryToClose();
return ReplaceCountAt(units, startIndex, index - startIndex + 1, result);
```

# class StaticBlock extends IndependentToken

类静态块（`static { … }`）。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<StaticBlock>体内语句</StaticBlock>`。

## method PrintAst:(ctx:any, v:any)=>any

类静态块 `class A { static { … } }` → `ClassStaticBlockDeclaration`（`body: Block`；
**从 `ts-ast.xl.md` 的 `projectStaticBlock` 搬来**，第 184 轮）。

产物那边体括号不在树里（`StaticBlock > Statement*`），所以 `Block` 要**自己造**：
按 `static` 之后的那个 `{` 与配对的 `}` 量区间（与 `projectTry` 里两个块同一套做法）。

```ts
  const statements = ctx.ProjectEach(ctx.Kids(v), "Block");
  const brace = ctx.source.indexOf("{", v.start);
  const close = brace >= 0 ? ctx.MatchingBrace(ctx.source, brace) : -1;
  const body =
    brace >= 0 && close >= brace ? { kind: "Block", statements, pos: brace, end: close + 1 } : undefined;
  return ctx.Node("ClassStaticBlockDeclaration", body === undefined ? {} : { body }, v);
```

## constructor:(template:Template)=>void

转调基类构造器，然后把**语句队列**装进自己的重组队列——静态块里是一串语句。

与 `FunctionBody` / `ClassBody` 同一做法：搬进来的内容是散单元，要在这里再跑一遍语句重组。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序与 `FunctionBody.Clone` 一致：`Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`。

```ts
const result = new StaticBlock(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
