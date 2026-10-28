# dependencies
```xl
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ExpressionShapeCatalog } from "./expression-shape-catalog.xl.md"
import { RightOperandPossibleShape } from "./right-operand-possible-shape.xl.md"
```

# namespace cangjie

# class ExpressionCatalogFactory

## static method Create:()=>Array<PossibleShape>

```ts
// [E-CAT:REGISTER] E-base 目录 = A1–A4 形态片段的唯一注册入口（片段加在
// `ExpressionShapeCatalog.AppendFragments`，不本文件）。E0b 之前这里是内联列表
// `[NumericLiteralPossibleShape, BinaryExpressionPossibleShape]`；`CreateDeclarationInitializer()` =
// `CreatePrimary()`（数字字面量）+ `CreateOperators()`（二元 `*`/`+` + 注册区片段），
// 顺序与旧内联列表逐项相同，注册区为空时与旧实现逐字节等价（E0b 验收：ledger 380 + tts-impl 45 零漂移）。
// legacy 路径不经过本方法（调用点只在旧开关为真时执行）。
return ExpressionShapeCatalog.CreateDeclarationInitializer();
```

## static method CreateRightOperandCatalog:()=>Array<PossibleShape>

```ts
return RightOperandPossibleShape.Catalog();
```
