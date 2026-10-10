// xl:note 标签块里的值位对象字面量（第 953 轮普查量出、当轮收掉）：`lbl: { const o = { [K in T]: X }; }`。
// 里层 `{` 的父亲是标签块那个 `{`，而它在 `BraceInExpression` 眼里是「表达式里的 `{`」（前面是标签冒号）
// ⇒ 位置链会爬进去，撞上的却是**标签冒号** ⇒ 答「类型位」⇒ 值位那个 `in` 被当成映射键的标记。
// **标签是语句**，块里没有「这一层处在类型位还是值位」这回事 ⇒ 链到它就断（`IsLabelColon`，
// 且要求父亲那一格**不在**花括号里——`{ a: { b: … } }` 里 `a:` 也是「名字 + 冒号」的形状）。
// xl:round 953
// xl:expect Let:1,ObjectLiteral:1,ArrayLiteral:1,BinaryOperator:1,Label:1
// xl:absent TypeParameter
// xl:end
lbl: { const o = { [K in T]: X }; }
