# dependencies
```xl
import { CloseStates } from "./close-states.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { SourceException } from "../exceptions/source-exception.xl.md"
import { BranchTransiter } from "./branch-transiter.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { Template } from "./templates/template.xl.md"
import { Sequence } from "./templates/sequence.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 AST 行。

`Token` 是整棵树的地基：它记录自己覆盖的源码范围（半开 `[Start, End)`）、自己的子单元、以及处理每个字符时该跑哪些跳转。

调度只认「上下文 + 窗口 + 下标」：`Process(context, buffer, index)` 处理窗口里的一个位置，消费了字符就必须推进 `context.Index`。

# class Token

Token，语法树的地基。

`Default` / `Close` / `Process` / `Clone` 四个抽象成员写成抛错桩。

## field Template:Template

本单元使用的模板。

## field ProcessQueue:Sequence<BranchTransiter> | null = null

从当前单元跳到下一个单元的跳转队列（一列 `BranchTransiter` 函数）。由各 token 在自己的构造器里从 `Template.BranchTemplate` 取。

队列里的函数拿得到调度层已经读好的当前字符（第 5 个参数 `value`），所以它们不必为当前字符再问一次 `buffer`。

## field Parent:Token | null = null

父单元。

## field Data:Array<Token> = []

子单元。

## field MountedUnit:Token | null = null

当前挂载的子单元：非空时本单元把 `Process` 直接转给它。

## field SourceRange:SourceRange = new SourceRange()

本单元覆盖的源码范围（半开 `[Start, End)`）。

## field LastIndex:int = -1

最近被本单元处理（消费）的字符下标；`-1` 表示还没处理过。

注意它记的是**下标**而不是终点：形状的补终点用 `LastIndex + 1`（半开区间终点）。

## field Closed:bool = false

本单元是否已关闭；关闭后不再接收字符。

## field IsBasicToken:bool = false

是不是 basic 单元——basic 跳转队列（`Template.BasicBranchQueue()`）收出来的那几种：区域注释 / 行注释 / 正则 / 括号 / 空白 / 符号 / 通用块。各子类就地覆写成 `true`。

## field IsAnnotationToken:bool = false

是不是注释单元——区域注释（`/* */`）与行注释（`//`）。注释是 trivia：判定形状时跳过，收进形状时保留。

## field IsTriviaToken:bool = false

是不是 trivia 单元——注释与空白。**判定形状时一律跳过**（`ItemUtil` 的 `NextCode` / `PreviousCode` / `LastCodeInItem` 与各形状的 `ComputeByIndex` 都按这一格过滤）；收进形状后由 `Close` 提取字段时丢弃。

它跟 `IsAnnotationToken` 是两个问题：后者回答「这是不是注释」，本格回答「判形状要不要跳过它」。注释两格都是 `true`，空白只有本格是 `true`。

## constructor:(template:Template)=>void

以模板创建。

```ts
this.Template = template;
```

## method Last:(index?:int)=>Token | null

倒数第 `index` 个子单元；越界返回 `null`。

```ts
const position = this.Data.length - 1 - (index ?? 0);
if (position >= 0 && position < this.Data.length) {
  return this.Data[position];
}
return null;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

所有跳转都不接手时的兜底处理。

`value` 是驱动层已经读好的当前字符（`buffer.ValueAt(index)`）：兜底实现直接用它，不要为同一个字符再读一次 `buffer.At(index)`。

抽象方法。`Root.Default` 会在这里报「未知字符」。`ShapeToken.Default` 保持空实现——空白由调度层的统一 `+1` 吞掉。

```ts
throw new Error("abstract member: Default");
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭本单元，并回答**关闭过程中有没有建出形状**。

抽象方法；绝大多数实现只做 `Closed = true` 并返回 `CloseStates.Nothing`。basic token 的 `Close` 会把「父单元重算候选」的结果带上来——那一步可能建出形状。

```ts
throw new Error("abstract member: Close");
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

尝试关闭：范围必须两端都已设置（`Start >= 0 && End >= 0`），然后关闭，并把关闭的结果透传出去。

约定：`SourceRange` 只能赋值一次；`Close` 之前它必须已赋值；新建单元时上一个单元必须已关闭。

```ts
if (this.SourceRange.Start < 0 || this.SourceRange.End < 0) {
  throw SourceException.SourceRangeContainsNull;
}
return this.Close(context);
```

## method MoveDataTo:(target:Token)=>void

把所有子单元搬给 `target`，然后清空自己的。

```ts
for (const item of this.Data) {
  target.Add(item);
}
this.Data.length = 0;
```

## method Add:<Item extends Token>(item:Item)=>Item

加一个子单元，并把它的父设为自己。

```ts
item.Parent = this;
this.Data.push(item);
return item;
```

## method AddRange:<Item extends Token>(items:Array<Item>)=>Token

加一批子单元，返回自身。

它与单元素版参数个数相同，ts 无法靠重载区分，所以叫 `AddRange`。

```ts
for (const item of items) {
  item.Parent = this;
}
this.Data.push(...items);
return this;
```

## method Quit:()=>Token | null

从父单元卸载自己，返回父单元。

```ts
if (this.Parent !== null) {
  this.Parent.MountedUnit = null;
}
return this.Parent;
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

