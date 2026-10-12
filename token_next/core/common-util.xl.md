# dependencies
```xl
import { Token } from "./token.xl.md"
```

# namespace cangjie

core 的全局工具：把 token 树写出去时用的那两个函数——转义正文、按嵌套缩进。

# method EscapeXmlText:(text:string)=>string

把正文里那三个字符转义，好让 XML 里只有一个意思。

```ts
return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
```

# method FormatInto:(unit:Token, depth:int, lines:Array<string>)=>void

把一个单元写进 `lines`：有子单元就自己占一行、子单元缩进两格；没有子单元就整格占一行。

```ts
const pad = "  ".repeat(depth);
const xml = unit.ToXmlString();
if (unit.Data.length === 0) {
  lines.push(pad + xml);
  return;
}
const open = xml.indexOf(">");
lines.push(pad + xml.substring(0, open + 1));
for (let i = 0; i < unit.Data.length; i++) {
  FormatInto(unit.Data[i], depth + 1, lines);
}
lines.push(pad + "</" + unit.Tag + ">");
```
