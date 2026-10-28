# dependencies
```xl
import { SymbolTemplate } from "../../core/syntax/templates/symbol-template.xl.md"
```

# namespace cangjie

# class TypeScriptSymbolTemplate extends SymbolTemplate

## method IsWhiteSpace:(item:string)=>bool

```ts
if (super.IsWhiteSpace(item)) {
  return true;
}
switch (item) {
  case "\u000B":
  case "\u000C":
  // U+0085（NEL）：TS 的 isWhiteSpaceSingleLine 把 nextLine 当单行空白（ECMAScript 不认）；
  // 只在这里收口，core 不动；它不进 LineTerminator 表（TS 的 isLineBreak 不含 0x85）。
  case "\u0085":
  case "\u00A0":
  case "\u1680":
  case "\u2000":
  case "\u2001":
  case "\u2002":
  case "\u2003":
  case "\u2004":
  case "\u2005":
  case "\u2006":
  case "\u2007":
  case "\u2008":
  case "\u2009":
  case "\u200A":
  case "\u200B":
  case "\u2028":
  case "\u2029":
  case "\u202F":
  case "\u205F":
  case "\u3000":
    return true;
  default:
    return false;
}
```

## method IsCombineBlocked:(combined:string, following:string)=>bool

```ts
if (combined === "?:") {
  return true;
}
if (combined === "?.") {
  return following >= "0" && following <= "9";
}
return super.IsCombineBlocked(combined, following);
```