处理窗口里 `index` 处的一个字符。

```ts
throw new Error("abstract member: Process");
```

## method SignIn:(index:int)=>Token

签入：把范围起点设为 `index`。起点只能设一次（`-1` 表示未设置）。

范围还没有文档时，用 `SourceRange.CurrentDocument` 兜底补上——新模型里 token 只拿到 int，
文档由驱动层登记（`SourceRange.Document` 不能永远为空）。

```ts
if (this.SourceRange.Start < 0) {
  if (this.SourceRange.Document === null) {
    this.SourceRange.Document = SourceRange.CurrentDocument;
  }
  this.SourceRange.Start = index;
  return this;
}
throw SourceException.SourceRangeStartIsSetted;
```

## method SignInToken:(token:Token)=>Token

用另一个单元的起点签入。

```ts
if (token.SourceRange.Start < 0) {
  throw SourceException.SourceRangeStartIsNull;
}
return this.SignIn(token.SourceRange.Start);
```

## method SignOut:(endIndex:int)=>void

签出：把范围终点设为 `endIndex`（**被消费字符的下标 +1**，开区间终点），并让最后一个子单元递归签出。终点只能设一次。

范围还没有文档时同样用 `SourceRange.CurrentDocument` 兜底补上（只在不覆盖已有值时）。

```ts
if (this.SourceRange.End < 0) {
  if (this.SourceRange.Document === null) {
    this.SourceRange.Document = SourceRange.CurrentDocument;
  }
  this.SourceRange.End = endIndex;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(endIndex);
  }
} else {
  throw SourceException.SourceRangeEndIsSetted;
}
```

## private method TrySignOut:(endIndex:int)=>void

递归签出：只在终点还没设过时往下传。

它与 `SignOut` 的差别是**不抛异常**——遇到已签出的子单元就停。

被递归到的子单元同样要补文档：父单元可能自己带着文档、子单元却是「只签出手续」走到这里的。

```ts
if (this.SourceRange.End < 0) {
  if (this.SourceRange.Document === null) {
    this.SourceRange.Document = SourceRange.CurrentDocument;
  }
  this.SourceRange.End = endIndex;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(endIndex);
  }
}
```

## method SignOutToken:(token:Token)=>void

用另一个单元的终点签出。

```ts
if (token.SourceRange.End < 0) {
  throw SourceException.SourceRangeEndIsNull;
}
this.SignOut(token.SourceRange.End);
```

## method Sign:(token:Token)=>void

用另一个单元同时签入与签出。

```ts
this.SignInToken(token);
this.SignOutToken(token);
```

## method Undo:(index:int)=>void

回退：找到覆盖 `index` 的子单元，让它回退。

`WhichUnitRangeContains` 可能返回 `null`，所以要判空再转发。

```ts
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  undoUnit.Undo(index);
}
```

## method IsUndo:(index:int)=>bool

能不能回退。

```ts
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  return undoUnit.IsUndo(index);
}
return false;
```

## method WhichUnitRangeContains:(index:int)=>Token | null

从后往前找第一个半开范围覆盖了 `index` 的子单元。

```ts
for (let i = this.Data.length - 1; i >= 0; i--) {
  if (this.Data[i].SourceRange.IsInRange(index)) {
    return this.Data[i];
  }
}
return null;
```

## method Replace:<Item extends Token>(item:Item)=>Item

在父单元里用 `item` 顶替自己，位置不变。

原地替换靠两次 `splice`：先插在当前位置，再删掉原来的自己。

```ts
if (this.Parent === null) {
  throw new Error("没有父单元");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("自身不在父单元的子单元里");
}
item.Parent = this.Parent;
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = item;
}
this.Parent.Data.splice(index, 0, item);
this.Parent.Data.splice(index + 1, 1);
return item;
```

## method RemoveSelf:()=>void

从父单元里移除自己。

```ts
if (this.Parent === null) {
  throw new Error("没有父单元");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("自身不在父单元的子单元里");
}
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = null;
}
this.Parent.Data.splice(index, 1);
```

## method ToAstLine:(indent:int)=>string

产出**本节点及全部后代的整棵 AST 行文本**：行与行之间用 `"\n"` 连接，末尾不带换行。

`indent` 是 0 基深度，**每层缩进 3 列**——正好是连接线 `├─ ` / `└─ ` / `│  ` 的宽度，所以下层 label 总是从 `depth * 3` 列开始。`indent < 0` 按 `0` 处理。

每行的构成：

