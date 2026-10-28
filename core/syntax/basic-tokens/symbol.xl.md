# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { PossibleSource } from "../possible-source.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { Common } from "./common.xl.md"
```

# namespace cangjie

# class Symbol extends BlockToken

## field IsBasicToken:bool = true

## constructor:(Template:Template)=>void

```ts
super(Template);
```

## method IsAppend:(buffer:SourceRange, index:int, value:string)=>bool

```ts
if (this.Temp.length === 0 && this.Template.SymbolTemplate.IsSymbol(value)) {
  return true;
}
if (!this.Template.SymbolTemplate.IsSymbol(value)) {
  return false;
}
const combined = this.Temp + value;
if (!this.Template.SymbolTemplate.IsCombinedSymbol(combined)) {
  return false;
}
return !this.Template.SymbolTemplate.IsCombineBlocked(combined, Symbol.NextCharAfter(buffer, index));
```

## static method NextCharAfter:(buffer:SourceRange, index:int)=>string

```ts
const whole = SourceRange.Whole(buffer.Document!);
const count = whole.EndIndex;
const next = index + 1;
if (next >= count) {
  return "";
}
return whole.At(next);
```

## method Is:(value:string)=>bool

```ts
if (this.Temp.length !== value.length) {
  return false;
}
for (let i = 0; i < this.Temp.length; i++) {
  if (this.Temp[i] !== value[i]) {
    return false;
  }
}
return true;
```

## method IsAny:(items:Array<string>)=>bool

```ts
return items.includes(this.TempToString());
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
const template = unit.Template;
const last = unit.Last();
// `\u{…}` 花括号转义进行中：`{` / 十六进制位 / `}` 全归那个 Common，
// 符号层必须让位，否则 `}` 会把还没写完转义的 Common 提前关掉。
if (Common.IsInUnicodeBraceEscape(unit)) {
  return BranchStates.Undo;
}
if ((value === "+" || value === "-")
    && last instanceof Common && !last.Closed
    && last.IsExponentPrefix()) {
  return BranchStates.Undo;
}
if (value === "\\" && Common.IsUnicodeEscapeStart(buffer, index, template, value)) {
  return BranchStates.Undo;
}
if (!template.SymbolTemplate.IsSymbol(value)) {
  if (last instanceof Symbol && !last.Closed) {
    const numberTakesDot = last.TempToString() === "." && template.SymbolTemplate.IsNumber(value);
    if (!numberTakesDot && last.TryToClose(context) === CloseStates.Built) {
      return BranchStates.Reload;
    }
  }
  return BranchStates.Undo;
}
if (last instanceof Symbol && !last.Closed) {
  if (last.IsAppend(buffer, index, value)) {
    last.AppendAndSignOut(value, index);
    return BranchStates.Done;
  }
  if (last.TryToClose(context) === CloseStates.Built) {
    return BranchStates.Reload;
  }
} else if (value === "." && last instanceof Common && last.IsNumberWithoutDecimal()) {
  return BranchStates.Undo;
}
if (last !== null && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
unit.Add(new Symbol(unit.Template));
(unit.Last() as Symbol)!.AppendAndSignOut(value, index).SignIn(index);
return BranchStates.Done;
```
