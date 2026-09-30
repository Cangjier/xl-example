# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBackIndexed, SearchFrontIndexed, SkipNext } from "../../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Class } from "./class/class.xl.md"
import { Enum } from "./enum/enum.xl.md"
import { Field } from "./field.xl.md"
import { For } from "./for/for.xl.md"
import { Foreach } from "./foreach/foreach.xl.md"
import { Function } from "./function/function.xl.md"
import { IfSet } from "./if/if-set.xl.md"
import { Import } from "./import.xl.md"
import { Interface } from "./interface/interface.xl.md"
import { Label } from "./label.xl.md"
import { MethodDeclaration } from "./function/method-declaration.xl.md"
import { Symbol } from "./symbol.xl.md"
import { Signature } from "./signature/signature.xl.md"
import { Switch } from "./switch/switch.xl.md"
import { Try } from "./try/try.xl.md"
import { While } from "./while/while.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

语句：把一串「不是语句边界」的单元收进一个 `Statement`。这是夹具里最常见的结构——
`abc` 的 XML 就是 `<Root><Statement><Common>abc</Common></Statement></Root>`。

三个重组类各管一段时机：

| 重组类 | 时机 |
| --- | --- |
| `StatementReorganization` | 遇到 `;` 这类语句符号 |
| `StatementReorganization2` | 最常见的收束：遇到换行或末尾 |
| `StatementReorganization3` | 只在列表末尾 |

这三个类都写在 `Statement` **之前**——它们的 `Instance` 静态字段会在类定义时立即求值，
而且 `TextCommonUtil` 与 `Root` 也会直接引用它们。

三个类的 `Process` 里都重复了同一段「往前找语句边界」的判定，这里各自内联，不做提取。

# class StatementReorganization extends Reorganization

`Previous` 命中的条件是：`index` 处是一个**语句符号**（`;`），并且它的父单元不是小括号 `(`——
小括号里的 `;` 属于 for 语句的三段式，不是语句边界。

## static readonly field Instance:StatementReorganization = new StatementReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是语句边界。

三段判定（是 `Symbol`、是语句符号、父单元不是小括号 `(`）压成一个表达式；这里拆成早返回，语义相同。

