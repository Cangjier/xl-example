# dependencies
```xl
import { SyntaxException } from "../../../core/exceptions/syntax-exception.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SkipNext } from "../../../core/extensions/list-extension.xl.md"
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

# class TryReorganization extends Reorganization

它做的事是**把整个 `try` 结构收成一个 `Try`**：从 `try` 关键字起，啃掉紧跟的 `Bracket`（语句体），再循环啃掉任意多个 `catch`（可选的 `(形参)` + 语句体），最后啃掉可选的 `finally` 语句体，然后用 `ReplaceCountAt` 把这一整段换成一个 `Try`。

`TryReorganization` 写在 `Try` **之前**。

## static readonly field Instance:TryReorganization = new TryReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `try` 关键字。

```ts
const current = Get(units, index);
if (current instanceof Identifier) {
  return current.Is("try");
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：扫描并打包整个 `try` 结构，**返回新的下标**——`units` 在这里被就地改写，下标也变了。

跳过 `LineWrap` 找下一个单元一律走 `SkipNext(units, endIndex, …)`；抛 `SyntaxException` 时第三个参数（内层异常）显式给 `null`。

```ts
const current = Get(units, index)!;
let endIndex = SkipNext(units, index, (item: Token) => item instanceof LineWrap);
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
const tryBody = result.CreateTryBody();
tryBody.SignIn(bracket.SourceRange.Start!);
tryBody.SignOut(bracket.SourceRange.End!);
bracket.MoveDataTo(tryBody);
tryBody.TryToClose();
// endIndex 就是 tryBody 的下标
const tryBodyEndIndex = endIndex;
endIndex = SkipNext(units, endIndex, (item: Token) => item instanceof LineWrap);
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
  containsCatch = true;
  endIndex = SkipNext(units, endIndex, (item: Token) => item instanceof LineWrap);
  const catchSecond = Get(units, endIndex)!;
  if (!(catchSecond instanceof Bracket)) {
    throw new SyntaxException(catchSecond.SourceRange, "catchSecond is not Bracket", null);
  }
  const catchSecondBracket = catchSecond;
  if (catchSecondBracket.startBracket === "(") {
    const catchDefine = result.CreateCatchDefine();
    catchSecondBracket.MoveDataTo(catchDefine);
    catchDefine.Sign(catchSecondBracket);
    catchDefine.TryToClose();
    // endIndex 是 catchDefine 的下标
    endIndex = SkipNext(units, endIndex, (item: Token) => item instanceof LineWrap);
    // endIndex 是 catchBody 的下标
    const catchThird = Get(units, endIndex)!;
    if (!(catchThird instanceof Bracket)) {
      throw new SyntaxException(catchThird.SourceRange, "catchThird is not Bracket", null);
    }
    const catchThirdBracket = catchThird;
    if (catchThirdBracket.startBracket === "{") {
      const catchBody = result.CreateCatchBody();
      catchThirdBracket.MoveDataTo(catchBody);
      catchBody.Sign(catchThirdBracket);
      catchBody.TryToClose();
    } else {
      throw new SyntaxException(catchThird.SourceRange, "catchThirdBracket.startBracket is not '{'", null);
    }
  } else if (catchSecondBracket.startBracket === "{") {
    const catchBody = result.CreateCatchBody();
    catchSecondBracket.MoveDataTo(catchBody);
    catchBody.Sign(catchSecondBracket);
    catchBody.TryToClose();
  } else {
    throw new SyntaxException(catchSecondBracket.SourceRange, "catchSecondBracket.startBracket is not '(' or '{'", null);
  }
}
// endIndex 是 catch body 的下标
endIndex = SkipNext(units, endIndex, (item: Token) => item instanceof LineWrap);
// endIndex 是 finally 关键字的下标
const finiallyKeyword = Get(units, endIndex);
if (finiallyKeyword instanceof Identifier && finiallyKeyword.Is("finally")) {
  endIndex = SkipNext(units, endIndex, (item: Token) => item instanceof LineWrap);
  // endIndex 是 finally body 的下标
  const finiallySecond = Get(units, endIndex)!;
  if (!(finiallySecond instanceof Bracket)) {
    throw new SyntaxException(finiallySecond.SourceRange, "finiallySecond is not Bracket", null);
  }
  if (finiallySecond.startBracket === "{") {
    const finiallyBody = result.CreateFinallyBody();
    finiallySecond.MoveDataTo(finiallyBody);
    finiallyBody.Sign(finiallySecond);
    finiallyBody.TryToClose();
  } else {
    throw new SyntaxException(finiallySecond.SourceRange, "finiallySecondBracket.startBracket is not '{'", null);
  }
} else {
  endIndex--;
}
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class Try extends IndependentToken

`try` 语句。

它**没有覆写 `ToXmlString`**，所以 XML 由基类 `Token` 产出：标签名是运行时类名 `Try`，内容是全部子单元的 XML 串接。子单元的顺序是 `TryBody`、若干 `CatchDefine` / `CatchBody`、可选的 `FinallyBody`——这个顺序由 `TryReorganization.Process` 的扫描顺序决定。

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

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。注意 `Try.Clone` **没有**拷贝静态注册信息，`TryReorganization` 也不参与克隆。

```ts
const result = new Try(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