- 自己的行：`pad + AstLabel()`，其中 `pad = " ".repeat(depth * 3)`。
- 第 `i` 个子单元：先取 `block = child.ToAstLine(depth + 1).split("\n")`、`cut = (depth + 1) * 3`，
  第一行拼成 `pad + (是否最后一个 ? "└─ " : "├─ ") + block[0].slice(cut)`，
  其余行拼成 `pad + (是否最后一个 ? "   " : "│  ") + block[j].slice(cut)`。
  子单元按 `Data` 的顺序遍历，不重排。

`slice(cut)` 是这套口径的关键：子串自带的那 `cut` 列缩进由父级换成连接线前缀，所以整棵树只有一套缩进口径。

```ts
const depth = indent < 0 ? 0 : indent;
const pad = " ".repeat(depth * 3);
const cut = (depth + 1) * 3;
const lines: string[] = [pad + this.AstLabel()];
for (let i = 0; i < this.Data.length; i++) {
  const last = i === this.Data.length - 1;
  const block = this.Data[i].ToAstLine(depth + 1).split("\n");
  lines.push(pad + (last ? "└─ " : "├─ ") + block[0].slice(cut));
  for (let j = 1; j < block.length; j++) {
    lines.push(pad + (last ? "   " : "│  ") + block[j].slice(cut));
  }
}
return lines.join("\n");
```

## method AstLabel:()=>string

本行自己的 label：**运行时类型名**起头，随后按固定顺序追加字段，字段之间**两个空格**。

字段顺序固定为 `pos` → `src` → `text` → `op`：

| 字段 | 何时出现 | 形态 |
| --- | --- | --- |
| `pos` | `AstPos()` 非 `null` | `pos=<v>`；`v < 0` 印成 `pos=-` |
| `src` | 总是出现 | `src=[<start>,<end>)`；`start < 0` 印 `-`，`end < 0` 印 `...` |
| `text` | `AstText()` 非空 | `text="<转义后>"` |
| `op` | `AstOperator()` 非空 | `op="<转义后>"` |

例：`NumericLiteralShape  pos=7  src=[8,9)  text="2"`、`AsteriskTokenShape  pos=9  src=[9,10)  op="*"`、
`Common  src=[0,3)  text="let"`、`SourceFileShape  pos=-  src=[0,...)`。

**整行只用 ASCII**：`src` 的终点没封时印 `...`（旧版在这里印一个中文词，已去掉——AST 行是产物，要能直接进任何终端 / 比较工具）。

标签名取 `this.constructor.name`，所以类名就是它印出来的节点名。

```ts
const parts: string[] = [this.constructor.name];
const pos = this.AstPos();
if (pos !== null) {
  parts.push(`pos=${pos < 0 ? "-" : String(pos)}`);
}
const start = this.SourceRange.Start;
const end = this.SourceRange.End;
parts.push(`src=[${start < 0 ? "-" : String(start)},${end < 0 ? "..." : String(end)})`);
const text = this.AstText();
if (text.length > 0) {
  parts.push(`text="${this.AstEscape(text)}"`);
}
const op = this.AstOperator();
if (op.length > 0) {
  parts.push(`op="${this.AstEscape(op)}"`);
}
return parts.join("  ");
```

## method AstPos:()=>int | null

虚钩子：本节点在 AST 里的起点，`null` 表示「这一行不印 `pos`」。

`Token` 默认 `null`（basic token 没有 `Pos` 这个概念）；`ShapeToken` 覆写成自己的 `Pos` 字段，所以形状一律带 `pos`——`-1`（还没算出来）印成 `pos=-`。

```ts
return null;
```

## method AstText:()=>string

虚钩子：本节点的文本，空串表示「这一行不印 `text`」。

`Token` 默认空串；`BlockToken` 覆写成 `Temp`，两个注释单元覆写成 `Tmp`，`ConstString` 覆写成 `Temp`，`RegexToken` 覆写成 `ToText()`；`ShapeToken` 覆写成「有 `Text` 字段就取它」，`IdentifierShape` 再覆写成 `EscapedText`。

```ts
return "";
```

## method AstOperator:()=>string

虚钩子：本节点的运算符文本，空串表示「这一行不印 `op`」。

`Token` 默认空串；`ShapeToken` 覆写成「有 `Op` 字段就取它」——七十来个 `*TokenShape` 都声明了 `Op`，这一条覆写就够，不必逐个改。

```ts
return "";
```

## private method AstEscape:(value:string)=>string

把文本转义成可以安全放进双引号里的形式：`\` → `\\`、`"` → `\"`、CR → `\r`、LF → `\n`、TAB → `\t`，其余字符原样。

`text` 与 `op` 两个字段都走这一条。

```ts
let result = "";
for (const ch of value) {
  switch (ch) {
    case "\\":
      result += "\\\\";
      break;
    case '"':
      result += '\\"';
      break;
    case "\r":
      result += "\\r";
      break;
    case "\n":
      result += "\\n";
      break;
    case "\t":
      result += "\\t";
      break;
    default:
      result += ch;
      break;
  }
}
return result;
```

## method ToString:()=>string

`Root.ToString()` 就是 AST 行文本的入口：从深度 0 起打成整棵树。

```ts
return this.ToAstLine(0);
```
