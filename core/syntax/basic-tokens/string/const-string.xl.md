# dependencies
```xl
import { BlockToken } from "../../block-token.xl.md"
import { CloseStates } from "../../close-states.xl.md"
import { Source } from "../../source.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

字符串词法——引号向导、字符串单元与常量文本块，把 `"…"` / `'…'` / `@"…"` / `$"{…}"` / `"""…"""` 啃成 `<String …><ConstString>…</ConstString></String>`。

常量文本块：一个 `String` 里所有真正是文本的字符都攒在它里面。它自己是块 token，字符进 `Temp`；它的 XML 与基类不同——`<ConstString>` 里放的是转义后的文本（换行变 `\n`、`<` 变 `&lt;`…）。

# class ConstString extends BlockToken

字符串里的常量文本块。

它只被 `String.AppendToLastConstString` 创建与追加；`RemoveLastLine` / `RemoveFirstLine` / `RemoveIndent` 这一族方法在原串缩进格式化时被 `String.FormatRawIndent` 调用，都是原地改 `Temp`。

## field ParentString:String | null = null

宿主字符串单元（拥有本常量块的 `String`）。

本项目自己的 `String` 类，与内置的 `String` 无关。

## constructor:(Template:Template)=>void

构造器只是转调基类。

```ts
super(Template);
```

## method IsAppend:(Src:Source)=>bool

恒为 `false`：常量块的字符由 `String` 显式推给它，不靠并块判定。

```ts
return false;
```

## method IsUndo:(source:Source)=>bool

恒为 `true`：常量块自己实现 `Undo`。

```ts
return true;
```

## method Undo:(source:Source)=>void

回退一个字符：`Temp` 的**最后一个**字符必须正好是 `source.Value`，是就弹掉它，否则抛错。

```ts
if (this.Temp[this.Temp.length - 1] === source.Value) {
  this.Temp.splice(this.Temp.length - 1, 1);
} else {
  throw new Error("ConstString Undo异常");
}
```

## protected method Close(context?:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，返回 `Nothing`。

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## method TrySignIn:(Src:Source)=>ConstString

「没签入过就签入」：`SourceRange.Start` 为 `null` 时才 `SignIn`，然后返回自身便于链式调用；与基类的 `SignIn` 不同，重复调用不抛错。

```ts
if (this.SourceRange.Start === null) {
  this.SignIn(Src);
}
return this;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，内容是 `Temp` 里**转义后**的文本。

逐个字符按下表替换：

| 原字符 | 替换成 | 说明 |
| --- | --- | --- |
| `'\r'` `'\n'` `'\t'` `'\a'` `'\b'` `'\f'` `'\\'` `'\''` `'\"'` `'\v'` | `\\r` `\\n` `\\t` `\\a` `\\b` `\\f` `\\\\` `\\'` `\\"` `\\v` | 控制字符与引号/反斜杠转成反斜杠转义 |
| `'>'` `'<'` `'&'` | `&gt;` `&lt;` `&amp;` | XML 实体 |
| 其余 | 原字符 | 原样 |

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
return `<${name}>${str}</${name}>`;
```

## method Contains:(Value:string)=>bool

`Temp` 里是否含某个字符。

```ts
return this.Temp.includes(Value);
```

## method SkipContains:(SkipValue:string, FindValue:string)=>bool

从后往前找：跳过所有 `SkipValue`，遇到的第一个其它字符若是 `FindValue` 就返回 `true`，否则返回 `false`；`Temp` 全由 `SkipValue` 组成时返回 `false`。

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

## method Clone:()=>Token

克隆自身：`Sign(this)` → `Temp.push(...this.Temp)` → `TryToClose()`。

```ts
const result = new ConstString(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```
