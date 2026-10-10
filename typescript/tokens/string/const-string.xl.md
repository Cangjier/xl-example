# dependencies
```xl
import { BlockToken } from "../../../core/syntax/block-token.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

`Typescript/Tokens/String`：字符串词法——引号向导、字符串单元与常量文本块，把 `"…"` / `'…'` / `@"…"` / `$"{…}"` / `"""…"""` 啃成 `<String …><ConstString>…</ConstString></String>`。

常量文本块：一个 `String` 里所有**真正是文本**的字符都攒在它里面。它自己是块 token，字符进 `Temp`；它的 XML 与基类不同——`<ConstString>` 里放的是**转义后**的文本（换行变 `\n`、`<` 变 `&lt;`…），这一处直接决定 XML 产物。

`String` 里那个「上一个常量块」的引用（`ParentString`）指回本类的宿主，所以本文件与 `string.xl.md` 互相引用。

# class ConstString extends BlockToken

字符串里的常量文本块。

它只被 `String.AppendToLastConstString` 创建与追加：`String.AppendToLastConstString` 先 `AppendValueAndSignOut` 收字符，`RemoveLastLine` / `RemoveFirstLine` / `RemoveIndent` 这一族方法则在原串缩进格式化时被 `String.FormatRawIndent` 调用——它们都是**原地改 `Temp`**。

## field ParentString:String | null = null
宿主字符串单元（拥有本常量块的 `String`）。

注意这里的 `String` 是**本项目**的 `String` 类（`typescript/tokens/string/string.xl.md`），与内置的 `String` 无关。ts 侧这个 import 会遮蔽全局 `String`，这是**故意的**。

## constructor:(Template:Template)=>void

构造器只是转调基类。

```ts
super(Template);
```

## method IsAppend:(Src:Source)=>bool

常量块的字符永远由 `String` 显式推给它，不接受「自己并进自己」的判定，所以恒为 `false`。

```ts
return false;
```

## method IsUndo:(source:Source)=>bool

块 token 可以回退；常量块额外永远允许——`Undo` 由它自己实现。

```ts
return true;
```

## method Undo:(source:Source)=>void

回退一个字符：`Temp` 的**最后一个**字符必须正好是 `source.Value`，是就弹掉它，否则抛错。

`this.Temp[this.Temp.length - 1]` 对空数组给出 `undefined`，于是走 `else` 抛下面的错。

```ts
if (this.Temp[this.Temp.length - 1] === source.Value) {
  this.Temp.splice(this.Temp.length - 1, 1);
} else {
  throw new Error("ConstString Undo异常");
}
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## method TrySignIn:(Src:Source)=>ConstString

「没签入过就签入」：`SourceRange.Start` 为 `null` 时才 `SignIn`，然后返回自身便于链式调用。

注意它与基类的 `SignIn` 不同——**重复调用不抛错**。

```ts
if (this.SourceRange.Start === null) {
  this.SignIn(Src);
}
return this;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，内容是 `Temp` 里**转义后**的文本。

它自带一张 13 项的 `switch`，逐个字符追加：

| 原字符 | 替换成 | 说明 |
| --- | --- | --- |
| `'\r'` `'\n'` `'\t'` `'\a'` `'\b'` `'\f'` `'\\'` `'\''` `'\"'` `'\v'` | `\\r` `\\n` `\\t` `\\a` `\\b` `\\f` `\\\\` `\\'` `\\"` `\\v` | 控制字符与引号/反斜杠转成反斜杠转义 |
| `'>'` `'<'` `'&'` | `&gt;` `&lt;` `&amp;` | XML 实体 |
| 其余 | 原字符 | 原样 |