```ts
const item = Get(units, index);
if (!(item instanceof Symbol)) {
  return false;
}
if (!item.Template.SymbolTemplate.IsStatementSymbol(item.TempToString())) {
  return false;
}
const parent = item.Parent;
if (parent instanceof Bracket && parent.StartBracketChar === "(") {
  return false;
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `frontIndex + 1` 到 `index` 之间的单元收成一个 `Statement`，**返回新的下标**。

做法：

- `children` 只有 1 个时直接把这个符号删掉（不成语句）。
- 否则新建 `Statement`，把 `children` **除最后一个**全部装进去（最后一个是语句符号本身，它留在外面）。
- 语句的范围取 `children` 首尾单元的起止范围；任何一头缺失就抛异常。
- 最后用带 `count` 的 `ReplaceCountAt` 批量替换，返回的 `frontIndex + 1` 成为新下标。

`units` 直到最后的替换才被改写，所以用 `slice` 取快照是安全的。

```ts
const frontIndex = SearchFrontIndexed(units, index, (itemIndex, item) => Statement.IsStatementBoundary(units, itemIndex));
const children = units.slice(frontIndex + 1, index + 1);
if (children.length === 1) {
  units.splice(index, 1);
  return index - 1;
}
const statement = new Statement(template);
statement.Parent = Get(units, index)!.Parent;
statement.AddRange(children.slice(0, children.length - 1));
const first = children[0];
const last = children[children.length - 1];
if (first.SourceRange.Start !== null && last.SourceRange.End !== null) {
  statement.SourceRange.Start = first.SourceRange.Start;
  statement.SourceRange.End = last.SourceRange.End;
} else {
  throw new Error("Statement source range is not complete.");
}
return ReplaceCountAt(units, frontIndex + 1, index - frontIndex, statement);
```

# class StatementReorganization2 extends Reorganization

`Previous` 命中的条件是：`index` 处是 `WrapSymbol` **或** 语句符号。

`Process` 分两种时机：

- **不是最后一个单元**：当前不是语句符号、且落在语句内部（`IsInStatement`）时，直接把当前单元删掉；
  否则与 `StatementReorganization` 同款收束——但**多一次 `TryToClose`**。
- **是最后一个单元**：边界判定改用宽口径的 `IsStatementUnit`，且 `children` 允许为空长度（照常收束）。

**「是最后一个单元」这条分支多一个 `children.length === 1` 的早退。**
不加这个早退时，那个孤零零的单元会被收成一个 `Statement`，而它恰好是软换行时——
`AddRange(children.slice(0, 0))` 装进一个空列表，`TryToClose` 再把那个 `WrapSymbol` 摘掉——
产物里就留下一个**空的** `<Statement></Statement>`。实测到的形状：`import …` 结尾的文件、
`while (...) {...}` 结尾的文件、`try { … } catch { … } finally { … }`（`Try` 不吸收结尾软换行）。

下面那条「不是最后一个单元」的分支本来就有同样的早退（`children.length === 1` 时直接删掉），
两条分支在这里**本来就该一致**，所以这个早退是让它们对齐，不是新语义。
空 `Statement` 不携带任何信息，去掉它只让 XML 更干净（README 的差异清单里记了这一条）。

## static readonly field Instance:StatementReorganization2 = new StatementReorganization2()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是软换行或语句符号。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const isWrap = current instanceof WrapSymbol;
const isStatementSymbol = current instanceof Symbol && template.SymbolTemplate.IsStatementSymbol(current.TempToString());
return isWrap || isStatementSymbol;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

按上面那两种时机收束语句，**返回新的下标**。

```ts
const currentIsInEnd = units.length - 1 === index;
const current = Get(units, index);
const currentIsStatementSymbol = current instanceof Symbol && template.SymbolTemplate.IsStatementSymbol(current.TempToString());
if (currentIsInEnd) {
  const frontIndex = SearchFrontIndexed(units, index, (itemIndex, item) => Statement.IsStatementBoundary(units, itemIndex));
  const children = units.slice(frontIndex + 1, index + 1);
  if (children.length === 1) {
    units.splice(index, 1);
    return index - 1;
  }
  const statement = new Statement(template);
  statement.Parent = Get(units, index)!.Parent;
  statement.AddRange(children.slice(0, children.length - 1));
  const first = children[0];
  const last = children[children.length - 1];
  if (first.SourceRange.Start !== null && last.SourceRange.End !== null) {
    statement.SourceRange.Start = first.SourceRange.Start;
    statement.SourceRange.End = last.SourceRange.End;
  } else {
    throw new Error("Statement source range is not complete.");
  }
  const nextIndex = ReplaceCountAt(units, frontIndex + 1, index - frontIndex, statement);
  statement.TryToClose();
  return nextIndex;
}
if (!currentIsStatementSymbol && Statement.IsInStatement(units, index)) {
  units.splice(index, 1);
  return index - 1;
}
const frontIndex = SearchFrontIndexed(units, index, (itemIndex, item) => Statement.IsStatementBoundary(units, itemIndex));
const children = units.slice(frontIndex + 1, index + 1);
if (children.length === 1) {
  units.splice(index, 1);
  return index - 1;
}
const statement = new Statement(template);
statement.Parent = Get(units, index)!.Parent;
statement.AddRange(children.slice(0, children.length - 1));
const first = children[0];
const last = children[children.length - 1];
if (first.SourceRange.Start !== null && last.SourceRange.End !== null) {
  statement.SourceRange.Start = first.SourceRange.Start;
  statement.SourceRange.End = last.SourceRange.End;
} else {
  throw new Error("Statement source range is not complete.");
}
const nextIndex = ReplaceCountAt(units, frontIndex + 1, index - frontIndex, statement);
statement.TryToClose();
return nextIndex;
```

# class StatementReorganization3 extends Reorganization

`Previous` 只在 `index` 是列表最后一个单元时命中。`Process` 与前者同款收束，
但多一个「`children` 长度为 1 且那个单元本身就是语句单元」的早退——那种情况什么都不做。

## static readonly field Instance:StatementReorganization3 = new StatementReorganization3()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 是不是最后一个单元。

```ts
return units.length - 1 === index;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

注意「什么都不做」的那条早退不动下标，所以返回原 `index`。

