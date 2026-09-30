# namespace cangjie

全局工具。`CommonUtil` 放在项目的根命名空间 `Cangjie` 下。

本文件只包含解析路径需要的那一个方法：`BlockToken.ToXmlString` 与各 token 的 XML 输出都要用 `XmlDecode`。

`FormatXml` 是纯展示层的工具：`cjcli` 用它把紧凑的产物排成缩进形式。它**不参与解析**，也不改变产物内容。

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

## static method FormatXml:(xml:string)=>string

把紧凑的单行 XML 排成**每个元素一行、按嵌套缩进两格**的形式——`cjcli` 的打印走这里。

它与 `XmlDecode` 是两件事：`XmlDecode` 决定**内容**怎么转义，`FormatXml` 只决定**空白**怎么摆。产物内容一字不改，所以 `Root.ToString()` 的紧凑形态仍然是验收与测试用的那一份，缩进只发生在打印层。

**扫描必须逐字符判状态，不能切成「`<` 到第一个 `>`」的片段。** 这里踩过两次坑，都记在下面：

- 文本里会出现 `>` 与 `<`：`<SymbolToken>&gt;=</SymbolToken>` 与 `<SymbolToken>&gt;</SymbolToken>` 都合法，
  而 `<SymbolToken>` 之后紧跟的字符就是 `&`。所以「`<` 到最近的 `>`」会把 `&gt;=` 的开头也当成标签。
- 属性值里会出现 `&lt;` / `&gt;`：`op="&lt;="` 里的 `<` 是转义实体的一部分，不是标签起点。

于是 `ScanTagEnd` 只负责一件事：**从 `xml[start]`（一定是 `<`）出发，找到这个标签真正的结尾下标**，并且

1. 认得引号：`"` / `'` 之间的 `>` 不算结尾（属性值里可能有 `>`）；
2. 认得转义实体：`&` 与配对的 `;` 之间的字符一律跳过（`&lt;` / `&gt;` / `&amp;`）；
3. 找不到就返回 `-1`，由调用方放弃缩进、原样返回——**缩进是改善，不是正确性的前提**。

`FormatXml` 则按「标签 + 标签后的文本」为单位走，深度由 `>` 之后紧邻的是不是 `<` 决定：

- `<A>x</A>`：`<A>` 之后不是 `<`，是叶子，整行输出；
- `<A><B/></A>`：`<A>` 之后是 `<`，是容器，换行并且深度加一；
- `</A>` 是容器的收尾，深度减一；叶子的 `</A>` 已经在叶子那一行里、不会再单独出现。

```ts
const indent = "  ";
let result = "";
let depth = 0;
let cursor = 0;
while (cursor < xml.length) {
  if (xml[cursor] !== "<") {
    // 文本段：紧贴着它的开标签，不另起一行，也不重新缩进
    result = result + xml[cursor];
    cursor = cursor + 1;
    continue;
  }
  const end = CommonUtil.ScanTagEnd(xml, cursor);
  if (end === -1) {
    // 形状不认识就整体放弃缩进，原样返回：宁可不好看，也不要排错
    return xml;
  }
  const tag = xml.substring(cursor, end + 1);
  if (tag.startsWith("</")) {
    // 容器的收尾：叶子的收尾已经在叶子那一行里被吃掉了，不会走到这里
    depth = depth - 1;
    if (depth < 0) {
      depth = 0;
    }
    result = result + indent.repeat(depth) + tag + "\n";
    cursor = end + 1;
    continue;
  }
  if (tag.endsWith("/>")) {
    result = result + indent.repeat(depth) + tag + "\n";
    cursor = end + 1;
    continue;
  }
  const next = end + 1 < xml.length ? xml[end + 1] : "";
  if (next !== "<") {
    const closeEnd = CommonUtil.ScanTagEnd(xml, xml.indexOf("</", end + 1));
    if (closeEnd === -1) {
      return xml;
    }
    // 叶子：开标签 + 文本 + 闭合标签 拼成一行
    result = result + indent.repeat(depth) + xml.substring(cursor, closeEnd + 1) + "\n";
    cursor = closeEnd + 1;
    continue;
  }
  // 容器：开标签独占一行，深度加一
  result = result + indent.repeat(depth) + tag + "\n";
  depth = depth + 1;
  cursor = end + 1;
}
return result;
```

## static method ScanTagEnd:(xml:string, start:int)=>int

找 `xml[start]`（`<`）所在标签的结尾下标，找不到返回 `-1`。

它**只认语法，不认标签表**：不检查标签名，也不要求配对——配对是 `XmlDecode` 那侧与测试脚本的事，
这里只需要知道「这个标签在哪儿结束」。

```ts
if (start < 0 || start >= xml.length || xml[start] !== "<") {
  return -1;
}
let i = start + 1;
while (i < xml.length) {
  const ch = xml[i];
  if (ch === "&") {
    const stop = xml.indexOf(";", i);
    if (stop === -1) {
      return -1;
    }
    i = stop + 1;
    continue;
  }
  if (ch === '"' || ch === "'") {
    const stop = xml.indexOf(ch, i + 1);
    if (stop === -1) {
      return -1;
    }
    i = stop + 1;
    continue;
  }
  if (ch === ">") {
    return i;
  }
  i = i + 1;
}
return -1;
```
