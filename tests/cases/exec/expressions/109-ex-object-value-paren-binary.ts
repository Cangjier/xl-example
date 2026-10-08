// xl:title 对象字面量的值是一对圆括号里的二元表达式
// xl:judge stdout
// xl:want blocked
// xl:why 对象字面量的值里那对括号：`(a.x + b.x)` 只折出二元表达式，`.x` 那一截散着 ⇒ 降级层把属性名当变量读
// xl:end

const a = { x: 1, y: 3 };
const b = { x: 2, y: 4 };
const mid = { x: (a.x + b.x) / 2 };
console.log(mid.x);
