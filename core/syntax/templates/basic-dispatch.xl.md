# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "./template.xl.md"
import { AreaAnnotation } from "../basic-tokens/area-annotation.xl.md"
import { Bom } from "../basic-tokens/bom.xl.md"
import { Common } from "../basic-tokens/common.xl.md"
import { LineAnnotation } from "../basic-tokens/line-annotation.xl.md"
import { RegexToken } from "../basic-tokens/regex-token.xl.md"
import { Shebang } from "../basic-tokens/shebang.xl.md"
import { StringGuide } from "../basic-tokens/string/string-guide.xl.md"
import { Symbol } from "../basic-tokens/symbol.xl.md"
import { WrapSymbol } from "../basic-tokens/wrap-symbol.xl.md"
```

# namespace cangjie

# class BasicDispatch

## private static field BitBom:int = 1

## private static field BitMarker:int = 2

## private static field BitQuote:int = 4

## private static field BitWs:int = 16

## private static field BitSym:int = 32

## private static field BitPlain:int = 64

## private static field BitClasses:int = 52

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
const template = unit.Template;
const code = value.charCodeAt(0);
if (code >= 128) {
  return BasicDispatch.Fallback(context, unit, buffer, index, value);
}
let table = template.BasicClassTable;
if (table === "") {
  table = BasicDispatch.BuildClassTable(template);
}
const bits = table.charCodeAt(code);
if ((bits & BasicDispatch.BitBom) !== 0) {
  return Bom.Transit(context, unit, buffer, index, value);
}
if ((bits & BasicDispatch.BitMarker) !== 0) {
  const shebang = Shebang.Transit(context, unit, buffer, index, value);
  if (shebang !== BranchStates.Undo) {
    return shebang;
  }
}
const preIndex = index - 1;
if (preIndex >= 0) {
  const pre = preIndex >= buffer.Start ? buffer.ValueAt(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
  if (pre === "/" && unit.IsUndo(preIndex)) {
    if (value === "*") {
      return AreaAnnotation.Transit(context, unit, buffer, index, value);
    }
    if (value === "/") {
      return LineAnnotation.Transit(context, unit, buffer, index, value);
    }
    const regex = RegexToken.Transit(context, unit, buffer, index, value);
    if (regex !== BranchStates.Undo) {
      return regex;
    }
  }
}
if ((bits & BasicDispatch.BitClasses) === 0) {
  let last = unit.Last();
  if (last instanceof WrapSymbol && !last.Closed) {
    const wrap = WrapSymbol.Transit(context, unit, buffer, index, value);
    if (wrap !== BranchStates.Undo) {
      return wrap;
    }
    last = unit.Last();
  }
  if (last instanceof Symbol && !last.Closed) {
    const symbol = Symbol.Transit(context, unit, buffer, index, value);
    if (symbol !== BranchStates.Undo) {
      return symbol;
    }
  }
  if ((bits & BasicDispatch.BitPlain) !== 0) {
    const batched = BasicDispatch.BatchPlain(context, unit, buffer, index, last);
    if (batched !== null) {
      return batched;
    }
  }
  return Common.Transit(context, unit, buffer, index, value);
}
if ((bits & BasicDispatch.BitQuote) !== 0) {
  return StringGuide.Transit(context, unit, buffer, index, value);
}
if ((bits & BasicDispatch.BitWs) !== 0) {
  return WrapSymbol.Transit(context, unit, buffer, index, value);
}
let last = unit.Last();
if (last instanceof WrapSymbol && !last.Closed) {
  const wrap = WrapSymbol.Transit(context, unit, buffer, index, value);
  if (wrap !== BranchStates.Undo) {
    return wrap;
  }
  last = unit.Last();
}
if ((bits & BasicDispatch.BitSym) !== 0 || (last instanceof Symbol && !last.Closed)) {
  const symbol = Symbol.Transit(context, unit, buffer, index, value);
  if (symbol !== BranchStates.Undo) {
    return symbol;
  }
}
if ((bits & BasicDispatch.BitPlain) !== 0) {
  const batched = BasicDispatch.BatchPlain(context, unit, buffer, index, last);
  if (batched !== null) {
    return batched;
  }
}
return Common.Transit(context, unit, buffer, index, value);
```

