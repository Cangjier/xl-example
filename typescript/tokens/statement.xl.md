# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBackIndexed, SearchFrontIndexed, SkipNext } from "../../core/extensions/list-extension.xl.md"
import { GetSkipPreviousTrivia, HasTypeColonBefore, SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousTrivia, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Class } from "./class/class.xl.md"
import { Enum } from "./enum/enum.xl.md"
import { Field } from "./field.xl.md"
import { For } from "./for/for.xl.md"
import { Foreach } from "./foreach/foreach.xl.md"
import { Function } from "./function/function.xl.md"
import { IfSet } from "./if/if-set.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Import } from "./import.xl.md"
import { Interface } from "./interface/interface.xl.md"
import { Keyword } from "./keyword.xl.md"
import { Label } from "./label.xl.md"
import { MethodDeclaration } from "./function/method-declaration.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { Signature } from "./signature/signature.xl.md"
import { Switch } from "./switch/switch.xl.md"
import { Try } from "./try/try.xl.md"
import { While } from "./while/while.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

语句：把一串「不是语句边界」的单元收进一个 `Statement`。这是夹具里最常见的结构——
`abc` 的 XML 就是 `<Root><Statement><Identifier>abc</Identifier></Statement></Root>`。

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

三段判定（是 `SymbolToken`、是语句符号、父单元不是小括号 `(`）压成一个表达式；这里拆成早返回，语义相同。

