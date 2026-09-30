# dependencies
```xl
import { Get } from "../../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { TakeRange } from "../../../../core/extensions/list-extension.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { DeclarationEnd } from "../declaration-common.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { Symbol } from "../symbol.xl.md"

import { WhileBody } from "../while/while-body.xl.md"
import { WhileCompare } from "../while/while-compare.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`do … while` 语句：把 `do` 语句 `while` `(` 条件 `)` `;` 这一串单元重组成一个 `DoWhile`，
里面分成 Body（`do` 后面那条语句）与 Compare（`while` 那个条件括号整段）两段。

**为什么单开一条规则**：`do` 在关键字表里，没有它时 `do` 只是一个 `<Keyword>`，
后面的 `while(...)` 会被 `WhileReorganization` 抢走当成一个**独立的 while 语句**——
`do { x++ } while (x < 10)` 于是变成「`do` 关键字 + 空 while」，而不带分号的写法更糟：
`while` 会去找自己的循环体，找不到就抛 `Error`。

**两段的顺序与 `While` 相反**：`do` 的体在前、条件在后，所以 XML 里 Body 段排在 Compare 段之前。
两段复用 `While` 的类型（`WhileBody` / `WhileCompare`）——形状完全一样，
消费者可以按同一套标签处理两种循环。

`DoWhileReorganization` **不进 `Data`、不进 XML**，所以它的类名随便取。它必须写在 `DoWhile` **之前**：
`Instance` 这个静态字段在类定义时就会 `new DoWhileReorganization()`，写反了会命中暂时性死区（TDZ）。

反过来，`DoWhile` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class DoWhileReorganization extends Reorganization

重组规则：`do` + 一条语句 + `while` + `(` 开头的括号，整段换成一个 `DoWhile`。

## static readonly field Instance:DoWhileReorganization = new DoWhileReorganization()

唯一的实例。

## private method BodyEnd:(units:Array<Token>, index:int)=>int

`do` 后面那条语句的结尾下标；取不到时返回 `-1`。

`do` 的体有两种形状，与 `While` 一样分两路：

- `{` 开头的括号——体就是这一整个括号，返回它的下标；
- 其余——**往后找到那个 `while` 词**，它前面一个下标就是体的结尾。

第二种为什么不用 `Statement.SearchStatementEnd`：`do … while` 的体经常写作两行——
`do x++` 换行 `while (x < 10)`；体与 `while` 之间只有一个软换行（TypeScript 的 ASI 在这里断句），
`SearchStatementEnd` 对这种没有 `;` 的形状给不出结尾，于是整条 `do` 落回 `WhileReorganization` 手里，
然后因为「`while` 后面没有语句」抛错——正是这条规则要修的那个报错。

按定义，`do` 的体后面**必然**紧跟 `while`，所以直接找那个词最稳。代价是「体里嵌套了另一个 `do…while`」这种
极端写法会找错那个 `while`，这一层不做区分（TypeScript 里嵌套 `do` 也会被 ASI 断开，本来就极其罕见）。

```ts
const candidate = Get(units, index);
if (candidate instanceof Bracket && candidate.StartBracketChar === "{") {
  return index;
}
let i = index;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof Common && item.Is("while")) {
    return i - 1;
  }
  i = i + 1;
}
return -1;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一次 `do … while` 的起点。

判定要一路看到条件括号：只认 `do` 是不够的——`do` 也可能出现在别的地方（比如某个标识符的下一行开头），
必须确认「一条语句 + `while` + `(`」这个完整形状。

```ts
const common = Get(units, index);
if (!(common instanceof Common) || common.Is("do") === false) {
  return false;
}
let i = SkipNextWrapSymbol(units, index);
const bodyEnd = this.BodyEnd(units, i);
if (bodyEnd < 0) {
  return false;
}
i = SkipNextWrapSymbol(units, bodyEnd);
const whileWord = Get(units, i);
if (!(whileWord instanceof Common) || whileWord.Is("while") === false) {
  return false;
}
const condition = GetSkipNextWrapSymbol(units, i);
return condition instanceof Bracket && condition.StartBracketChar === "(";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：把 `do` 头、循环体、`while` 条件收进一个 `DoWhile`，**返回新的下标**。

顺序与 `WhileReorganization.Process` 一致：签入签出 → `MoveDataTo` 搬内容 → `TryToClose`。
两点不同：

1. 体的内容在前、条件在后（源顺序）；
2. 结尾多收一个可选的 `;`（`do { … } while (x);`），再交给 `DeclarationEnd` 吃掉尾随软换行——
   不这么做，那个 `;` 会留在父单元里，被语句重组收成一个空的 `Statement`。

```ts
const unit = Get(units, index)!;
const result = new DoWhile(template);
result.Parent = unit.Parent;
result.SignIn(unit.SourceRange.Start!);
let endIndex = SkipNextWrapSymbol(units, index);
const bodyStart = endIndex;
const bodyEnd = this.BodyEnd(units, bodyStart);
if (bodyEnd < 0) {
  throw new Error("`do` 后需要跟语句，如 `do {...} while (...)` 或 `do ...; while (...)`");
}
const bodySegment = result.CreateBody();
const bodyCandidate = Get(units, bodyStart);
if (bodyCandidate instanceof Bracket && bodyCandidate.StartBracketChar === "{") {
  bodyCandidate.MoveDataTo(bodySegment);
  bodySegment.SignIn(bodyCandidate.SourceRange.Start!);
  bodySegment.SignOut(bodyCandidate.SourceRange.End!);
} else {
  bodySegment.AddRange(TakeRange(units, bodyStart, bodyEnd - bodyStart + 1));
  bodySegment.SignIn(Get(units, bodyStart)!.SourceRange.Start!);
  bodySegment.SignOut(Get(units, bodyEnd)!.SourceRange.End!);
}
bodySegment.TryToClose();
endIndex = SkipNextWrapSymbol(units, bodyEnd);
endIndex = SkipNextWrapSymbol(units, endIndex);
const conditionBracket = Get(units, endIndex) as Bracket;
const compare = result.CreateCompare();
compare.SignIn(conditionBracket.SourceRange.Start!);
compare.SignOut(conditionBracket.SourceRange.End!);
conditionBracket.MoveDataTo(compare);
compare.TryToClose();
const semicolon = Get(units, endIndex + 1);
if (semicolon instanceof Symbol && semicolon.Is(";")) {
  endIndex = endIndex + 1;
}
endIndex = DeclarationEnd(units, endIndex);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
ReplaceCountAt(units, index, endIndex - index + 1, result);
return index;
```

# class DoWhile extends IndependentToken

`do … while` 语句单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<DoWhile>` 里依次是 Body、Compare 两段的 XML。

## constructor:(template:Template)=>void

转调基类构造器，没有自己的字段要初始化。

```ts
super(template);
```

## method CreateBody:()=>WhileBody

新建 Body 段并挂到自己名下，返回新单元。

```ts
return this.Add(new WhileBody(this.Template));
```

## property Body:WhileBody

Body 段（`do` 后面那条语句）。

### get

```ts
return this.Data.find((x) => x instanceof WhileBody) as WhileBody;
```

## method CreateCompare:()=>WhileCompare

新建 Compare 段并挂到自己名下，返回新单元。

```ts
return this.Add(new WhileCompare(this.Template));
```

## property Compare:WhileCompare

Compare 段（`while` 后面那个条件括号整段）。

### get

```ts
return this.Data.find((x) => x instanceof WhileCompare) as WhileCompare;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new DoWhile(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((x) => x.Clone()));
result.TryToClose();
return result;
```
