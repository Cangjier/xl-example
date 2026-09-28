# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { SyntaxException } from "../../../../core/exceptions/syntax-exception.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SkipNext } from "../../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { WrapSymbol } from "../wrap-symbol.xl.md"
import { CatchBody } from "./catch-body.xl.md"
import { CatchDefine } from "./catch-define.xl.md"
import { FinallyBody } from "./finally-body.xl.md"
import { TryBody } from "./try-body.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`try` 语句：把 `try` / `catch` / `finally` 三段扫描出来，打包成一个 `Try` 单元。

# class TryReorganization extends Reorganization

原 C# 是嵌套类 `Try.Reorganization`（M32 展平改名）。

它做的事是**把整个 `try` 结构收成一个 `Try`**：从 `try` 关键字起，啃掉紧跟的 `Bracket`（语句体），再循环啃掉任意多个 `catch`（可选的 `(形参)` + 语句体），最后啃掉可选的 `finally` 语句体，然后用 `ReplaceAt` 把这一整段换成一个 `Try`。

按 M33，展平的嵌套类写在 `Try` **之前**。

## static readonly field Instance:TryReorganization = new TryReorganization()

唯一的实例。

原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段，调用点形态不变。

## method Previous:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>bool

`index` 处是不是 `try` 关键字。

原 C# 用 `units.Get(index) is Common common && common.Is("try")`：`Get` 是 `ListExtension` 的扩展方法（M11 改成模块级函数），`is Common common` 是模式匹配，ts 侧写成 `instanceof` 后再取用。

```ts
const current = Get(units, index);
if (current instanceof Common) {
  return current.Is("try");
}
return false;
```

## method Process:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>int

执行重组：扫描并打包整个 `try` 结构，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值——`units` 在这里被就地改写，下标也变了。

C# 各处用 `units.Get(endIndex)` 取「跳过 `WrapSymbol` 之后的下一个单元」；`Get` 是扩展方法（M11 改成模块级函数 `Get(units, …)`）。`SyntaxException<char>` 按 M27 写成 `SyntaxException<string>`，第三个参数（内层异常）C# 侧省略，ts 侧显式给 `null`。

```ts
const current = Get(units, index)!;
let endIndex = SkipNext(units, index, (item: Token<string>) => item instanceof WrapSymbol);
const next = Get(units, endIndex);
if (next === null) {
  throw new SyntaxException<string>(current.SourceRange, "next is null", null);
}
if (!(next instanceof Bracket)) {
  throw new SyntaxException<string>(next.SourceRange, "next is not Bracket", null);
}
const bracket = next;
const result = new Try(owner, template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
const tryBody = result.CreateTryBody();
tryBody.SignIn(bracket.SourceRange.Start!);
tryBody.SignOut(bracket.SourceRange.End!);
bracket.MoveDataTo(tryBody);
tryBody.TryToClose();
// endIndex 就是 tryBody 的下标
const tryBodyEndIndex = endIndex;
endIndex = SkipNext(units, endIndex, (item: Token<string>) => item instanceof WrapSymbol);
let containsCatch = false;
// endIndex 是 catch 或 finally 关键字的下标
while (true) {
  const catchFirst = Get(units, endIndex);
  if (!(catchFirst instanceof Common) || !catchFirst.Is("catch")) {
    if (!containsCatch) {
      endIndex = tryBodyEndIndex;
    }
    break;
  }
  containsCatch = true;
  endIndex = SkipNext(units, endIndex, (item: Token<string>) => item instanceof WrapSymbol);
  const catchSecond = Get(units, endIndex)!;
  if (!(catchSecond instanceof Bracket)) {
    throw new SyntaxException<string>(catchSecond.SourceRange, "catchSecond is not Bracket", null);
  }
  const catchSecondBracket = catchSecond;
  if (catchSecondBracket.StartBracketChar === "(") {
    const catchDefine = result.CreateCatchDefine();
    catchSecondBracket.MoveDataTo(catchDefine);
    catchDefine.Sign(catchSecondBracket);
    catchDefine.TryToClose();
    // endIndex 是 catchDefine 的下标
    endIndex = SkipNext(units, endIndex, (item: Token<string>) => item instanceof WrapSymbol);
    // endIndex 是 catchBody 的下标
    const catchThird = Get(units, endIndex)!;
    if (!(catchThird instanceof Bracket)) {
      throw new SyntaxException<string>(catchThird.SourceRange, "catchThird is not Bracket", null);
    }
    const catchThirdBracket = catchThird;
    if (catchThirdBracket.StartBracketChar === "{") {
      const catchBody = result.CreateCatchBody();
      catchThirdBracket.MoveDataTo(catchBody);
      catchBody.Sign(catchThirdBracket);
      catchBody.TryToClose();
    } else {
      throw new SyntaxException<string>(catchThird.SourceRange, "catchThirdBracket.StartBracketChar is not '{'", null);
    }
  } else if (catchSecondBracket.StartBracketChar === "{") {
    const catchBody = result.CreateCatchBody();
    catchSecondBracket.MoveDataTo(catchBody);
    catchBody.Sign(catchSecondBracket);
    catchBody.TryToClose();
  } else {
    throw new SyntaxException<string>(catchSecondBracket.SourceRange, "catchSecondBracket.StartBracketChar is not '(' or '{'", null);
  }
}
// endIndex 是 catch body 的下标
endIndex = SkipNext(units, endIndex, (item: Token<string>) => item instanceof WrapSymbol);
// endIndex 是 finally 关键字的下标
const finiallyKeyword = Get(units, endIndex);
if (finiallyKeyword instanceof Common && finiallyKeyword.Is("finally")) {
  endIndex = SkipNext(units, endIndex, (item: Token<string>) => item instanceof WrapSymbol);
  // endIndex 是 finally body 的下标
  const finiallySecond = Get(units, endIndex)!;
  if (!(finiallySecond instanceof Bracket)) {
    throw new SyntaxException<string>(finiallySecond.SourceRange, "finiallySecond is not Bracket", null);
  }
  if (finiallySecond.StartBracketChar === "{") {
    const finiallyBody = result.CreateFinallyBody();
    finiallySecond.MoveDataTo(finiallyBody);
    finiallyBody.Sign(finiallySecond);
    finiallyBody.TryToClose();
  } else {
    throw new SyntaxException<string>(finiallySecond.SourceRange, "finiallySecondBracket.StartBracketChar is not '{'", null);
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

原 C# 侧是 `public class Try : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它**没有覆写 `ToXmlString`**，所以 XML 由基类 `Token` 产出：标签名是运行时类名 `Try`，内容是全部子单元的 XML 串接。子单元的顺序是 `TryBody`、若干 `CatchDefine` / `CatchBody`、可选的 `FinallyBody`——这个顺序由 `TryReorganization.Process` 的扫描顺序决定。

