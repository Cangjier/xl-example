# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DeferredBracketCatalog } from "../statements/deferred-bracket-catalog.xl.md"
import { ArrowParamsCatalog } from "./forms/primary/arrow-params-catalog.xl.md"
```

# namespace cangjie

# class ArrowFunctionShape extends ShapeToken

```txt
let f = () => 1;
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

```ts
if (!this.Closed) {
  for (let at = this.Data.length - 1; at >= 0; at--) {
    const unit = this.Data[at];
    if (!unit.Closed && !unit.IsBasicToken) {
      unit.TryToClose(context);
    }
  }
  while (this.Data.length > 0 && this.Data[this.Data.length - 1].IsTriviaToken) {
    this.Data.splice(this.Data.length - 1, 1);
  }
}
const state = super.TryToClose(context);
// EOF 收口时驱动层先按文件长度 `SignOut` 整棵树，箭头因此可能被签出到尾随空白之后
// （`const f = a => a + 1\n` 的 21 而不是 20）。`Data` 现在只有代码子单元，收回最后一个代码子单元的终点。
this.TrimEndToLastCode();
return state;
```

## static method BindParameterBracket:(bracket:Token, context:SyntaxContext)=>bool

```ts
if (bracket === null) {
  return false;
}
return ArrowParamsCatalog.BindArrowParen(bracket, context);
```

## static method Report:()=>string

```ts
return ArrowParamsCatalog.Report() + " | " + DeferredBracketCatalog.Report();
```
