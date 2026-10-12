// xl:note 类表达式：匿名的 `class extends B {}` 与具名的 `class Named {}` 都应产出 Class + ClassBody（`{}` 不能被当成类型字面量）
// xl:absent TypeLiteral
// **合并**（第 784 轮）：token/declarations/cls-expression.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
const A = class extends B {}
const C = class Named {}
