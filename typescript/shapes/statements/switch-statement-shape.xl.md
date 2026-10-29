# dependencies
```xl
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class SwitchStatementShape extends ControlStatementShape

`switch` 的头部与 `while` 同形（关键字 + 条件括号），但条件之后跟的是 CaseBlock 而不是普通 body。
`Body` / `ElseKeyword` 不参与；CaseBlock 单独记在字段里。

## field CaseBlock:Token | null = null
