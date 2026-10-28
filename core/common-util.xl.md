# namespace cangjie

# class CommonUtil

## static method XmlDecode:(value:string)=>string

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
