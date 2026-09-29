# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
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

原 C# 侧的嵌套类 `IfSet.Reorganization` 按 M32 展平成顶层 `IfSetReorganization`；它**不进 `Data`、不进 XML**，所以 ts 类名与 C# 的 `Type.Name` 不一致无害。反过来，`IfSet` 本体的类名必须与 C# 完全一致，因为 XML 标签名取自 `this.constructor.name`（M17）。`Root` 构造时会把 `IfSetReorganization.Instance` 注册进通用重组队列，所以展平后的名字也是调用点用的名字。

# class IfSetReorganization extends Reorganization

重组规则：`if` 加一个 `(` 开头的 `Bracket`，就整段换成一个 `IfSet`。

原 C# 是嵌套类 `IfSet.Reorganization`（M32 展平改名）。

它是 token 层最长的一条重组：从 `if` 开始，逐段吃掉「关键字 + 条件括号 + 语句体」，遇到 `else` 就回头看它后面跟的是 `if`（继续当 `else if`）还是别的（当 `else`，循环到此结束），每一段都做成一个 `IfSegment`。

## static readonly field Instance:IfSetReorganization = new IfSetReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段，调用点形态不变。

## method Previous:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `if` 的 `Common`，紧跟（跳过 `WrapSymbol` 软换行）一个 `(` 开头的 `Bracket`。

原 C# 是 `public override bool Previous(IOwner owner, Template<char> template, List<Token<char>> units, int index)`。按 M31，`char` 一律写 `string`；`units.Get` / `units.GetSkipNextWrapSymbol` 是扩展方法，按 M11 改成模块级函数调用。

原 C# 把三个 `is` 模式匹配串成一个 `&&` 表达式；ts 侧先取出来再用 `instanceof` 判定，语义相同（`Common` / `Bracket` 都是引用类型，模式匹配在 `null` 时不成立，等价于 `instanceof`）。

```ts
const unit = Get(units, index);
if (!(unit instanceof Common) || !unit.Is("if")) {
  return false;
}
const next = GetSkipNextWrapSymbol(units, index);
return next instanceof Bracket && next.StartBracketChar === "(";
```

## method Process:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>int

执行重组：把整条 `if / else if / else` 链收进一个 `IfSet`，**返回新的下标**。

原 C# 是 `public override void Process(IOwner owner, Template<char> template, List<Token<char>> units, ref int index)`。按 M15 把 `ref int index` 改成返回值：原实现**从头到尾没有给 `index` 赋过值**，所以这里原样 `return index;`——替换后位置 `index` 上是新插入的 `IfSet`，外层 `for` 自增一步正好落在它后面。

`units.ReplaceAt(index, count, result)` 是 `ListExtension` 里带 `count` 的那个重载，按 M14(c) 在移植里改名 `ReplaceCountAt`（另一个三参版本占用了 `ReplaceAt` 这个名字）。

两处抛错在 C# 里用 `new Exception("…")`（`System.Exception`）；按 M20，BCL 异常类型不进规范，ts 侧用等价的 `new Error("…")`，消息逐字保留。

几点与 C# 逐句对应的说明：

1. **签入 / 签出取的是 `Source` 本身**。C# 的 `SourceRange.Start` 是 `Nullable<Source<char>>`，所以 `units.Get(i)!.SourceRange.Start!.Value` 里的 `.Value` 是**可空结构体的 `.Value`**，取出来的是 `Source` 而不是字符。ts 侧的 `Start` 已经是 `Source | null`，因此一律去掉 `.Value`，写成 `Get(units, i)!.SourceRange.Start!`。若照抄 `.Value` 会取到字符，`SignIn` 拿到的就不是位置而是值。
2. **`ifKey` 的取法**：C# 是 `(units.Get(lastKeyIndex) as Common)!.TempToString()`——关键字所在单元按 `Common` 取文本（`if` / `else`）。
3. **第一段与后续段的签入点不同**（原实现如此，照抄）：第一段（`Data.Count == 1`）从关键字自身签入；`else if` 从关键字**前一个**单元签入（带上 `else`），`else` 从关键字自身签入。
4. **条件括号**：`if` 后面必须跟一个 `Bracket`，把括号里的子单元整体 `MoveDataTo` 给新建的 `IfCondition`，再按括号的起止签入签出。
5. **语句体**：括号后面若是 `{` 开头的 `Bracket`，整块搬给 `IfStatement`；否则当成单条语句，用 `Statement.SearchStatementEnd` 找回语句结尾（`-1` 即失败），取 `[currentIndex, endIndex]` 这一段交给 `IfStatement`。原 C# 写的是 `units.Skip(currentIndex).Take(endIndex - currentIndex + 1)`，ts 侧的数组原生 `slice(currentIndex, endIndex + 1)` 与之等价；`Add` 收到一段区间按 M14(c) 用 `AddRange`。
6. **续段判定**：语句体之后再跳掉软换行，若遇到内容为 `else` 的 `Common`，就再看它后面是不是 `if`：是则把 `lastKeyIndex` / `currentIndex` 都推到那个 `if`（`else if`），否则把 `lastKeyIndex` 设到 `else`（最后一段）；不是 `else` 就把 `endIndex = currentIndex - 1` 并收尾。

```ts
const result = new IfSet(owner, template);
result.Parent = Get(units, index)!.Parent;
result.SignIn(Get(units, index)!.SourceRange.Start!);
const startIndex = index;
let endIndex = index;
let currentIndex = index;
let lastKeyIndex = index;
while (true) {
  const ifSeg = result.Add(new IfSegment(owner, template));
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

原 C# 侧是 `public class IfSet : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<IfSet>` 里依次是各个 `IfSegment` 的 XML。

## constructor:(owner:IOwner, template:Template)=>void

原 C# 只是转调基类构造器（体是空的）。

```ts
super(owner, template);
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`：新建一个、`Sign(this)`、把子单元逐个克隆后 `Add`（ts 侧 `AddRange`，M14(c)）、最后 `TryToClose()`。

```ts
const result = new IfSet(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