```ts
const frontIndex = SearchFrontIndexed(units, index, (itemIndex, item) => Statement.IsStatementBoundary(units, itemIndex));
const children = units.slice(frontIndex + 1, index + 1);
if (children.length === 1 && Statement.IsStatementUnit(children[0])) {
  return index;
}
const statement = new Statement(template);
statement.Parent = Get(units, index)!.Parent;
statement.AddRange(children);
const first = children[0];
const last = children[children.length - 1];
if (first.SourceRange.Start !== null && last.SourceRange.End !== null) {
  statement.SourceRange.Start = first.SourceRange.Start;
  statement.SourceRange.End = last.SourceRange.End;
} else {
  throw new Error("Statement source range is not complete.");
}
const nextIndex = ReplaceCountAt(units, frontIndex + 1, index - frontIndex, statement);
statement.TryToClose();
return nextIndex;
```

# class Statement extends IndependentToken

语句单元。

单元值类型是单字符的 `string`。

构造时就把自己的重组队列从模板上取出来——`InitialStatementReorganizationQueue` 会把
两个语句重组类插到默认队列的前面。

## constructor:(template:Template)=>void

构造器里取本类型的重组队列；运行时类型用 `this.constructor`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## static method IsStatementUnit:(item:Token)=>bool

这个单元本身是不是一个「语句级」结构。

基础判定是七路 `instanceof`：`IfSet` / `For` / `Statement` / `Foreach` / `While` / `Try` / `Import`。

在这之上又加了九路：`Class` / `Function` / `Enum` / `MethodDeclaration` / `Field` / `Switch` / `Label`，
以及 `Interface`。三类声明本来没有自己的节点，判定表里也就没有它们；不加的话，
一条声明会和相邻的散单元一起被折进 `Statement`
（`class A {}` 外面会多包一层 `<Statement>`，`Statement` 的边界判定也认不出它是一条完整的声明）。
`Interface` 早就有节点，但判定表里**没有**它——于是 `interface I { }` 会被包进一个 `Statement`。
把它补进表里，让「声明站在根下」这条规则对 `Interface` 与 `Class` 一视同仁。
`Field` 是成员节点，不加的话同一个类体里相邻的两个字段会被折进同一个 `Statement`。

`Signature` 同理，而且它比 `Field` 更早暴露：无名成员签名（`interface I { (): void }`）在不在表里时
会被包成 `<Statement><Signature …/></Statement>`，而紧邻它的 `Field` / `MethodDeclaration` 都是**直接**
站在 `InterfaceBody` 下——同一个体里两种成员两种层级，`type T = { abstract new (): A; b: number }`
还会把 `abstract` 与后面的 `Field` 一起卷进同一个 `Statement`。

`Label` 也在表里：标签与它标的那条语句是**两个平级单元**（见 `./label.xl.md` 的说明），
不把 `Label` 当边界，`StatementReorganization3` 会把两者一起收进一个 `Statement`。

这个判定是「语句从这里断开」的**四个**调用点共用的（`StatementReorganization` / `2` 的两条分支 / `3` 里的
`SearchFrontIndexed`，判定器统一转调 `IsStatementBoundary`），
所以它决定了声明能不能作为独立节点站在 `Root` / `ClassBody` / 函数体里。

```ts
return item instanceof IfSet
  || item instanceof For
  || item instanceof Statement
  || item instanceof Foreach
  || item instanceof While
  || item instanceof Try
  || item instanceof Import
  || item instanceof Interface
  || item instanceof Class
  || item instanceof Function
  || item instanceof Enum
  || item instanceof MethodDeclaration
  || item instanceof Field
  || item instanceof Signature
  || item instanceof Switch
  || item instanceof Label;
```

## static method IsStatementBoundary:(units:Array<Token>, index:int)=>bool

`index` 处的单元是不是**一条语句从这里开始**——四个 `SearchFrontIndexed` 调用点共用的边界判定。

比 `IsStatementUnit` 多一条：**`Function` / `Class` 只有在声明位置才算边界**。

不加这条会出真 bug（实测）：`const v = function () {} && y;` 里那个函数是**表达式**，
可 `Function` 在 `IsStatementUnit` 里是无条件边界，于是往后找语句头时**停在了它身上**，
`&& y` 被单独收成一个 `Statement`；那个 `Statement` 的 `Data` 以 `&&` 打头，
`LogicalOperatorReorganization` 攒不到左操作数，直接抛「LogicalOperator 为空」。
`class` 同理（`const v = class {} && y;`）。

```ts
const item = Get(units, index);
if (item === null) {
  return false;
}
if (item instanceof Symbol) {
  return item.Template.SymbolTemplate.IsStatementSymbol(item.TempToString());
}
if (Statement.IsStatementUnit(item) === false) {
  return false;
}
if (item instanceof Function || item instanceof Class) {
  return Statement.IsDeclarationPosition(units, index);
}
return true;
```

