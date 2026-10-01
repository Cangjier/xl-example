// xl:note 交叉类型在联合里（`A & B | C`）：先折紧的 `&`，外层再折 `|`
// xl:expect UnionType,IntersectionType
type X = A & B | C
