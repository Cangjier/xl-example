// xl:note 比较运算符同级左结合：`<` / `>` 与 `>=` / `==` / `in` 混写时按 TS 折成左嵌套
// xl:expect BinaryOperator:10
const a = x < y >= z
const b = x == y < z
const c = x < y in z
const d = x > y >= z
const e = x < y instanceof z
