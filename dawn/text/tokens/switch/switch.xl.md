# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { DeclarationEnd } from "../declaration-common.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { Symbol } from "../symbol.xl.md"
import { SwitchCompare } from "./switch-compare.xl.md"
import { SwitchSegment } from "./switch-segment.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`switch` 语句：把 `switch (判别) { case …: … default: … }` 整段收成一个 `Switch`，
里面依次是判别段与若干 `SwitchSegment`。

**分段在括号的 `Data` 上做，不靠重组。** `{ }` 括号没有重组队列（见 `../bracket.xl.md` 的 `Use`），
所以 `switch` 体里的 `case` / `default` 到这一段重组跑起来时**还是散着的** `Common` ——
正好可以从头扫一遍切段。这也是为什么 `switch` 不需要像 `if` 那样在 `Root` 的队列里兜圈子：
它一次就把所有段都切完。

段与段的边界规则：`case` / `default` 这两个 `Common` 各自起一段，
段的终点是下一个 `case` / `default` 或列表末尾；段内第一个 `:` 符号之前是匹配表达式（`default` 没有），
之后是语句体。段内找不到 `:` 时整段都当语句体（形状不完整时不硬拆）。

`SwitchReorganization` 写在 `Switch` **之前**。

# class SwitchReorganization extends Reorganization

## static readonly field Instance:SwitchReorganization = new SwitchReorganization()

唯一的实例，注册进通用重组队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个 `switch` 语句的开头：内容是 `switch` 的 `Common`，
后面（跨过软换行）是一个 `(` 开的括号，再后面（跨过软换行）是一个 `{` 开的括号。

`switch` 在 `../parse-pipeline.xl.md` 的 `BanedMethodNames` 里，所以 `switch (x)` 不会被 `Method` 先吃掉。

```ts
const current = Get(units, index);
if (!(current instanceof Common) || !current.Is("switch")) {
  return false;
}
const compareIndex = SkipNextWrapSymbol(units, index);
const compare = Get(units, compareIndex);
if (!(compare instanceof Bracket) || compare.StartBracketChar !== "(") {
  return false;
}
const bodyIndex = SkipNextWrapSymbol(units, compareIndex);
const body = Get(units, bodyIndex);
return body instanceof Bracket && body.StartBracketChar === "{";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整个 `switch` 收成一个 `Switch`，**返回新的下标**。

要点：

- 判别括号的内容整段搬给 `SwitchCompare`，括号本身不再留在树里。
- `switch` 体的内容**逐个单元**分配：`case` / `default` 之前的匹配表达式给 `SwitchCase`，
  冒号之后的单元给 `SwitchStatement`。这里不能像 `Try` 那样整体 `MoveDataTo`——
  一个括号的内容要分给多个段，每个单元只能有一个父单元。
- 每一段、每一个子段都各自 `SignIn` / `SignOut` / `TryToClose()`：`SwitchCase` 与 `SwitchStatement`
  有自己的队列（前者通用、后者语句），关闭时才会跑。
- 范围终点取 `switch` 体的终点（含 `}`），并用 `DeclarationEnd` 把紧跟的软换行一并收进来
  （见 `../declaration-common.xl.md`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const compareIndex = SkipNextWrapSymbol(units, index);
const compareBracket = Get(units, compareIndex) as Bracket;
const bodyIndex = SkipNextWrapSymbol(units, compareIndex);
const body = Get(units, bodyIndex) as Bracket;
const endIndex = DeclarationEnd(units, bodyIndex);
const result = new Switch(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
const compare = result.CreateCompare();
compareBracket.MoveDataTo(compare);
compare.Sign(compareBracket);
compare.TryToClose();
const data = body.Data.slice();
const markers: number[] = [];
for (let i = 0; i < data.length; i++) {
  const item = data[i];
  if (item instanceof Common && (item.Is("case") || item.Is("default"))) {
    markers.push(i);
  }
}
for (let m = 0; m < markers.length; m++) {
  const from = markers[m];
  const to = m + 1 < markers.length ? markers[m + 1] : data.length;
  const key = (data[from] as Common).TempToString();
  const segment = result.CreateSegment();
  segment.Key = key;
  let colonIndex = to;
  for (let i = from + 1; i < to; i++) {
    const item = data[i];
    if (item instanceof Symbol && item.Is(":")) {
      colonIndex = i;
      break;
    }
  }
  if (key === "case" && colonIndex > from + 1) {
    const caseUnit = segment.CreateCase();
    for (let i = from + 1; i < colonIndex; i++) {
      caseUnit.Add(data[i]);
    }
    caseUnit.SignIn(data[from + 1].SourceRange.Start!);
    caseUnit.SignOut(data[colonIndex - 1].SourceRange.End!);
    caseUnit.TryToClose();
  }
  if (colonIndex + 1 < to) {
    const statement = segment.CreateStatement();
    for (let i = colonIndex + 1; i < to; i++) {
      statement.Add(data[i]);
    }
    statement.SignIn(data[colonIndex + 1].SourceRange.Start!);
    statement.SignOut(data[to - 1].SourceRange.End!);
    statement.TryToClose();
  }
  segment.SignIn(data[from].SourceRange.Start!);
  segment.SignOut(data[to - 1].SourceRange.End!);
  segment.TryToClose();
}
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class Switch extends IndependentToken

`switch` 语句单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<Switch>` 里依次是 `SwitchCompare` 与各段的 XML。

## method CreateCompare:()=>SwitchCompare

新建判别段并挂到自己名下，返回新单元。

```ts
return this.Add(new SwitchCompare(this.Template));
```

## property Compare:SwitchCompare

判别段：子单元列表里**第一个** `SwitchCompare`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof SwitchCompare) {
    return item;
  }
}
throw new Error("找不到匹配的子单元");
```

## method CreateSegment:()=>SwitchSegment

新建一段并挂到自己名下，返回新单元。

```ts
return this.Add(new SwitchSegment(this.Template));
```

## property Segments:Array<SwitchSegment>

全部段，保持它们在 `Data` 里的原始顺序。

与 `Try.Catches` 同一种取法（按类型收窄，子单元是引用而不是克隆）。

### get

```ts
const result: SwitchSegment[] = [];
for (const item of this.Data) {
  if (item instanceof SwitchSegment) {
    result.push(item);
  }
}
return result;
```

## method Clone:()=>Token

克隆自身。

顺序与 `Try.Clone` 一致。

```ts
const result = new Switch(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
