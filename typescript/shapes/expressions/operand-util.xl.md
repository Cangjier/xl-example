# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
```

# namespace cangjie

# class OperandUtil

## static field Keywords:Array<string> = ["let", "const", "var", "function", "class", "if", "else", "while", "for", "do", "switch", "case", "default", "break", "continue", "return", "throw", "try", "catch", "finally", "debugger", "with", "new", "delete", "typeof", "void", "in", "instanceof", "this", "super", "import", "export", "yield", "await", "async", "enum", "interface", "type", "namespace", "declare", "true", "false", "null", "undefined"]

## static method FromCommon:(common:Common, pos:int)=>Token

```ts
if (common.IsNumber() || common.IsBigInt()) {
  return NumericLiteralShape.FromCommon(common, pos);
}
return IdentifierShape.FromCommon(common, pos);
```

## static method IsIdentifier:(text:string)=>bool

```ts
return text.length > 0 && /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(text);
```

## static method IsKeyword:(text:string)=>bool

```ts
return OperandUtil.Keywords.includes(text);
```

## static method CanStartExpression:(common:Common)=>bool

```ts
if (common.IsNumber() || common.IsBigInt()) {
  return true;
}
const text = common.TempToString();
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text);
```

## static method PositionOf:(units:Array<Token>, index:int)=>int

```ts
// pos 取「紧贴该单元左侧那串 trivia 的起点」。不能只用数组顺序：
// 二元式封口后，前面的 trivia 可能排在它后面，ItemUtil.PreviousCode 的相邻假设不成立。
let pos = units[index].SourceRange.Start;
let moved = true;
while (moved) {
  moved = false;
  for (let at = 0; at < units.length; at++) {
    const unit = units[at];
    if (unit.IsTriviaToken && unit.SourceRange.End === pos) {
      pos = unit.SourceRange.Start;
      moved = true;
      break;
    }
  }
}
return pos;
```
