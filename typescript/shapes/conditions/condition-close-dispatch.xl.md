# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { BinaryExpressionPossibleShape } from "../expressions/binary-expression-possible-shape.xl.md"
import { BinaryOperatorInfo } from "../expressions/binary-operator-table.xl.md"
import { BinaryOperatorTable } from "../expressions/binary-operator-table.xl.md"
import { BinaryOperatorTokenShape } from "../punctuation/binary-operator-token-shape.xl.md"
```

# namespace cangjie

# class ConditionCloseDispatch

## static method Build:(code:Array<Token>, template:Template, context:SyntaxContext)=>Token

```ts
const values:Array<Token> = [];
const infos:Array<BinaryOperatorInfo> = [];
const operators:Array<Token> = [];
for (const item of code) {
  if (item instanceof BinaryOperatorTokenShape) {
    const info = BinaryOperatorTable.Find(item.Op);
    if (info === null) {
      throw new Error("ConditionCloseDispatch: 不支持的运算符 " + item.Op);
    }
    while (infos.length > 0) {
      const top = infos[infos.length - 1];
      const pop = top.Precedence > info.Precedence
        || (top.Precedence === info.Precedence && !info.RightAssociative);
      if (!pop) {
        break;
      }
      ConditionCloseDispatch.Combine(values, infos, operators, template, context);
    }
    infos.push(info);
    operators.push(item);
    continue;
  }
  values.push(item);
}
while (infos.length > 0) {
  ConditionCloseDispatch.Combine(values, infos, operators, template, context);
}
if (values.length !== 1) {
  throw new Error("ConditionCloseDispatch: 条件表达式不完整");
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
  throw new Error("ConditionCloseDispatch: 条件表达式栈不完整");
}
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operator, info.Precedence, template);
binary.Pos = BinaryExpressionPossibleShape.PosOf(left);
binary.Add(right);
binary.TryToClose(context);
values.push(binary);
```
