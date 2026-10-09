// xl:note 交叉类型在联合里（`A & B | C`）：先折紧的 `&`，外层再折 `|`
// xl:expect TypeAssign,UnionType,IntersectionType
// **合并**（第 784 轮）：token/types/type-union-intersection.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
type X = A & B | C
