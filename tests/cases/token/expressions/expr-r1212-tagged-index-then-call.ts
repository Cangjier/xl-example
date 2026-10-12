// xl:note 第 1212 轮（口径 1.1）收掉：标签模板的尾巴那一格是一次调用的实参括号时，
// 0c 那一支原来无条件交给 foldBinaryFrom，而实参括号不是运算符单元 ⇒ 那次调用整格丢
// （`a`x`[c](d)` 的产物是 `[Identifier(a), PropertyAccess([String, [c]]), Bracket((d))]`）。
// 判据按「这一格是不是链的续格」分成两半：实参括号给 chainOnto，其余照旧走二元那一支。
// xl:round 1212
// xl:end
a`x`[c](d);