```ts
const item = Get(units, index);
if (!(item instanceof SymbolToken)) {
  return false;
}
if (!item.Template.SymbolTemplate.IsStatementSymbol(item.TempToString())) {
  return false;
}
const parent = item.Parent;
if (parent instanceof Bracket && parent.startBracket === "(") {
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
// **孤零零一个 `;` 收成 `Statement`**（第 141 轮）：它就是 TS 的 `EmptyStatement` 的**候选**
// （`;` 顶一条语句、`if (a) ;` 的体、函数体里的空语句）。原来这一支把它**直接 splice 掉**，
// 整个节点凭空消失。
//
// **但 `.d.ts` 里遍地都是「成员声明后面那个 `;`」**（`interface I { a: string; b: number }`），
// 那些在 TS 那边**不是**节点——一刀切地收下来会让整个语料多出 3439 个 `EmptyStatement`。
// 收不收得准要看**原文排版**（成员终结符在行尾、防御性分号在行首），所以这里**照收不误**，
// 由投影侧按「这个 `;` 是不是它那一行的第一个非空白字符」筛掉（见 `ts-ast.xl.md` 的
// `projectStatement` 里那一支）。
const lonelySemicolon =
  children.length === 1 && children[0] instanceof SymbolToken && children[0].Is(";");
if (children.length === 1 && !lonelySemicolon) {
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

`Previous` 命中的条件是：`index` 处是 `LineWrap` **或** 语句符号。

`Process` 分两种时机：

- **不是最后一个单元**：当前不是语句符号、且落在语句内部（`IsInStatement`）时，直接把当前单元删掉；
  否则与 `StatementReorganization` 同款收束——但**多一次 `TryToClose`**。
- **是最后一个单元**：边界判定改用宽口径的 `IsStatementUnit`，且 `children` 允许为空长度（照常收束）。

**「是最后一个单元」这条分支多一个 `children.length === 1` 的早退。**
不加这个早退时，那个孤零零的单元会被收成一个 `Statement`，而它恰好是软换行时——
`AddRange(children.slice(0, 0))` 装进一个空列表，`TryToClose` 再把那个 `LineWrap` 摘掉——
产物里就留下一个**空的** `<Statement></Statement>`。实测到的形状：`import …` 结尾的文件、
`while (...) {...}` 结尾的文件、`try { … } catch { … } finally { … }`（`Try` 不吸收结尾软换行）。

下面那条「不是最后一个单元」的分支本来就有同样的早退（`children.length === 1` 时直接删掉），
两条分支在这里**本来就该一致**，所以这个早退是让它们对齐，不是新语义。
空 `Statement` 不携带任何信息，去掉它只让 XML 更干净（README 的差异清单里记了这一条）。

## static readonly field Instance:StatementReorganization2 = new StatementReorganization2()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是软换行或语句符号。

**块语句后面的那一格没有单独列出来**（第 63 轮试过、退回来了）：`{ A }a += 1` 里 TypeScript
读成**两条**语句（块 + 表达式语句），可给这条规则加上「前一个实义单元是 `}` 收尾的 `Bracket`
就算边界」之后，复合赋值的展开**还没跑完**就被这条边界切断——
产物里第二段只剩一个 `1`，`a` / `=` / 展开出来的 `BinaryOperator` **全丢了** ✗
（内容丢失比边界不合严重得多）。所以这里维持原判据：那一条形状记在
`tests/parse/recon2.mjs` 的片段表里，靠探针盯着，不再进用例语料。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const isWrap = current instanceof LineWrap;
const isStatementSymbol = current instanceof SymbolToken && template.SymbolTemplate.IsStatementSymbol(current.TempToString());
return isWrap || isStatementSymbol;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

按上面那两种时机收束语句，**返回新的下标**。

```ts
const currentIsInEnd = units.length - 1 === index;
const current = Get(units, index);
const currentIsStatementSymbol = current instanceof SymbolToken && template.SymbolTemplate.IsStatementSymbol(current.TempToString());
if (currentIsInEnd) {
  const frontIndex = SearchFrontIndexed(units, index, (itemIndex, item) => Statement.IsStatementBoundary(units, itemIndex));
  const children = units.slice(frontIndex + 1, index + 1);
  // **孤零零一个 `;` 收成 `Statement`**（第 141 轮）：与下面那一支同款——收不收得准由
  // 投影侧按原文排版筛（成员终结符在行尾、防御性分号在行首）。
  const lonelySemicolon =
    children.length === 1 && children[0] instanceof SymbolToken && children[0].Is(";");
  if (children.length === 1 && !lonelySemicolon) {
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
// **孤零零一个 `;` 收成 `Statement`**（第 141 轮）：它就是 TS 的 `EmptyStatement` 的**候选**
// （`;` 顶一条语句、`if (a) ;` 的体、函数体里的空语句）。原来这一支把它**直接 splice 掉**，
// 整个节点凭空消失。
//
// **但 `.d.ts` 里遍地都是「成员声明后面那个 `;`」**（`interface I { a: string; b: number }`），
// 那些在 TS 那边**不是**节点——一刀切地收下来会让整个语料多出 3439 个 `EmptyStatement`。
// 收不收得准要看**原文排版**（成员终结符在行尾、防御性分号在行首），所以这里**照收不误**，
// 由投影侧按「这个 `;` 是不是它那一行的第一个非空白字符」筛掉（见 `ts-ast.xl.md` 的
// `projectStatement` 里那一支）。
const lonelySemicolon =
  children.length === 1 && children[0] instanceof SymbolToken && children[0].Is(";");
if (children.length === 1 && !lonelySemicolon) {
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

两处额外的判定都是为了同一个中间状态：**重组会把列表改短，而下标还是旧扫描留下的**。

- `WrapStartIndex`：段内已经有成形的语句级单元时，要收的只是它右边那条尾巴。
- 收尾的兜底：新 `Statement` 拿不到父单元时**不把它放进列表**，并把已经改过的子单元 `Parent` 恢复回去。

兜底那一支是**必须的**（实测：`{ A }a += 1` 这种「块紧跟着表达式、中间既没有 `;` 也没有换行」的写法）：
`Statement.AddRange` 会把子单元的 `Parent` 改成挂在那个新 `Statement` 名下，而那个新单元
**不可能进树**（它的锚点单元自己也已经是别人的子单元，`Parent` 为 `null`）。
不恢复的话，后面任何一条规则想 `Replace` 这些子单元都会抛「没有父单元」——
`JsonObjectReorganization.Process` 里那句 `current.Replace(result)` 就是第一条撞上的。
（这一支只保证**不抛异常**；那种形状的产物里 `{ A }` 仍可能出现两次——
见 README「已知缺口」里记的那一条。）

```ts
const frontIndex = SearchFrontIndexed(units, index, (itemIndex, item) => Statement.IsStatementBoundary(units, itemIndex));
const groupStart = Statement.WrapStartIndex(units, frontIndex, index);
if (groupStart > index) {
  return index;
}
const children = units.slice(groupStart, index + 1);
if (children.length === 1 && Statement.IsStatementUnit(children[0])) {
  return index;
}
const anchor = Get(units, index)!;
const statement = new Statement(template);
statement.Parent = anchor.Parent;
statement.AddRange(children);
const first = children[0];
const last = children[children.length - 1];
if (first.SourceRange.Start !== null && last.SourceRange.End !== null) {
  statement.SourceRange.Start = first.SourceRange.Start;
  statement.SourceRange.End = last.SourceRange.End;
} else {
  throw new Error("Statement source range is not complete.");
}
if (statement.Parent === null) {
  for (const item of children) {
    item.Parent = anchor.Parent;
  }
  return index;
}
const nextIndex = ReplaceCountAt(units, groupStart, index - groupStart + 1, statement);
statement.TryToClose();
return nextIndex;
```

# class Statement extends IndependentToken

语句单元。

单元值类型是单字符的 `string`。

构造时就把自己的重组队列从模板上取出来——`InitialStatementReorganizationQueue` 会把
两个语句重组类插到默认队列的前面。

## method PrintAst:(ctx:any, v:any)=>any

一条语句 → 它的 TS 形状（**从 `ts-ast.xl.md` 里那个 `case "Statement"` 搬来**，第 198 轮）。

这是**语句分派层**：`Statement` 单元里可能是任何东西（裸块、`let`、`if`、`import`、
类型别名、表达式……），所以它必须把整段交给共享层的 `projectStatement`——
那一份实现同时被「语句位」与「成员位」两条路复用，而且**只在共享层能写**
（它要调 `projectExpression` 那一族）。

这是**最后一个 `case`**：搬完之后 `projectNode` 里那个按 `v.type` 分派的 `switch`
整段消失，只剩「问 token 的 `PrintAst`」与通用投影两条路 ✓。

```ts
  const node = ctx.StatementOf(v);
  // **`undefined` 在这里是有意义的答案**（例如「这个 `;` 已经是上一条语句的终结符」），
  // 而 token 出口把 `undefined` 读作「没覆写、请走通用支」——所以要用哨兵
  // `ctx.Nothing` 把「故意不出节点」这件事说出来（第 198 轮）。
  return node === undefined ? ctx.Nothing : node;
```

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
  || item instanceof Label
  // 类静态块（`static { … }`）与命名空间导出声明（`export as namespace F`）：
  // 两个都是**独立语句**，不加进来就会被多包一层 `<Statement>`——
  // `decl-class-static-block` / `mod-export-as-namespace` 两条用例钉住。
  // 用类名判定而不是 `instanceof`：本文件被几乎所有 token 文件 import，
  // 再 import 它们会绕出更深的环（与上面 `Let` 那条同一个理由）。
  || item.constructor.name === "StaticBlock"
  || item.constructor.name === "NamespaceExport"
  // **`Namespace` 现在在表里了** ✓（第 367 轮 ✓，**把第 292 轮退回来的那一半补上** ✓）：
  // 它在的第 292 轮账还在下面 ✓——当时加进去修好了「命名空间后面**同一行**再跟一句」✓，
  // 可**嵌套那一档从「报错」变成「静默错值」** ✗（外层 `ModuleBlock` 的产物从
  // `statements:[ModuleDeclaration]` 变成 `body: ModuleDeclaration` ✗ ⇒ 降级层
  // 读 `ListOf(block, "statements")` 一个语句都取不到 ✗ ⇒ 内层命名空间根本没建 ✓）。
  // **那一半在这一轮一起补上了** ✓（`print-ast-common.xl.md` 的 `BODY_FIELDS` 那一处
  // 改成「`Namespace` 的 `body` 只在父亲也是 `Namespace` 时成立」✓）——
  // 这正是那句「**要动就得一起动**」✓。
  || item.constructor.name === "Namespace";
  // **`Namespace` 故意不在表里** ✗（第 292 轮试过、量了、退回来了 ✓）：
  // 加进去确实修好一处 ✓——「一条命名空间后面**同一行**再跟一句」
  //（`namespace O { … } console.log(O.a);` ✓ 原来是
  // `unimplemented: expression ModuleDeclaration` ✓），
  // 因为那个 `Namespace` 单元从此自己就是语句边界 ✓。
  //
  // **但它同时改掉了嵌套那一档的形状** ✗，而且是**静默**改 ✓：
  // `namespace O { export namespace I { … } }` 里外层 `ModuleBlock` 的产物
  // 从 `statements:[ModuleDeclaration]` 变成 `body: ModuleDeclaration` ✓
  //（实测 `--ts-ast` 的投影 ✓）——降级层读的是 `ListOf(block, "statements")` ✓，
  // 于是一个语句都取不到 ✓ ⇒ 内层命名空间**根本没建** ✓，
  // 脚本报的是 `cannot read properties of undefined` ✓（离现场很远 ✗）。
  // 两处一比：**收益 1 条、代价是嵌套那一档从「报错」变成「静默错值」** ✗ ——
  // 所以退回来 ✓，把那一处**记成台账里的缺口** ✓（根子在语句边界与 `ModuleBlock`
  // 的收法这两件事的耦合上 ✓，要动就得一起动 ✓）。
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
if (item instanceof SymbolToken) {
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

## static method WrapStartIndex:(units:Array<Token>, frontIndex:int, index:int)=>int

`[frontIndex + 1, index]` 这一段**该从哪一格开始收进 `Statement`**——正常就是 `frontIndex + 1`。

段内已经有一个成形的**语句级单元**（`IsStatementUnit`）时，返回「它后面第一个不是透明单元的格子」，
于是**要收的是它右边那条尾巴**（那个单元自己留下）。段里没有这种东西、或者它右边只剩透明单元时，
返回 `index + 1` 表示「没有可收的」。

「透明」= 软换行或符号（`;` / `,`）：它们既不可能是语句级单元，也不该被单独收成一条语句。

```ts
for (let i = frontIndex + 1; i < index; i++) {
  const item = Get(units, i);
  if (item === null || Statement.IsStatementUnit(item) === false) {
    continue;
  }
  for (let j = i + 1; j <= index; j++) {
    const tail = Get(units, j);
    if (tail === null || tail instanceof LineWrap || tail instanceof SymbolToken) {
      continue;
    }
    return j;
  }
  return index + 1;
}
return frontIndex + 1;
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
if (previous instanceof SymbolToken) {
  return previous.Template.SymbolTemplate.IsStatementSymbol(previous.TempToString());
}
if (previous instanceof Bracket) {
  return previous.startBracket === "}";
}
return Statement.IsStatementUnit(previous);
```

## static method IsStatementHead:(item:Token | null)=>bool

这一个单元**本身就是「一条新语句的开头」**——换行后面跟着它，就说明上一行已经写完了。

它比 `IsStatementUnit` 多认一个 `Let`：变量声明头（`const a` / `let b` / `using c`）不在
`IsStatementUnit` 的表里，因为本工程把整条声明收成一个 `Statement`、`Let` 只是它**内部**的头节点。
但 `Let` 绝不可能出现在表达式中间，所以「换行 + `Let`」一定是两条语句
（实测：`const a = x as { b: number }` 换行 `const b = …`，`As` 的类型扫描一路吞掉了后面的 `Let`）。

`Let` 用**类名判定**而不是 `instanceof`：从本文件 import `let.xl.md` 会绕出循环依赖
（`let.xl.md` → `statement.xl.md`），这与 `field.xl.md` 的成员白名单、`text-common-util.xl.md` 的
`IsStatementList` 是同一条既有约定。

```ts
if (item === null) {
  return false;
}
if (item.constructor.name === "Let") {
  return true;
}
return Statement.IsStatementUnit(item);
```

## static method WordOf:(item:Token | null)=>string

取一个「词」单元的文本：`Identifier` 用 `TempToString()`，`Keyword` 用它的 `Value`，其余返回空串。

与 `declaration-common.xl.md` 的 `IsWordUnit` 同一口径，只是这里要的是**文本**而不是「等于某个词」。
两种都要认：`KeywordReorganization` 会把命中的词从 `Identifier` 升级成 `Keyword`
（两条分支没有继承关系），而本文件的重组规则在**同一趟里跑两遍**，
第二遍看到的词可能已经升级过了。

```ts
if (item instanceof Identifier) {
  return item.TempToString();
}
if (item instanceof Keyword) {
  return item.Value;
}
return "";
```

## static method IsRestrictedKeyword:(item:Token | null)=>bool

`item` 是不是**受限产生式**的那个词：`return` / `throw` / `break` / `continue` / `yield`。

这些词之后**一换行就断句**（ECMAScript 的 *restricted production*）：`return` 换行 `-1`
在 TypeScript 里是 `return;` 加 `-1;` 两条语句，而不是 `return -1`。
`throw` 换行在语法上直接非法（本工程不做诊断，按断句处理更接近 AST 的形状）。

```ts
const word = Statement.WordOf(item);
return word === "return" || word === "throw" || word === "break" || word === "continue" || word === "yield";
```

## static method ExpectsOperand:(item:Token | null)=>bool

`item` 之后**还必须跟一个操作数**吗——运算符、开括号、逗号、以及需要右操作数的关键词都属于这一档。

换行的**前一**个单元是它时，换行只是排版，不是语句边界：

- `const a =` 换行 `1`（`=` 要右操作数）；
- `const x = a +` 换行 `b`（`+` 要右操作数）；
- `f(` 换行 `1,` 换行 `2`（`(` 与 `,` 要内容）；
- `return` 换行……**不在此列**，它走 `IsRestrictedKeyword` 那条更早的判定。

符号表是「**不是**收尾符号」的那一批：`;` `)` `]` `}` 是收尾，`!` / `++` / `--` 两可（按需要操作数处理，
偏保守——多判成「续行」只是少断一条语句，不会造出额外的节点）。

```ts
if (item instanceof SymbolToken) {
  const text = item.TempToString();
  return item.Template.SymbolTemplate.IsStatementSymbol(text) === false && text !== ")" && text !== "]" && text !== "}";
}
const word = Statement.WordOf(item);
return (
  word === "return" ||
  word === "throw" ||
  word === "typeof" ||
  word === "new" ||
  word === "delete" ||
  word === "void" ||
  word === "await" ||
  word === "yield" ||
  word === "in" ||
  word === "of" ||
  word === "instanceof" ||
  word === "case" ||
  word === "extends" ||
  word === "as" ||
  word === "satisfies" ||
  word === "keyof" ||
  word === "infer" ||
  word === "asserts" ||
  word === "is" ||
  word === "readonly" ||
  word === "default"
);
```

## static method ContinuesExpression:(item:Token | null)=>bool

**换行后面**跟着 `item` 时，上一行的表达式还能接着写下去吗。

能的话换行只是排版（`a` 换行 `+ b` 是 `a + b`；`a` 换行 `.b` 是 `a.b`；`x` 换行 `as T` 是 `x as T`），
不能的话它就是一个语句边界。

两处刻意的取舍：

- **`++` / `--` 不在续接表里**：换行后紧跟的 `++` 是**前缀式**、起一条新语句
  （`a` 换行 `++b` 是两条语句），这正是 ASI 的受限产生式；
- **`(` / `[` / 模板串在续接表里**：`f` 换行 `(1)` 在 TypeScript 里是一次调用，不是两条语句。

```ts
if (item instanceof SymbolToken) {
  const text = item.TempToString();
  if (
    text === "." ||
    text === "(" ||
    text === "[" ||
    text === "," ||
    text === "?" ||
    text === ":" ||
    text === "=>" ||
    text === "!" ||
    text === "~"
  ) {
    return true;
  }
  if (text === ")" || text === "]" || text === "}" || text === ";" || text === "++" || text === "--") {
    return false;
  }
  // 其余符号（四则 / 移位 / 关系 / 相等 / 位运算 / 逻辑 / 赋值 / 复合赋值）都能续接
  return true;
}
const word = Statement.WordOf(item);
return word === "as" || word === "satisfies" || word === "in" || word === "of" || word === "instanceof" || word === "is";
```

## static method EndsOperand:(item:Token | null)=>bool

`item` 能不能**结束一个操作数**——也就是「它左边已经凑出一个完整的表达式了」。

判据只有一条：**不是**运算符。所以 `Identifier` / 字面量 / 字符串 / 各式单元都算；
`SymbolToken` 里只有 `)` / `]` / `}` / `!` / `++` / `--` 这几个是「操作数末尾」。

它只被 `IsLineBreakBoundary` 用来分辨 `++` / `--` 是**前缀**还是**后缀**：
`x` 换行 `++b` 里 `++` 前面没有操作数，是前缀（起新语句）；
`x++` 换行 `continue` 里 `++` 前面是 `x`，是后缀（表达式已经写完，换行是语句边界）。

```ts
if (item === null) {
  return false;
}
if (item instanceof SymbolToken) {
  const text = item.TempToString();
  return text === ")" || text === "]" || text === "}" || text === "!" || text === "++" || text === "--";
}
return true;
```

## static method IsLineBreakBoundary:(units:Array<Token>, index:int)=>bool

`index` 处那个**软换行**是不是一个语句边界。这就是本工程的 ASI 判据，只判这一件事：

> **前一行的最后一个单元不再要操作数，且下一行的第一个单元也不能续接这个表达式 ⇒ 断句。**

四种更早的结论优先：

1. 换行前没有实义单元（文件开头）→ 不是边界；
2. 换行前是 `return` / `throw` / `break` / `continue` / `yield` → **是**边界（受限产生式）；
3. 换行前是**后缀**的 `++` / `--`（它前面已经是一个操作数末尾）→ **是**边界
   （`x++` 换行 `continue` 是两条语句；`++` 能不能算后缀要看它前面的单元，所以要用 `EndsOperand`）；
4. 换行后没有实义单元（列表末尾）→ **是**边界（这一行已经写完了）。

```ts
// **两个「上一个」各司其职**（第 126 轮）：
// `previousIndex`（只跳软换行）用来判「是不是文件开头」——这正是原文的口径；
// `previous`（连注释一起跳）用来做**语义判断**：注释是 trivia，一行末尾的 `// …`
// 在语法上与不存在等价。
const previousIndex = SkipPreviousWrapSymbol(units, index);
if (previousIndex < 0) {
  return false;
}
const previousRealIndex = SkipPreviousTrivia(units, index);
const previous = Get(units, previousRealIndex);
// **前面只有 trivia ⇒ 这一行是新语句的开头**（第 159 轮）：续接判定问的是「上一行有没有
// 没写完的表达式」，而上一行**什么都没有**——`// 注释` 换行 `!x;` 里那个 `!` 是逻辑非、
// 起一条新语句。原来这里 `previous` 是 `null`，落到下面 `ContinuesExpression("!")`
// 判成续行，注释与 `!x;` 被并成一条语句
// （实测 `expr-unary-prefix.ts`：缺整条 `ExpressionStatement`）。
if (previous === null) {
  return true;
}
if (Statement.IsRestrictedKeyword(previous)) {
  return true;
}
if (previous instanceof SymbolToken && (previous.Is("++") || previous.Is("--"))) {
  const before = Get(units, SkipPreviousTrivia(units, previousRealIndex));
  if (Statement.EndsOperand(before)) {
    return true;
  }
}
// **下一个实义单元也要跳过注释**（第 142 轮）：`x === 1` 换行 `// 注释` 换行 `|| y` 里，
// 那个 `||` 才是上一行的后续；只跳软换行时会把注释当成「下一行的第一个单元」，
// 于是判成断句、整条 `||` 链被切成两段（实测 `statement.ts` 的一长串 `||`）。
const nextIndex = SkipNextTrivia(units, index);
if (nextIndex >= units.length) {
  return true;
}
const next = Get(units, nextIndex);
// **下一行以 `[` 开头**（第 158 轮）：ASI 不在 `[` 前面断句——**前提是上一行不是类型标注**
// （见 `HasTypeColonBefore`）。`interface I { ['a']: T` 换行 `['b']: U }` 是两条成员
// （实测 `undici-types/webidl.d.ts` 一族），而 `x => x` 换行 `[1, 2, 3]` 是 `x[1, 2, 3]`
// 一条表达式（实测 `am-block-lambda-array-compound.ts`）。
if (
  next !== null &&
  ((next instanceof Bracket && (next.startBracket === "[" || next.startBracket === "(")) ||
    next.constructor.name === "ArrayLiteral") &&
  HasTypeColonBefore(units, index) === false
) {
  return false;
}
// **成员名不「期待操作数」**（第 124 轮）：`ExpectsOperand` 只看**词形**，
// 而 `default` / `new` / `in` / `is` / `readonly` 这些词出现在点号后面时是**属性名**
// （`import("./m").default`、`x.new`、`o.in`）。把它们当成关键字，就会把
// 「`…​.default` 换行 `const y = …`」判成续行——
// 实测 `undici-types/index.d.ts` 的 `declare module "undici" { const Dispatcher:
// typeof import('./dispatcher').default ; 换行 const Pool: … }`：整段（140 处缺口）
// 因此被收进**一条类型标注**。
//
// 判据落在左边那一格上：点号（或可选链的点号）之后的名字永远是成员名。
// 这一条只挡「期待操作数」那一支，**不挡**下面 `ContinuesExpression` 那一支——
// `a.export` 换行 `= 1` 仍然续行（`=` 是运算符）。
const beforePrevious = Get(units, SkipPreviousTrivia(units, previousRealIndex));
const previousIsMember =
  beforePrevious instanceof SymbolToken && (beforePrevious.Is(".") || beforePrevious.Is("?."));
if (previousIsMember === false && Statement.ExpectsOperand(previous)) {
  return false;
}
if (Statement.ContinuesExpression(next)) {
  return false;
}
return true;
```

## static method IsInStatementSymbol:(symbol:SymbolToken)=>bool

这个符号是不是「非语句符号」——也就是**不会**终止语句的那种。

直接对 `IsStatementSymbol` 取反。

```ts
return symbol.Template.SymbolTemplate.IsStatementSymbol(symbol.TempToString()) === false;
```

## static method LastMeaningfulIndex:(units:Array<Token>, from:int)=>int

从 `units.length - 1` 往前找**最后一个不是软换行的单元**，返回它的下标；`from` 之后没有实义单元时返回 `-1`。

`if` / `while` / `for` / `foreach` 那几条规则用它给「一直写到输入末尾」的语句体收尾
（第 63 轮补，见 `if/if-set.xl.md` 的说明）：没有 `;`、文件又正好在这里结束时，
`SearchStatementEnd` 给 `-1`——那不是语法错误，是**语句到输入末尾就结束了**。

尾随软换行刻意**不算**体的一部分（留在外面当语句边界），所以这里要跳过它们。

```ts
let last = units.length - 1;
while (last >= from) {
  const item = Get(units, last);
  if (item !== null && !(item instanceof LineWrap)) {
    return last;
  }
  last = last - 1;
}
return -1;
```

## static method IsInStatement:(units:Array<Token>, index:int)=>bool

`index` 是否落在一条语句**内部**。

**`index` 处是软换行时，直接取 `IsLineBreakBoundary` 的反**——那一条就是 ASI 判据。
这是 `StatementReorganization2` 唯一的传法（它只在 `Previous` 命中 `LineWrap` 时问这一句，
命中 `;` 时走的是 `currentIsStatementSymbol` 那条短路）。

**`index` 处本身就是一条新语句的开头时，答案是「不在语句内」**（第二条早退）。
这是给 `IsStatementEnd` 用的传法：它传的是**换行后面第一个实义单元的下标**。

其余情形（传一个夹在中间的实义单元）保留原来的近似判据：跨过软换行看左右两侧，
任一侧是非语句符号就算在语句内。

```ts
const current = Get(units, index);
if (current instanceof LineWrap) {
  return Statement.IsLineBreakBoundary(units, index) === false;
}
if (Statement.IsStatementHead(current)) {
  return false;
}
const lastUnitIndex = SkipPreviousWrapSymbol(units, index);
const nextUnitIndex = SkipNextWrapSymbol(units, index);
if (lastUnitIndex === -1) {
  return false;
}
const lastUnit = Get(units, lastUnitIndex);
if (lastUnit instanceof SymbolToken && Statement.IsInStatementSymbol(lastUnit)) {
  return true;
}
if (nextUnitIndex >= units.length) {
  return false;
}
const nextUnit = Get(units, nextUnitIndex);
if (nextUnit instanceof SymbolToken && Statement.IsInStatementSymbol(nextUnit)) {
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

- 是 `SymbolToken` 且 `Is(";", [",", .. statementEndSymbols])` → 是。
- 是 `LineWrap` → 往后跨过软换行看下一个单元：是 `;`（或 `statementEndSymbols` 里的）就**不是**；
  否则交给 `IsLineBreakBoundary` —— 也就是同一套 ASI 判据，不另写一份近似。
- 其余 → 不是。

合并符号表写成 `[",", ...(statementEndSymbols ?? [])]`；
带候选项的那个 `Is` 重载叫 `IsValueOrAny`。

```ts
const symbols = statementEndSymbols ?? [];
const item = Get(units, itemIndex);
// **一条已经成形的语句级单元，本身就是「语句到此结束」** ✓（第 373 轮 ✓）。
//
// 它是**一整条语句** ✓——所以「从这里往后找 `;`」的调用方应当**停在它身上** ✓，
// 而不是扫过去、停到**下一条**语句的分号上 ✗。
//
// **少了这一条会漏掉一整族** ✗（实测收敛到两行）：
//
//     for (k = 0; k < 2; k++) if (k > 5) log.push("never");
//     log.push("after");
//
// `if` 那一条**先**被收成 `IfSet` ✓（规则是轮询的 ✓，三元 / 复合赋值那些都是这个次序 ✓），
// 于是 `for` 来找体尾时（`for.xl.md` 的 `SearchStatementEnd` ✓）一路**扫过** `IfSet` ✓、
// 停在**下一条语句**的 `;` 上 ✗ ⇒ 体的范围成了「`if` + 后面那条语句」✓——
// **静默错值** ✓：实测 `after` 被印了**两遍** ✓（每轮一遍 ✓），
// 而 Node 只印一遍 ✓。同一个形状在真语料里的后果更大 ✓：
// `for (...) if (cond) xs.push(a[i][j]);` 后面再跟一句 ✓，那一句每轮都跑 ✓。
//
// **为什么用 `IsStatementBoundary` 而不是 `IsStatementUnit`** ✗：后者把
// `Function` / `Class` **无条件**当边界 ✓，而 `for (...) function () {} && y;` 那种
// 位置上的函数是**表达式** ✓——`IsStatementBoundary` 多问一句「是不是声明位置」✓
//（那一处自己写着这段实测 ✓）。两处用同一把尺子 ✓，不另写一份近似 ✗。
if (Statement.IsStatementBoundary(units, itemIndex)) {
  return true;
}
if (item instanceof SymbolToken && item.IsValueOrAny(";", [",", ...symbols])) {
  return true;
}
if (item instanceof LineWrap) {
  const nextIndex = SkipNext(units, itemIndex, (candidate) => candidate instanceof LineWrap);
  if (nextIndex < units.length) {
    const next = Get(units, nextIndex);
    if (next instanceof SymbolToken && next.IsValueOrAny(";", symbols)) {
      return false;
    }
    return Statement.IsLineBreakBoundary(units, itemIndex);
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
