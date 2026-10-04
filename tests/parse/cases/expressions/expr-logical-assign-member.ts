// xl:note 成员位上的逻辑赋值 `o.a ??= 1` / `o[k] ||= 2`（第 181 轮）
// xl:expect BinaryOperator,PropertyAccess,Method
const o = { a: 0 };
o.a ??= 1;
o["b"] ||= 2;
o.a &&= 3;
