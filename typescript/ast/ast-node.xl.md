# namespace cangjie

AST 节点：形状树投影成的 ts 风格节点，位置字段与 TS 的 `ts.Node` 同口径（半开区间）。

# class AstNode

## field Kind:string = ""

AST 节点种类名（与 TS 的 `SyntaxKind` 名对应）。

## field Flags:int = 0

节点标志位。

## field Parent:AstNode | null = null

父节点；根节点为 `null`。

## field Pos:int = -1

起始位置（半开，与 TS 的 `pos` 一致）：取形状的 `ShapeToken.Pos`（含前导 trivia）。

## field End:int = -1

结束位置（半开，与 TS 的 `end` 一致）：取形状的 `SourceRange.EndIndex`，**不再 +1/-1**。
