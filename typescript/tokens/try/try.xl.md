# dependencies
```xl
import { SyntaxException } from "../../../core/exceptions/syntax-exception.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenField } from "../../../core/syntax/token-field.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SkipNext } from "../../../core/extensions/list-extension.xl.md"
import { CommentsIn, SkipNextTrivia, SkipPreviousTrivia } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
import { CatchBody } from "./catch-body.xl.md"
import { CatchDefine } from "./catch-define.xl.md"
import { FinallyBody } from "./finally-body.xl.md"
import { TryBody } from "./try-body.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`try` 语句：把 `try` / `catch` / `finally` 三段扫描出来，打包成一个 `Try` 单元。

# class TryCloseRule extends CloseRule

它做的事是**把整个 `try` 结构收成一个 `Try`**：从 `try` 关键字起，啃掉紧跟的 `Bracket`（语句体），再循环啃掉任意多个 `catch`（可选的 `(形参)` + 语句体），最后啃掉可选的 `finally` 语句体，然后用 `ReplaceCountAt` 把这一整段换成一个 `Try`。

`TryCloseRule` 写在 `Try` **之前**。

## static readonly field Instance:TryCloseRule = new TryCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `try` 关键字。

**只看「是不是这个名字」是不够的**（第 331 轮）——**这一条是实测逼出来的**。
`try` 在 JS 里**合法地**能当属性名：`{ try: 1 }`、`o.try`、`o.try = 5`，
而 `Promise.try` 从 ES2025 起**是一个标准方法**（第 331 轮刚把它做出来）。
原来这一支只问「这个 `Identifier` 的文本是不是 `try`」 ⇒ 上面每一种写法都会被它**抢走**，
紧接着 `Process` 发现后面不是 `{` ⇒ 抛 `SyntaxException` ⇒
**整份文件进不来**（`throw by line 0 --->`——**一句话里没有一个字提到 `try`**，
看起来像「语法层坏了」）。实测：`const o = { try: 1 }`、`o.try = 5`、
`console.log(typeof Promise.try)` 三条**一起**是红的，
而同族的 `catch` / `class` / `if` / `new` / `typeof` 当属性名**全是好的**
（它们的规则各有各的位置闸，只有这一支漏了）。

**闸就架在「这一条规则自己要什么」上**：`Process` 的第一件事是要求
**紧跟一个 `{` 块**（否则它自己就抛 `next is not Bracket`）——
所以「后面真的跟一个 `{` 块」本来就是这条规则的**前提**，
把前提提到 `Previous` 里，这一支就从「抢了再抛」变成「**不是我的让开**」。
**没有另加一套位置判据**（`IsStatementStart` 那一套在这里答不了：
`o.try = 5` 里 `try` 前面是一个 `.` 符号、`{ try: 1 }` 里它前面是 `{`，
两处的「前一个单元」都不是 `Identifier`/`String` ⇒ 那一支会说「是语句开头」）。

**代价写在明处**：`try` 后面**不是**块的那种输入（本来就非法，`try x;`）
从「一条语法异常」变成「这一支不管它」——它接下来会当成普通标识符。

```ts
const current = Get(units, index);
if (current instanceof Identifier) {
  if (!current.Is("try")) return false;
  // **后面必须真的跟一个 `{` 块**（软换行**与注释**都要跳过去：
  // `try` 与 `{` 之间夹一条注释是日常写法，而注释在 TypeScript 里是 trivia
  // ⇒ 只跳软换行会把 `try /* c */ { }` 判成「不是我的」，整条语句退化成一个 `ExpressionStatement`）。
  const after = SkipNextTrivia(units, index);
  const next = Get(units, after);
  if (next === null) return false;
  return next instanceof Bracket && next.startBracket === "{";
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：扫描并打包整个 `try` 结构，**返回新的下标**——`units` 在这里被就地改写，下标也变了。

跳过 **trivia**（软换行与注释）找下一个单元一律走 `SkipNextTrivia(units, endIndex)`；
抛 `SyntaxException` 时第三个参数（内层异常）显式给 `null`。

**为什么跳的是 trivia**（第 595 轮）：`try /* c */ { }` / `catch /* c */ { }` 在 TypeScript 里
都是 `TryStatement`，而只跳软换行会撞上注释 ⇒ `next is not Bracket` ⇒ 整条语句
退化成一个 `ExpressionStatement`（实测 `try /* c */ { } catch { }`：
缺 `TryStatement` 1 + 两个 `Block` + `CatchClause`，多出 `ExpressionStatement` 1）。
**跨过的注释由 `CommentsIn` 收进 `result`**——不收就等于删掉（它们落在被替换的那一段里）。
**没有 `finally` 时那一步回退也走 trivia**：`endIndex--` 会退到注释上，
而注释的右端在体之后 ⇒ `Try` 的范围被拉长。

```ts
const current = Get(units, index)!;
let endIndex = SkipNextTrivia(units, index);
const next = Get(units, endIndex);
if (next === null) {
  throw new SyntaxException(current.SourceRange, "next is null", null);
}
if (!(next instanceof Bracket)) {
  throw new SyntaxException(next.SourceRange, "next is not Bracket", null);
}
const bracket = next;
const result = new Try(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.AddRange(CommentsIn(units, index + 1, endIndex));
const tryBody = result.CreateTryBody();
tryBody.SignIn(bracket.SourceRange.Start!);
tryBody.SignOut(bracket.SourceRange.End!);
bracket.MoveDataTo(tryBody);
tryBody.TryToClose();
// **体的花括号当场记进字段**（第 586 轮）：投影于是不用回原文里找那一对括号
//（见下面 `Try.TryBrace` 那一处的说明）。
result.TryBrace.Set(bracket.SourceRange.Start!.Index, bracket.SourceRange);
// endIndex 就是 tryBody 的下标
const tryBodyEndIndex = endIndex;
let cursor = endIndex;
endIndex = SkipNextTrivia(units, endIndex);
let containsCatch = false;
// endIndex 是 catch 或 finally 关键字的下标
while (true) {
  const catchFirst = Get(units, endIndex);
  if (!(catchFirst instanceof Identifier) || !catchFirst.Is("catch")) {
    if (!containsCatch) {
      endIndex = tryBodyEndIndex;
    }
    break;
  }
  result.AddRange(CommentsIn(units, cursor + 1, endIndex));
  containsCatch = true;
  result.CatchWord.Set(catchFirst.SourceRange.Start!.Index, catchFirst.SourceRange);
  cursor = endIndex;
  endIndex = SkipNextTrivia(units, endIndex);
  const catchSecond = Get(units, endIndex)!;
  if (!(catchSecond instanceof Bracket)) {
    throw new SyntaxException(catchSecond.SourceRange, "catchSecond is not Bracket", null);
  }
  result.AddRange(CommentsIn(units, cursor + 1, endIndex));
  cursor = endIndex;
  const catchSecondBracket = catchSecond;
  if (catchSecondBracket.startBracket === "(") {
    const catchDefine = result.CreateCatchDefine();
    catchSecondBracket.MoveDataTo(catchDefine);
    catchDefine.Sign(catchSecondBracket);
    catchDefine.TryToClose();
    // endIndex 是 catchDefine 的下标
    endIndex = SkipNextTrivia(units, endIndex);
    // endIndex 是 catchBody 的下标
    const catchThird = Get(units, endIndex)!;
    if (!(catchThird instanceof Bracket)) {
      throw new SyntaxException(catchThird.SourceRange, "catchThird is not Bracket", null);
    }
    result.AddRange(CommentsIn(units, cursor + 1, endIndex));
    cursor = endIndex;
    const catchThirdBracket = catchThird;
    if (catchThirdBracket.startBracket === "{") {
      const catchBody = result.CreateCatchBody();
      catchThirdBracket.MoveDataTo(catchBody);
      catchBody.Sign(catchThirdBracket);
      catchBody.TryToClose();
      result.CatchBrace.Set(catchThirdBracket.SourceRange.Start!.Index, catchThirdBracket.SourceRange);
    } else {
      throw new SyntaxException(catchThird.SourceRange, "catchThirdBracket.startBracket is not '{'", null);
    }
  } else if (catchSecondBracket.startBracket === "{") {
    const catchBody = result.CreateCatchBody();
    catchSecondBracket.MoveDataTo(catchBody);
    catchBody.Sign(catchSecondBracket);
    catchBody.TryToClose();
    result.CatchBrace.Set(catchSecondBracket.SourceRange.Start!.Index, catchSecondBracket.SourceRange);
  } else {
    throw new SyntaxException(catchSecondBracket.SourceRange, "catchSecondBracket.startBracket is not '(' or '{'", null);
  }
}
// endIndex 是 catch body 的下标
endIndex = SkipNextTrivia(units, endIndex);
// endIndex 是 finally 关键字的下标
const finiallyKeyword = Get(units, endIndex);
if (finiallyKeyword instanceof Identifier && finiallyKeyword.Is("finally")) {
  result.AddRange(CommentsIn(units, cursor + 1, endIndex));
  result.FinallyWord.Set(finiallyKeyword.SourceRange.Start!.Index, finiallyKeyword.SourceRange);
  cursor = endIndex;
  endIndex = SkipNextTrivia(units, endIndex);
  // endIndex 是 finally body 的下标
  const finiallySecond = Get(units, endIndex)!;
  if (!(finiallySecond instanceof Bracket)) {
    throw new SyntaxException(finiallySecond.SourceRange, "finiallySecond is not Bracket", null);
  }
  result.AddRange(CommentsIn(units, cursor + 1, endIndex));
  if (finiallySecond.startBracket === "{") {
    const finiallyBody = result.CreateFinallyBody();
    finiallySecond.MoveDataTo(finiallyBody);
    finiallyBody.Sign(finiallySecond);
    finiallyBody.TryToClose();
    result.FinallyBrace.Set(finiallySecond.SourceRange.Start!.Index, finiallySecond.SourceRange);
  } else {
    throw new SyntaxException(finiallySecond.SourceRange, "finiallySecondBracket.startBracket is not '{'", null);
  }
} else {
  endIndex = SkipPreviousTrivia(units, endIndex);
}
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class Try extends IndependentToken

`try` 语句。

它**没有覆写 `ToXmlString`**，所以 XML 由基类 `Token` 产出：标签名是运行时类名 `Try`，内容是全部子单元的 XML 串接。子单元的顺序是 `TryBody`、若干 `CatchDefine` / `CatchBody`、可选的 `FinallyBody`——这个顺序由 `TryCloseRule.Process` 的扫描顺序决定。

## field TryBrace:TokenField<number> = new TokenField<number>(-1)

`try` 体那一对花括号：**值是开括号的偏移**，`Range` 是**整对括号**（含两边）。

**为什么要有这一格**：投影原来**回原文里找**——`ctx.source.indexOf("{", tryAt)` 再 `ctx.MatchingBrace`
（见下面 `PrintDirectAst` 第 586 轮之前那一版）。那是**第二份位置答案**：块里的字符串与注释同样有
花括号，而打包那一刻（`TryCloseRule.Process`）**括号就在手上** ⇒ 当场记下来，
投影只读这一格。`TokenField` 的「值 + 区间」正好装下「开括号在哪、整对到哪」。

## field CatchWord:TokenField<number> = new TokenField<number>(-1)

`catch` 那个词的偏移（`Range` 是它自己的区间）；没有 `catch` 段时是 `-1` / `null`。

## field CatchBrace:TokenField<number> = new TokenField<number>(-1)

`catch` 体那一对花括号（值的含义与 `TryBrace` 同）；`catch` 体不是带花括号的块时是 `-1` / `null`。

## field FinallyWord:TokenField<number> = new TokenField<number>(-1)

`finally` 那个词的偏移；没有 `finally` 段时是 `-1` / `null`。

## field FinallyBrace:TokenField<number> = new TokenField<number>(-1)

`finally` 体那一对花括号；没有 `finally` 段时是 `-1` / `null`。

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 995 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，但只许用**这个 token 自己**的东西——
属性、子单元与 `Parent`（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。

**这一页早就把三处「回原文找」搬成字段了**（第 586 / 893 轮：`TryBrace` / `CatchBrace` /
`FinallyBrace` / `CatchWord`），所以直出版与上面是**逐行同一份**——没有一处回原文查，
也没有一处需要让开。

```ts
  const seg = (key: any) => ctx.KidsOf(v, key).filter((k: any) => !ctx.Invisible.has(k.Tag()));
  const props: any = {};
  const blockOf = (field: any, statements: any) => {
    const range = field.Range;
    if (range === null || range.Start === null || range.End === null) return undefined;
    return { kind: "Block", statements, pos: range.Start.Index, end: range.End.Index + 1 };
  };
  const tryBlock = blockOf(this.TryBrace, ctx.ProjectEach(seg("body"), "Block"));
  if (tryBlock !== undefined) props.tryBlock = tryBlock;
  const catches = seg("catches");
  const catchDefine = catches.find((k: any) => k.Tag() === "CatchDefine");
  const catchBody = catches.find((k: any) => k.Tag() === "CatchBody");
  if (catchDefine !== undefined || catchBody !== undefined) {
    const inner: any = {};
    if (catchDefine !== undefined) {
      const binding = ctx.AllKids(catchDefine).find((k: any) => !ctx.Invisible.has(k.Tag()));
      const isPattern =
        binding !== undefined &&
        (binding.Tag() === "ObjectLiteral" ||
          binding.Tag() === "ArrayLiteral" ||
          (binding.Tag() === "Bracket" &&
            (binding.startBracket === "{" || binding.startBracket === "[")));
      const name =
        binding === undefined
          ? undefined
          : isPattern
            ? ctx.BindingPattern(binding)
            : ctx.Project(binding);
      if (name !== undefined) {
        let declEnd = name.end;
        let declType: any = undefined;
        const typeKid = ctx.AllKids(catchDefine).find((k: any) => k.Tag() === "TypeDefine");
        if (typeKid !== undefined) {
          declEnd = ctx.EndOf(typeKid);
          const typeUnit = ctx.AllKids(typeKid).find((k: any) => !ctx.Invisible.has(k.Tag()));
          if (typeUnit !== undefined) {
            declType = ctx.TypeExpression(ctx.Kids(typeKid));
          }
        }
        inner.variableDeclaration = declType === undefined
          ? { kind: "VariableDeclaration", name, pos: name.pos, end: declEnd }
          : { kind: "VariableDeclaration", name, type: declType, pos: name.pos, end: declEnd };
      }
    }
    if (catchBody !== undefined) inner.block = ctx.Project(catchBody);
    const at = this.CatchWord.Value >= 0 ? this.CatchWord.Value : ctx.StartOf(catchDefine !== undefined ? catchDefine : catchBody);
    props.catchClause = {
      kind: "CatchClause",
      pos: at,
      end: catchBody !== undefined ? ctx.EndOf(catchBody) : ctx.EndOf(catchDefine),
      ...inner,
    };
  }
  const finallyBlock = blockOf(this.FinallyBrace, ctx.ProjectEach(seg("finally"), "Block"));
  if (finallyBlock !== undefined) props.finallyBlock = finallyBlock;
  return ctx.NodeHead("TryStatement", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method CreateTryBody:()=>TryBody

新建一个 `TryBody` 并挂到自己名下。

```ts
return this.Add(new TryBody(this.Template));
```

## property TryBody:TryBody

第一个 `TryBody` 子单元。

### get

用 `find` 找第一个命中的，找不到抛错。

```ts
const result = this.Data.find((item) => item instanceof TryBody);
if (result === undefined) {
  throw new Error("找不到匹配的子单元");
}
return result;
```

## method CreateCatchDefine:()=>CatchDefine

新建一个 `CatchDefine` 并挂到自己名下。

```ts
return this.Add(new CatchDefine(this.Template));
```

## method CreateCatchBody:()=>CatchBody

新建一个 `CatchBody` 并挂到自己名下。

```ts
return this.Add(new CatchBody(this.Template));
```

## property Catches:Array<Token>

全部 `catch` 相关的子单元：`CatchDefine` 与 `CatchBody` 混合，保持它们在 `Data` 里的原始顺序。

### get

按类型收窄成 `Array<Token>`；注意子单元是**引用**而不是克隆。

```ts
const result: Token[] = [];
for (const item of this.Data) {
  if (item instanceof CatchDefine || item instanceof CatchBody) {
    result.push(item);
  }
}
return result;
```

## method CreateFinallyBody:()=>FinallyBody

新建一个 `FinallyBody` 并挂到自己名下。

```ts
return this.Add(new FinallyBody(this.Template));
```

## property FinallyBody:FinallyBody | null

第一个 `FinallyBody` 子单元；没有 `finally` 段时给 `null`。

### get

找不到 `FinallyBody` 时给 `null`。

```ts
const result = this.Data.find((item) => item instanceof FinallyBody);
return result ?? null;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `body` 段，外加两处可选键。

`Try` 与前面几个分段节点不同：它的子单元在 `Data` 里是**混着**的（`TryBody`、若干 `CatchDefine` /
`CatchBody`、可选的 `FinallyBody`），所以不能像 `While` 那样按固定的两个段名各写一个 `ToList()`。

- `body` 装 `TryBody` 那一段，结构与其它语句体一致，取 `ToList()`（一批子单元的容器）；
- `catches` **只在 `this.Catches.length > 0` 时写**：这个属性是按类型从 `Data` 里筛出来的
  一组引用、不是一个容器节点，所以没有现成的 `ToList()` 可调，只能逐个 `item.ToDictionary()`；
  没有 `catch` 的 `try` 不写这个键——与 XML 里「没有那些 `<CatchDefine>` / `<CatchBody>` 子单元」同一件事；
- `finally` **只在 `this.FinallyBody !== null` 时写**：没有 `finally` 段的 `try` 不写这个键。
  它是**一个**节点，但语句体本身是一批子单元，所以取它的 `ToList()`。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("body", this.TryBody.ToList());
if (this.Catches.length !== 0) {
  const catches: Array<any> = [];
  for (const item of this.Catches) {
    catches.push(item.ToDictionary());
  }
  result.set("catches", catches);
}
if (this.FinallyBody !== null) {
  result.set("finally", this.FinallyBody.ToList());
}
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。注意 `Try.Clone` **没有**拷贝静态注册信息，`TryCloseRule` 也不参与克隆。

```ts
const result = new Try(this.Template);
result.Sign(this);
// **五个位置字段都要抄**：漏了克隆体就丢掉那三段花括号的坐标，
// 投影于是退回「一个 `Block` 都不出」（与 `class.xl.md` 的 `Clone` 同一口径）。
result.TryBrace = this.TryBrace;
result.CatchWord = this.CatchWord;
result.CatchBrace = this.CatchBrace;
result.FinallyWord = this.FinallyWord;
result.FinallyBrace = this.FinallyBrace;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
