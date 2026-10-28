# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { BinaryExpressionPossibleShape } from "../expressions/binary-expression-possible-shape.xl.md"
import { BinaryOperatorInfo, BinaryOperatorTable } from "../expressions/binary-operator-table.xl.md"
import { BinaryOperatorTokenShape } from "../punctuation/binary-operator-token-shape.xl.md"
import { IfStatementShape } from "../statements/if-statement-shape.xl.md"
import { ControlBodyPossibleShape } from "../statements/control-body-possible-shape.xl.md"
```

# namespace cangjie

# class ConditionBracketCloseDispatch

## static method Dispatch:(bracket:Bracket, context:SyntaxContext)=>CloseStates

```ts
const last = bracket.Last();
if (last !== null && !last.Closed) {
  last.TryToClose(context);
}
const code = bracket.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
const expression = ConditionBracketCloseDispatch.Build(code, bracket.Template, context);
const parent = bracket.Parent;
if (!(parent instanceof IfStatementShape)) {
  throw new Error("ConditionBracketCloseDispatch: 条件括号的父级不是 if");
}
const at = parent.Data.indexOf(bracket);
if (at < 0) {
  throw new Error("ConditionBracketCloseDispatch: 括号不在 if 的 Data 里");
}
parent.Data.splice(at, 1, expression);
expression.Parent = parent;
parent.Condition = expression;
parent.CatalogGuide = new CatalogGuide([new ControlBodyPossibleShape()], null);
parent.MountedUnit = null;
return CloseStates.Built;
```

## static method Build:(code:Array<Token>, template:Template, context:SyntaxContext)=>Token

```ts
const values:Array<Token> = [];
const infos:Array<BinaryOperatorInfo> = [];
const operators:Array<Token> = [];
for (const item of code) {
  if (item instanceof BinaryOperatorTokenShape) {
    const info = BinaryOperatorTable.Find(item.Op);
    if (info === null) {
      throw new Error("ConditionBracketCloseDispatch: 不支持的运算符 " + item.Op);
    }
    while (infos.length > 0) {
      const top = infos[infos.length - 1];
      const pop = top.Precedence > info.Precedence
        || (top.Precedence === info.Precedence && !info.RightAssociative);
      if (!pop) {
        break;
      }
      ConditionBracketCloseDispatch.Combine(values, infos, operators, template, context);
    }
    infos.push(info);
    operators.push(item);
    continue;
  }
  values.push(item);
}
while (infos.length > 0) {
  ConditionBracketCloseDispatch.Combine(values, infos, operators, template, context);
}
if (values.length !== 1) {
  throw new Error("ConditionBracketCloseDispatch: 条件表达式不完整");
}
return values[0];
```

## private static method Combine:(values:Array<Token>, infos:Array<BinaryOperatorInfo>, operators:Array<Token>, template:Template, context:SyntaxContext)=>void

```ts
const info = infos.pop();
const operator = operators.pop();
const right = values.pop();
const left = values.pop();
if (info === undefined || operator === undefined || right === undefined || left === undefined) {
  throw new Error("ConditionBracketCloseDispatch: 条件表达式栈不完整");
}
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operator, info.Precedence, template);
binary.Pos = BinaryExpressionPossibleShape.PosOf(left);
binary.Add(right);
binary.TryToClose(context);
values.push(binary);
```