## constructor:(owner:IOwner, template:Template<string>)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## method CreateTryBody:()=>TryBody

新建一个 `TryBody` 并挂到自己名下。

原 C# 是 `TryBody CreateTryBody() => Add(new TryBody(Owner, Template));`。

```ts
return this.Add(new TryBody(this.Owner, this.Template));
```

## property TryBody:TryBody

第一个 `TryBody` 子单元。

### get

原 C# 是 `public TryBody TryBody => (TryBody?)Data.FirstOrDefault(item => item is TryBody) ?? throw new NullReferenceException();`——找不到就抛空引用。ts 侧用 `find` 找第一个命中的，找不到抛错。

```ts
const result = this.Data.find((item) => item instanceof TryBody);
if (result === undefined) {
  throw new Error("NullReferenceException");
}
return result;
```

## method CreateCatchDefine:()=>CatchDefine

新建一个 `CatchDefine` 并挂到自己名下。

原 C# 是 `CatchDefine CreateCatchDefine() => Add(new CatchDefine(Owner, Template));`。

```ts
return this.Add(new CatchDefine(this.Owner, this.Template));
```

## method CreateCatchBody:()=>CatchBody

新建一个 `CatchBody` 并挂到自己名下。

原 C# 是 `CatchBody CreateCatchBody() => Add(new CatchBody(Owner, Template));`。

```ts
return this.Add(new CatchBody(this.Owner, this.Template));
```

## property Catches:Array<Token<string>>

全部 `catch` 相关的子单元：`CatchDefine` 与 `CatchBody` 混合，保持它们在 `Data` 里的原始顺序。

### get

原 C# 是 `public Token<char>[] Catches => Data.Where(item => item is CatchDefine || item is CatchBody).ToArray();`。ts 侧按类型收窄成 `Array<Token<string>>`；注意子单元是**引用**而不是克隆，与原实现一致。

```ts
const result: Token<string>[] = [];
for (const item of this.Data) {
  if (item instanceof CatchDefine || item instanceof CatchBody) {
    result.push(item);
  }
}
return result;
```

## method CreateFinallyBody:()=>FinallyBody

新建一个 `FinallyBody` 并挂到自己名下。

原 C# 是 `FinallyBody CreateFinallyBody() => Add(new FinallyBody(Owner, Template));`。

```ts
return this.Add(new FinallyBody(this.Owner, this.Template));
```

## property FinallyBody:FinallyBody | null

第一个 `FinallyBody` 子单元；没有 `finally` 段时给 `null`。

### get

原 C# 是 `public FinallyBody? FinallyBody => (FinallyBody?)Data.FirstOrDefault(item => item is FinallyBody);`——`FirstOrDefault` 找不到给 `default`，对引用类型就是 `null`。

```ts
const result = this.Data.find((item) => item instanceof FinallyBody);
return result ?? null;
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，`body` 是 `TryBody` 的 `ToList()`，有 `catch` 时加 `catches` 数组，有 `finally` 时加 `finally`。

原 C# 的键顺序是 `type` → `body` → `catches` → `finally`，照抄。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("body", this.TryBody.ToList());
const catches = this.Catches;
if (catches.length > 0) {
  const catchArray: any[] = [];
  for (const item of catches) {
    catchArray.push(item.ToDictionary());
  }
  result.set("catches", catchArray);
}
const finallyBody = this.FinallyBody;
if (finallyBody !== null) {
  result.set("finally", finallyBody.ToList());
}
return result;
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；按 M14(c) 用 `AddRange`。注意 `Try.Clone` **没有**拷贝静态注册信息，`TryReorganization` 也不参与克隆。

```ts
const result = new Try(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
