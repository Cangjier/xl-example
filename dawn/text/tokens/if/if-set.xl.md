# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { Statement } from "../statement.xl.md"
import { IfSegment } from "./if-segment.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 语句：把 `if (...) {...} else if (...) {...} else {...}` 这一长串单元重组成一个 `IfSet`，里面按段装 `IfSegment`。

重组规则类 `IfSetReorganization` **不进 `Data`、不进 XML**，所以它的类名随便取。反过来，`IfSet` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。`Root` 构造时会把 `IfSetReorganization.Instance` 注册进通用重组队列。

# class IfSetReorganization extends Reorganization

重组规则：`if` 加一个 `(` 开头的 `Bracket`，就整段换成一个 `IfSet`。

它是 token 层最长的一条重组：从 `if` 开始，逐段吃掉「关键字 + 条件括号 + 语句体」，遇到 `else` 就回头看它后面跟的是 `if`（继续当 `else if`）还是别的（当 `else`，循环到此结束），每一段都做成一个 `IfSegment`。

## static readonly field Instance:IfSetReorganization = new IfSetReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `if` 的 `Common`，紧跟（跳过 `WrapSymbol` 软换行）一个 `(` 开头的 `Bracket`。

```ts
const unit = Get(units, index);
if (!(unit instanceof Common) || !unit.Is("if")) {
  return false;
}
const next = GetSkipNextWrapSymbol(units, index);
return next instanceof Bracket && next.StartBracketChar === "(";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：把整条 `if / else if / else` 链收进一个 `IfSet`，**返回新的下标**。

重组把这一整段换成一个 `IfSet`，下标必须跟着走。这里的方法体**从不给 `index` 赋值**，所以原样 `return index;`——替换后位置 `index` 上是新插入的 `IfSet`，外层 `for` 自增一步正好落在它后面。

`ReplaceCountAt(units, index, count, result)` 把从 `index` 起的 `count` 个单元换成一个 `IfSet`。

两处抛错都用 `new Error("…")`（不进规范类型位），消息原样保留。

几点说明：

1. **签入 / 签出取的是 `Source` 本身**。`Start` 是 `Source | null`，所以一律写成 `Get(units, i)!.SourceRange.Start!`——取出来的是**位置**，不是字符。
2. **`ifKey` 的取法**：关键字所在单元按 `Common` 取文本（`if` / `else`）。
3. **第一段与后续段的签入点不同**：第一段（`Data.Count == 1`）从关键字自身签入；`else if` 从关键字**前一个**单元签入（带上 `else`），`else` 从关键字自身签入。
4. **条件括号**：`if` 后面必须跟一个 `Bracket`，把括号里的子单元整体 `MoveDataTo` 给新建的 `IfCondition`，再按括号的起止签入签出。
5. **语句体**：括号后面若是 `{` 开头的 `Bracket`，整块搬给 `IfStatement`；否则当成单条语句，用 `Statement.SearchStatementEnd` 找回语句结尾（`-1` 即失败），取 `[currentIndex, endIndex]` 这一段用数组原生的 `slice(currentIndex, endIndex + 1)` 取出，按 `AddRange` 交给 `IfStatement`。
6. **续段判定**：语句体之后再跳掉软换行，若遇到内容为 `else` 的 `Common`，就再看它后面是不是 `if`：是则把 `lastKeyIndex` / `currentIndex` 都推到那个 `if`（`else if`），否则把 `lastKeyIndex` 设到 `else`（最后一段）；不是 `else` 就把 `endIndex = currentIndex - 1` 并收尾。

```ts
const result = new IfSet(template);
result.Parent = Get(units, index)!.Parent;
result.SignIn(Get(units, index)!.SourceRange.Start!);
const startIndex = index;
let endIndex = index;
let currentIndex = index;
let lastKeyIndex = index;
while (true) {
  const ifSeg = result.Add(new IfSegment(template));
  const ifKey = (Get(units, lastKeyIndex) as Common).TempToString();
  if (result.Data.length === 1) {
    ifSeg.SignIn(Get(units, lastKeyIndex)!.SourceRange.Start!);
  } else {
    if (ifKey === "if") {
      ifSeg.SignIn(Get(units, lastKeyIndex - 1)!.SourceRange.Start!);
    } else if (ifKey === "else") {
      ifSeg.SignIn(Get(units, lastKeyIndex)!.SourceRange.Start!);
    }
  }
  ifSeg.Key = ifKey;
  if (ifKey === "if") {
    currentIndex = SkipNextWrapSymbol(units, lastKeyIndex);
    const condition = Get(units, currentIndex);
    if (!(condition instanceof Bracket)) {
      throw new Error("if/else if 后需要跟条件，如if(...)");
    }
    const ifCondition = ifSeg.CreateCondition();
    condition.MoveDataTo(ifCondition);
    ifCondition.SignIn(condition.SourceRange.Start!);
    ifCondition.SignOut(condition.SourceRange.End!);
    ifCondition.TryToClose();
  }
  currentIndex = SkipNextWrapSymbol(units, currentIndex);
  const statement = Get(units, currentIndex);
  if (statement instanceof Bracket && statement.StartBracketChar === "{") {
    const ifStatement = ifSeg.CreateStatement();
    statement.MoveDataTo(ifStatement);
    ifStatement.SignIn(statement.SourceRange.Start!);
    ifStatement.SignOut(statement.SourceRange.End!);
    ifStatement.TryToClose();
    endIndex = currentIndex;
  } else {
    endIndex = Statement.SearchStatementEnd(units, currentIndex - 1);
    if (endIndex === -1) {
      throw new Error("`if/else if(...)` 后需要跟语句，如` if(...){...}` 或 `if(...)...;` ");
    }
    const ifStatement = ifSeg.CreateStatement();
    ifStatement.AddRange(units.slice(currentIndex, endIndex + 1));
    ifStatement.SignIn(Get(units, currentIndex)!.SourceRange.Start!);
    ifStatement.SignOut(Get(units, endIndex)!.SourceRange.End!);
    ifStatement.TryToClose();
    currentIndex = endIndex;
  }
  currentIndex = SkipNextWrapSymbol(units, currentIndex);
  const nextCommon = Get(units, currentIndex);
  if (nextCommon instanceof Common && nextCommon.Is("else")) {
    const nextKeyworkdIndex = SkipNextWrapSymbol(units, currentIndex);
    const ifCommon = Get(units, nextKeyworkdIndex);
    if (ifCommon instanceof Common && ifCommon.Is("if")) {
      lastKeyIndex = nextKeyworkdIndex;
      currentIndex = nextKeyworkdIndex;
    } else {
      lastKeyIndex = currentIndex;
    }
  } else {
    endIndex = currentIndex - 1;
    break;
  }
}
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
ReplaceCountAt(units, index, endIndex - startIndex + 1, result);
return index;
```

# class IfSet extends IndependentToken

`if` / `else if` / `else` 整条语句链的容器单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<IfSet>` 里依次是各个 `IfSegment` 的 XML。

## constructor:(template:Template)=>void

转调基类构造器（体是空的）。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

新建一个、`Sign(this)`、把子单元逐个克隆后 `AddRange`、最后 `TryToClose()`。

```ts
const result = new IfSet(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