## static method IsDeclarationPosition:(units:Array<Token>, index:int)=>bool

`index` 处的 `Function` / `Class` 是不是落在**声明位置**（而不是运算符右边的表达式位置）。

只看**前一个实义单元**（跨过软换行）：

- 前面没有单元 → 是（列表开头就是一条声明的开头）；
- 前面是 `;` → 是；
- 前面是 `}` → 是（`{ … } class A {}` 这种紧随块之后）；
- 前面是语句级单元（`Statement` / `Interface` / 另一个 `Function` …）→ 是；
- 其余（`=` / `&&` / `,` / `(` / `return` …）→ 不是，那是表达式。

```ts
const previousIndex = SkipPreviousWrapSymbol(units, index);
if (previousIndex < 0) {
  return true;
}
const previous = Get(units, previousIndex);
if (previous === null) {
  return true;
}
if (previous instanceof Symbol) {
  return previous.Template.SymbolTemplate.IsStatementSymbol(previous.TempToString());
}
if (previous instanceof Bracket) {
  return previous.StartBracketChar === "}";
}
return Statement.IsStatementUnit(previous);
```

## static method IsInStatementSymbol:(symbol:Symbol)=>bool

这个符号是不是「非语句符号」——也就是**不会**终止语句的那种。

直接对 `IsStatementSymbol` 取反。

```ts
return symbol.Template.SymbolTemplate.IsStatementSymbol(symbol.TempToString()) === false;
```

## static method IsInStatement:(units:Array<Token>, index:int)=>bool

`index` 是否落在一条语句**内部**：跨过软换行看左右两侧，任一侧是非语句符号就算在语句内。

先取前后「实义」单元下标；前一个为 `-1`（走到头）直接返回 `false`。

```ts
const lastUnitIndex = SkipPreviousWrapSymbol(units, index);
const nextUnitIndex = SkipNextWrapSymbol(units, index);
if (lastUnitIndex === -1) {
  return false;
}
const lastUnit = Get(units, lastUnitIndex);
if (lastUnit instanceof Symbol && Statement.IsInStatementSymbol(lastUnit)) {
  return true;
}
if (nextUnitIndex >= units.length) {
  return false;
}
const nextUnit = Get(units, nextUnitIndex);
if (nextUnit instanceof Symbol && Statement.IsInStatementSymbol(nextUnit)) {
  return true;
}
return false;
```

## static method SearchStatementEnd:(units:Array<Token>, index:int, statementEndSymbols?:Array<string>)=>int

从 `index` 向后找这条语句的结束符号，返回下标；找不到返回 `-1`。

结束符号允许一个都不传，所以落成**可选**数组参数。

```ts
return SearchBackIndexed(units, index, (itemIndex, item) => Statement.IsStatementEnd(units, itemIndex, statementEndSymbols));
```

## static method IsStatementEnd:(units:Array<Token>, itemIndex:int, statementEndSymbols?:Array<string>)=>bool

`itemIndex` 处是不是语句结束位置。

三条分支：

- 是 `Symbol` 且 `Is(";", [",", .. statementEndSymbols])` → 是。
- 是 `WrapSymbol` → 往后跨过软换行看下一个单元：是 `;`（或 `statementEndSymbols` 里的）就**不是**；
  否则看它是否落在语句内部，不在语句内部才算结束；后面没有单元了则算结束。
- 其余 → 不是。

合并符号表写成 `[",", ...(statementEndSymbols ?? [])]`；
带候选项的那个 `Is` 重载叫 `IsValueOrAny`。

```ts
const symbols = statementEndSymbols ?? [];
const item = Get(units, itemIndex);
if (item instanceof Symbol && item.IsValueOrAny(";", [",", ...symbols])) {
  return true;
}
if (item instanceof WrapSymbol) {
  const nextIndex = SkipNext(units, itemIndex, (candidate) => candidate instanceof WrapSymbol);
  if (nextIndex < units.length) {
    const next = Get(units, nextIndex);
    if (next instanceof Symbol && next.IsValueOrAny(";", symbols)) {
      return false;
    }
    return Statement.IsInStatement(units, nextIndex) === false;
  }
  return true;
}
return false;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；
批量加入用 `AddRange`。

```ts
const result = new Statement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
