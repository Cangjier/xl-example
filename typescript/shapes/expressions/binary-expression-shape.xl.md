# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class BinaryExpressionShape extends ShapeToken

## field Left:Token | null = null

## field Operator:Token | null = null

## field Precedence:int = 0

## static method FromLeftAndOperator:(left:Token, operator:Token, precedence:int, template:Template)=>BinaryExpressionShape

```ts
const shape = new BinaryExpressionShape(template);
shape.SignIn(left.SourceRange.Start);
shape.Add(left);
shape.Add(operator);
shape.Left = left;
shape.Operator = operator;
shape.Precedence = precedence;
return shape;
```

## static method HasLineTerminatorTrivia:(unit:Token)=>bool

```ts
if (!unit.IsTriviaToken) {
  return false;
}
const range = unit.SourceRange;
if (range.Start < 0 || range.End < 0) {
  return false;
}
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null) {
  return false;
}
const text = document.GetRaw(range.Start, range.End);
return text.indexOf("\n") >= 0
  || text.indexOf("\r") >= 0
  || text.indexOf("\u2028") >= 0
  || text.indexOf("\u2029") >= 0;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken);
// 子节点都收口之后，右边界就是最后一个代码子单元的 End。EOF 的 SignOut 只沿
// 「最后一个子单元」递归，尾部空白会让这个二元式落在链外，TryToClose 算出的
// End 可能含尾随 trivia（偏大），也可能停在早先某次封口（偏小）。
const last = this.Last();
if (last !== null && last.SourceRange.End >= 0) {
  this.SourceRange.End = last.SourceRange.End;
}
this.Closed = true;
return CloseStates.Nothing;
```
