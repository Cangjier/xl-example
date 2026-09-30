# namespace cangjie

全局工具。`CommonUtil` 放在项目的根命名空间 `Cangjie` 下。

本文件只包含解析路径需要的那一个方法：`BlockToken.ToXmlString` 与各 token 的 XML 输出都要用 `XmlDecode`。

# class CommonUtil

全局工具类。

xl 没有 `static class`，方法用 `## static method` 表达。

## static method XmlDecode:(value:string)=>string

把文本转义成可以安全塞进 XML 文本节点的形式。

`XmlDecode` 对 13 个字符做替换：`\r` `\n` `\t` `\a` `\b` `\f` `\\` `'` `"` `\v` 换成反斜杠转义，`>` `<` `&` 换成 XML 实体。注意它的名字叫 Decode，干的却是 **encode**——ts 侧沿用这个名字，以免调用点对不上。

ts 侧没有 `'\a'` 这个转义（`"\a"` 就是字母 `a`），所以控制字符写成 `"\x07"`。

```ts
let result = "";
for (const ch of value) {
  switch (ch) {
    case "\r":
      result += "\\r";
      break;
    case "\n":
      result += "\\n";
      break;
    case "\t":
      result += "\\t";
      break;
    case "\x07":
      result += "\\a";
      break;
    case "\b":
      result += "\\b";
      break;
    case "\f":
      result += "\\f";
      break;
    case "\\":
      result += "\\\\";
      break;
    case "'":
      result += "\\'";
      break;
    case '"':
      result += '\\"';
      break;
    case "\v":
      result += "\\v";
      break;
    case ">":
      result += "&gt;";
      break;
    case "<":
      result += "&lt;";
      break;
    case "&":
      result += "&amp;";
      break;
    default:
      result += ch;
      break;
  }
}
return result;
```
