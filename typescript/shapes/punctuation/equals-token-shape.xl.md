# dependencies
```xl
import { BinaryOperatorTokenShape } from "./binary-operator-token-shape.xl.md"
```

# namespace cangjie

# class EqualsTokenShape extends BinaryOperatorTokenShape

`=` 在这里是赋值二元运算符（TS 的 AssignmentExpression 就是 BinaryExpression + EqualsToken）。
声明里的 `=` 不走这里：VariableDeclaration 的初始化式由 InitializerPossibleShape 认领。

## field Op:string = "="