## private static method Fallback:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
const template = unit.Template;
if (template.BomChars.includes(value)) {
  return Bom.Transit(context, unit, buffer, index, value);
}
const marker = template.ShebangMarker;
if (value === marker[0]) {
  const shebang = Shebang.Transit(context, unit, buffer, index, value);
  if (shebang !== BranchStates.Undo) {
    return shebang;
  }
}
const preIndex = index - 1;
if (preIndex >= 0) {
  const pre = preIndex >= buffer.Start ? buffer.ValueAt(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
  if (pre === "/" && unit.IsUndo(preIndex)) {
    if (value === "*") {
      return AreaAnnotation.Transit(context, unit, buffer, index, value);
    }
    if (value === "/") {
      return LineAnnotation.Transit(context, unit, buffer, index, value);
    }
    const regex = RegexToken.Transit(context, unit, buffer, index, value);
    if (regex !== BranchStates.Undo) {
      return regex;
    }
  }
}
if (template.StringTemplate.Quotes.includes(value)) {
  return StringGuide.Transit(context, unit, buffer, index, value);
}
const symbolTemplate = template.SymbolTemplate;
if (symbolTemplate.IsWhiteSpace(value)) {
  return WrapSymbol.Transit(context, unit, buffer, index, value);
}
let last = unit.Last();
if (last instanceof WrapSymbol && !last.Closed) {
  const wrap = WrapSymbol.Transit(context, unit, buffer, index, value);
  if (wrap !== BranchStates.Undo) {
    return wrap;
  }
  last = unit.Last();
}
if (symbolTemplate.IsSymbol(value) || (last instanceof Symbol && !last.Closed)) {
  const symbol = Symbol.Transit(context, unit, buffer, index, value);
  if (symbol !== BranchStates.Undo) {
    return symbol;
  }
}
return Common.Transit(context, unit, buffer, index, value);
```

## private static method BatchPlain:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, last:Token | null)=>BranchStates | null

```ts
const document = buffer.Document!;
const raw = document.GetRaw(index, buffer.End);
let offset = 1;
while (offset < raw.length) {
  const next = raw.charCodeAt(offset);
  if (!((next >= 48 && next <= 57) || (next >= 65 && next <= 90) || (next >= 97 && next <= 122) || next === 95)) {
    break;
  }
  offset++;
}
const at = index + offset;
const runText = raw.substring(0, offset);
if (last instanceof Common && !last.Closed && !last.HasBackslash) {
  last.AppendAndSignOut(runText, at - 1);
  context.Index = at;
  return BranchStates.Done;
}
if (at > index + 1 && !(last instanceof Symbol) && !(last instanceof Common && !last.Closed)) {
  if (last !== null && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
    return BranchStates.Reload;
  }
  unit.Add(new Common(unit.Template));
  (unit.Last() as Common)!.AppendAndSignOut(runText, at - 1).SignIn(index);
  context.Index = at;
  return BranchStates.Done;
}
return null;
```

## private static method BuildClassTable:(template:Template)=>string

```ts
const symbolTemplate = template.SymbolTemplate;
const quotes = template.StringTemplate.Quotes;
const boms = template.BomChars;
const marker = template.ShebangMarker;
const markerFirst = marker.length > 0 ? marker[0] : "";
let text = "";
for (let code = 0; code < 128; code++) {
  const ch = String.fromCharCode(code);
  let bits = 0;
  if (boms.includes(ch)) {
    bits |= BasicDispatch.BitBom;
  }
  if (ch === markerFirst) {
    bits |= BasicDispatch.BitMarker;
  }
  if (quotes.includes(ch)) {
    bits |= BasicDispatch.BitQuote;
  }
  if (symbolTemplate.IsWhiteSpace(ch)) {
    bits |= BasicDispatch.BitWs;
  }
  if (symbolTemplate.IsSymbol(ch)) {
    bits |= BasicDispatch.BitSym;
  }
  if (BasicDispatch.IsPlainCode(code)) {
    bits |= BasicDispatch.BitPlain;
  }
  text += String.fromCharCode(bits);
}
template.BasicClassTable = text;
return template.BasicClassTable;
```

## private static method IsPlainCode:(code:int)=>bool

```ts
return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95;
```
