# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
```

# namespace cangjie

# class WrapSymbol extends BlockToken

## field IsBasicToken:bool = true

## field IsTriviaToken:bool = true

## constructor:(Template:Template)=>void

```ts
super(Template);
```

## method IsAppend:(buffer:SourceRange, index:int, value:string)=>bool

```ts
return this.Template.SymbolTemplate.IsWhiteSpace(value);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
const last = unit.Last();
const symbolTemplate = unit.Template.SymbolTemplate;
if (!symbolTemplate.IsWhiteSpace(value)) {
  if (last instanceof WrapSymbol && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
    return BranchStates.Reload;
  }
  return BranchStates.Undo;
}
// 空白段整段收：窗口内连续空白一次扫完，跳过逐字符的驱动帧与分派。
const document = buffer.Document!;
const raw = document.GetRaw(index, buffer.End);
let offset = 1;
while (offset < raw.length && symbolTemplate.IsWhiteSpace(raw[offset])) {
  offset++;
}
const at = index + offset;
const runText = raw.substring(0, offset);
if (last instanceof WrapSymbol && !last.Closed) {
  last.AppendAndSignOut(runText, at - 1);
  context.Index = at;
  return BranchStates.Done;
}
if (last !== null && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
unit.Add(new WrapSymbol(unit.Template));
(unit.Last() as WrapSymbol)!.AppendAndSignOut(runText, at - 1).SignIn(index);
context.Index = at;
return BranchStates.Done;
```