注意它**没有**走基类 `BlockToken.ToXmlString`，而是自己重写了同一张表——表的内容与 `CommonUtil.XmlDecode` 逐项相同，这里仍在本方法里写全，免得产物依赖另一个文件的口径。`String.ToXmlString` 会逐个调用子单元的 `ToXmlString`，所以这段就是 `<String …><ConstString>…</ConstString></String>` 里那截文本，直接决定 XML 产物 `tests/fixtures/xml/04-string.xml`（`<ConstString>hello</ConstString>`）。

这里有一处差异必须留意：响铃字符要写成 `"\x07"`，因为 ts 的 `"\a"` 只等于字母 `"a"`；标签名取自 `this.constructor.name`。

```ts
let str = "";
for (const i of this.Temp) {
  switch (i) {
    case "\r":
      str += "\\r";
      break;
    case "\n":
      str += "\\n";
      break;
    case "\t":
      str += "\\t";
      break;
    case "\x07":
      //C# 的 '\a'
      str += "\\a";
      break;
    case "\b":
      str += "\\b";
      break;
    case "\f":
      str += "\\f";
      break;
    case "\\":
      str += "\\\\";
      break;
    case "'":
      str += "\\'";
      break;
    case '"':
      str += '\\"';
      break;
    case "\v":
      str += "\\v";
      break;
    case ">":
      str += "&gt;";
      break;
    case "<":
      str += "&lt;";
      break;
    case "&":
      str += "&amp;";
      break;
    default:
      str += i;
      break;
  }
}
const name = this.constructor.name;
return `<${name} range="${this.RangeOf()}">${str}</${name}>`;
```

## method Contains:(Value:string)=>bool

`Temp` 里是否含某个字符。

ts 侧用 `includes`：

```ts
return this.Temp.includes(Value);
```

## method SkipContains:(SkipValue:string, FindValue:string)=>bool

从后往前找：跳过所有 `SkipValue`，遇到的第一个其它字符若是 `FindValue` 就返回 `true`，否则返回 `false`。

循环从 `this.Temp.length - 1` 递减到 `0`；`Temp` 全由 `SkipValue` 组成时循环走完返回 `false`。

`String.FormatRawIndent` 用 `SkipContains(' ', '\n')` 判断原串末行是不是「只剩空格就到行尾」。

```ts
for (let i = this.Temp.length - 1; i >= 0; i--) {
  const Item = this.Temp[i];
  if (Item === SkipValue) {
    continue;
  } else if (Item === FindValue) {
    return true;
  } else {
    return false;
  }
}
return false;
```

## method GetRowIndent:()=>int

末行的缩进宽度：从后往前数，连续空格的数量（遇到非空格即停）。

```ts
let RowIndent = 0;
for (let i = this.Temp.length - 1; i >= 0; i--) {
  const Item = this.Temp[i];
  if (Item === " ") {
    RowIndent++;
  } else {
    break;
  }
}
return RowIndent;
```

## method RemoveLastLine:()=>void

删掉末行的尾部：从后往前先把行尾的连续空格删掉，再删掉那个 `\n`（随后若有 `\r` 也一并删掉）；途中遇到别的字符就抛错。

局部 `flag` 分两段处理（`0` = 还在行尾空格段，`1` = 已删掉 `\n`、正在找可选的 `\r`）。

```ts
let flag = 0;
for (let i = this.Temp.length - 1; i >= 0; i--) {
  const Item = this.Temp[i];
  if (flag === 0) {
    if (Item === " ") {
      this.Temp.splice(i, 1);
    } else if (Item === "\n") {
      this.Temp.splice(i, 1);
      flag = 1;
    } else {
      throw new Error("异常字符");
    }
  } else if (flag === 1) {
    if (Item === "\r") {
      this.Temp.splice(i, 1);
    } else {
      break;
    }
  }
}
```

## method RemoveFirstLine:()=>void

删掉首行的头部：从前往后删连续空格，删到 `\r\n` 或 `\n` 就**连行尾符一起删掉并返回**；途中遇到别的字符就抛错。

`splice` 删掉一个元素后要写 `i--` 来抵消 `for` 的自增。

