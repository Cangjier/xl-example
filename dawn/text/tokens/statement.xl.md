# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBackIndexed, SearchFront, SkipNext } from "../../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { For } from "./for/for.xl.md"
import { Foreach } from "./foreach/foreach.xl.md"
import { IfSet } from "./if/if-set.xl.md"
import { Import } from "./import.xl.md"
import { Symbol } from "./symbol.xl.md"
import { Try } from "./try/try.xl.md"
import { While } from "./while/while.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

语句：把一串「不是语句边界」的单元收进一个 `Statement`。这是夹具里最常见的结构——
`abc` 的 XML 就是 `<Root><Statement><Common>abc</Common></Statement></Root>`。

三个嵌套的重组类各管一段时机（M32 展平改名）：

| C# | ts | 时机 |
| --- | --- | --- |
| `Statement.Reorganization` | `StatementReorganization` | 遇到 `;` 这类语句符号 |
| `Statement.Reorganization2` | `StatementReorganization2` | 最常见的收束：遇到换行或末尾 |
| `Statement.Reorganization3` | `StatementReorganization3` | 只在列表末尾 |

按 M33，这三个展平类都写在 `Statement` **之前**——它们的 `Instance` 静态字段会在类定义时立即求值，
而且 `TextCommonUtil` 与 `Root` 也会直接引用它们。

三个类的 `Process` 里都重复了同一段「往前找语句边界」的判定，这里按原样各自内联，不做提取。

# class StatementReorganization extends Reorganization

原 C# 是嵌套类 `Statement.Reorganization`。

`Previous` 命中的条件是：`index` 处是一个**语句符号**（`;`），并且它的父单元不是小括号 `(`——
小括号里的 `;` 属于 for 语句的三段式，不是语句边界。

## static readonly field Instance:StatementReorganization = new StatementReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是语句边界。

原 C# 用 `units.Get(index) is Symbol symbol && … && !(symbol.Parent is Bracket bracket && bracket.StartBracketChar == '(')`，
把三段判定压成一个表达式；ts 侧拆成早返回，语义相同。

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

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。原逻辑：

- `children` 只有 1 个时直接把这个符号删掉（不成语句）。
- 否则新建 `Statement`，把 `children` **除最后一个**全部装进去（最后一个是语句符号本身，它留在外面）。
- 语句的范围取 `children` 首尾单元的起止范围；任何一头缺失就抛异常。
- 最后用 `ReplaceAt(frontIndex + 1, index - frontIndex, statement)` 批量替换，返回的 `frontIndex + 1` 成为新下标。

注意 C# 的 `children` 是**惰性** LINQ 查询，但 `units` 直到最后的 `ReplaceAt` 才被改写，
所以 ts 侧用 `slice` 取快照是等价的。

