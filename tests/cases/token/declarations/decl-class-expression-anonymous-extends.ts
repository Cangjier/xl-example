// xl:note 匿名类表达式 `class extends B {}`：`class` 与 `extends` 之间没有名字，
// 也必须收出一个 Class（修前整条散架，`{}` 被当成类型字面量）
// xl:expect Class:2,ClassBody:2
const A = class extends B {}
const C = class Named {}