```ts
let Flag = 0;
for (let i = 0; i < this.Temp.length; i++) {
  const Item = this.Temp[i];
  if (Flag === 0) {
    if (Item === " ") {
      this.Temp.splice(i, 1);
      i--;
    } else if (Item === "\r") {
      this.Temp.splice(i, 1);
      i--;
      Flag = 1;
    } else if (Item === "\n") {
      this.Temp.splice(i, 1);
      return;
    } else {
      throw new Error("异常字符");
    }
  } else if (Flag === 1) {
    if (Item === "\n") {
      this.Temp.splice(i, 1);
      return;
    } else {
      throw new Error("异常字符");
    }
  }
}
```

## private method RemoveIndentAt:(Index:int, Count:int)=>void

从 `Index` 起删掉正好 `Count` 个空格；中途遇到非空格就抛错，删不够 `Count` 个就抛另一个错。

`splice` 删掉一个元素后同样要写 `i--` 来抵消 `for` 的自增。

注意 `Count` 为 `0` 时它并不会立刻返回——循环仍会走，第一个字符是空格就会被删掉。

```ts
let SpaceCount = 0;
for (let i = Index; i < this.Temp.length; i++) {
  const Item = this.Temp[i];
  if (Item === " ") {
    this.Temp.splice(i, 1);
    i--;
    SpaceCount++;
    if (SpaceCount === Count) {
      return;
    }
  } else {
    throw new Error("原始字符串缩进时异常");
  }
}
throw new Error("原始字符串缩进时未正常退出");
```

## method RemoveIndent:(Count:int, IsFirst:bool)=>void

按原串的缩进宽度削掉每一行行首的 `Count` 个空格。

`Count == 0` 直接返回；`IsFirst` 为真时先削首行（首字符不是空格就抛错）；随后从前往后逐个找 `\n`，对每个 `\n` 的下一个位置削一次缩进。

`Array.indexOf` 支持带起点查找，找不到返回 `-1`。

```ts
if (Count === 0) {
  return;
}
if (IsFirst) {
  if (this.Temp.length === 0) {
    return;
  }
  if (this.Temp[0] !== " ") {
    throw new Error("首行缩进字符异常");
  }
  this.RemoveIndentAt(0, Count);
}
let LastIndex = 0;
while (true) {
  const LineStartIndex = this.Temp.indexOf("\n", LastIndex);
  if (LineStartIndex === -1) {
    break;
  }
  this.RemoveIndentAt(LineStartIndex + 1, Count);
  LastIndex = LineStartIndex + 1;
}
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 1000 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

**这一格把 `ctx.StringText` 的两步拆开写**：它的第一步是「找**子单元**里的 `ConstString`」、
第二步才是「读那一格的值（值不在时回原文 `slice`）」。直出版只做前两步里**不回原文**的那一步
（`ctx.KidsOf` + `ctx.ValueOf`）——与 `import-type.xl.md` 的直出版同一份写法。

**为什么这里恒为空串**（量出来的，不是猜的）：`ConstString` 是块单元，**文本在 `Temp` 上**
（`BlockToken.ToDictionary` 把它写成 `value`）、**自己没有子单元** ⇒ 第一步永远找不到那一格
⇒ `StringText` 对它恒为 `""`。而 `String` 那一层的文本是外层 `String.PrintDirectAst` 经
`ctx.Template` 取走的（`string.xl.md`），所以**全语料 2050 份里这一格一次都没被问到**。
两个出口在**同一份判据**上写下同一个答案，正是这一格的诚实写法。

```ts
  const content = ctx.KidsOf(v, "children").find((k: any) => k.Tag() === "ConstString");
  return ctx.Node("StringLiteral", { text: content === undefined ? "" : ctx.ValueOf(content) }, v);
```

## method Clone:()=>Token

克隆自身：`Sign(this)` → `Temp.push(...this.Temp)` → `TryToClose()`。

```ts
const result = new ConstString(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```