```ts
const frontIndex = SearchFront(units, index, (item) => {
  const isStatementSymbol = item instanceof Symbol && item.Template.SymbolTemplate.IsStatementSymbol(item.TempToString());
  if (isStatementSymbol) {
    return true;
  }
  return Statement.IsStatementUnit(item);
});
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

原 C# 是嵌套类 `Statement.Reorganization2`。

`Previous` 命中的条件是：`index` 处是 `WrapSymbol` **或** 语句符号。

`Process` 分两种时机：

- **不是最后一个单元**：当前不是语句符号、且落在语句内部（`IsInStatement`）时，直接把当前单元删掉；
  否则与 `StatementReorganization` 同款收束——但**多一次 `TryToClose`**。
- **是最后一个单元**：边界判定改用宽口径的 `IsStatementUnit`，且 `children` 允许为空长度（照常收束）。

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

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。

```ts
const currentIsInEnd = units.length - 1 === index;
const current = Get(units, index);
const currentIsStatementSymbol = current instanceof Symbol && template.SymbolTemplate.IsStatementSymbol(current.TempToString());
if (currentIsInEnd) {
  const frontIndex = SearchFront(units, index, (item) => {
    const isStatementSymbol = item instanceof Symbol && item.Template.SymbolTemplate.IsStatementSymbol(item.TempToString());
    if (isStatementSymbol) {
      return true;
    }
    return Statement.IsStatementUnit(item);
  });
  const children = units.slice(frontIndex + 1, index + 1);
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
const frontIndex = SearchFront(units, index, (item) => {
  const isStatementSymbol = item instanceof Symbol && item.Template.SymbolTemplate.IsStatementSymbol(item.TempToString());
  if (isStatementSymbol) {
    return true;
  }
  return Statement.IsStatementUnit(item);
});
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

原 C# 是嵌套类 `Statement.Reorganization3`。

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

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。注意「什么都不做」的那条早退
在原 C# 里是 `return`（不动下标），所以 ts 侧返回原 `index`。

```ts
const frontIndex = SearchFront(units, index, (item) => {
  const isStatementSymbol = item instanceof Symbol && item.Template.SymbolTemplate.IsStatementSymbol(item.TempToString());
  if (isStatementSymbol) {
    return true;
  }
  return Statement.IsStatementUnit(item);
});
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

原 C# 侧是 `public class Statement : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

构造时就把自己的重组队列从模板上取出来——`InitialStatementReorganizationQueue` 会把
两个语句重组类插到默认队列的前面。

## constructor:(template:Template)=>void

原 C# 在构造器里执行 `ReorganizationQueue = template.ReorganizationTemplate.Get(GetType());`；
`GetType()` 按 M17 写成 `this.constructor`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## static method IsStatementUnit:(item:Token)=>bool

这个单元本身是不是一个「语句级」结构。

原 C# 是一个 7 路 `is` 判定：`IfSet` / `For.For` / `Statement` / `Foreach.Foreach` / `While.While` / `Try.Try` / `Import`。

```ts
return item instanceof IfSet
  || item instanceof For
  || item instanceof Statement
  || item instanceof Foreach
  || item instanceof While
  || item instanceof Try
  || item instanceof Import;
```

## static method IsInStatementSymbol:(symbol:Symbol)=>bool

这个符号是不是「非语句符号」——也就是**不会**终止语句的那种。

原 C# 直接对 `IsStatementSymbol` 取反。

```ts
return symbol.Template.SymbolTemplate.IsStatementSymbol(symbol.TempToString()) === false;
```

## static method IsInStatement:(units:Array<Token>, index:int)=>bool

`index` 是否落在一条语句**内部**：跨过软换行看左右两侧，任一侧是非语句符号就算在语句内。

原 C# 先取前后「实义」单元下标；前一个为 `-1`（走到头）直接返回 `false`。

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

原 C# 签名是 `static int SearchStatementEnd(List<Token<char>> units, int index, params string[] statementEndSymbols)`。`params` 允许一个都不传，所以按 M2 落成**可选**数组参数。

```ts
return SearchBackIndexed(units, index, (itemIndex, item) => Statement.IsStatementEnd(units, itemIndex, statementEndSymbols));
```

## static method IsStatementEnd:(units:Array<Token>, itemIndex:int, statementEndSymbols?:Array<string>)=>bool

`itemIndex` 处是不是语句结束位置。

原 C# 签名是 `static bool IsStatementEnd(List<Token<char>> units, int itemIndex, params string[] statementEndSymbols)`。三条分支照抄：

- 是 `Symbol` 且 `Is(";", [",", .. statementEndSymbols])` → 是。
- 是 `WrapSymbol` → 往后跨过软换行看下一个单元：是 `;`（或 `statementEndSymbols` 里的）就**不是**；
  否则看它是否落在语句内部，不在语句内部才算结束；后面没有单元了则算结束。
- 其余 → 不是。

C# 的集合表达式 `[",", .. statementEndSymbols]` 在 ts 里写成 `[",", ...(statementEndSymbols ?? [])]`；
三参数的 `Symbol.Is` 重载按 M14(c) 已改名为 `IsValueOrAny`。

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

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；
批量 `Add` 按 M14(c) 写成 `AddRange`。

```ts
const result = new Statement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
