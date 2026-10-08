// xl:note 类表达式：匿名的 `class extends B {}` 与具名的 `class Named {}` 都应产出 Class
//（原来的期望值是照着当年的错误产物写的——`class extends B {}` 收不出 Class，
//  `{}` 被当成类型字面量，于是用例钉的是 TypeLiteral/TypeLiteralBody。
//  修好之后正确的期望是 Class:2 与 ClassBody:2，这里按 AST 的真实结构改写。）
// xl:expect Class:2,ClassBody:2
// xl:absent TypeLiteral
const A = class extends B {}
const C = class Named {}
