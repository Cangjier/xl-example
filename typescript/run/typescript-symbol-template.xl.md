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
return super.IsCombineBlocked(combined, following);
```

## method ShouldSplit:(combined:string, following:string)=>bool

```ts
if (combined === "?." && following >= "0" && following <= "9") {
  return true;
}
return super.ShouldSplit(combined, following);
```

## method CanContinue:(prefix:string)=>bool

```ts
if (prefix === "?.") {
  return true;
}
return super.CanContinue(prefix);
```
