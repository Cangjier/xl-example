// xl:note 复合赋值的 15 种写法：切开成「左值 = 左值 op 右值」
//（Process 原来按写死的下标切 `+=`，三字符的 `<<=` / `??=` / `&&=` 全被切错——
//  `<<=` 变成 `<` 与 `<=`（两层 Operator="<="）、`??=` 变成 `?=` 与 `?=`。
//  改成按 Temp.length 保留最后一个字符之后，运算符副本人是完整的）
// xl:expect Symbol,BinaryOperator:12
a += b;
a -= b;
a *= b;
a /= b;
a %= b;
a **= b;
a <<= b;
a >>= b;
a >>>= b;
a &= b;
a |= b;
a ^= b;
a &&= b;
a ||= b;
a ??= b;
