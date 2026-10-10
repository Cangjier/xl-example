// xl:note 计算属性名里**套一层圆括号**时括号不成形（第 953 轮普查量出）。
// `const o = { [(x in y)]: 1 };`：TS 那边是 `ComputedPropertyName > ParenthesizedExpression >
// BinaryExpression`，产物里那对圆括号是**一格裸 `Bracket`**（未映射）⇒ 缺 `ParenthesizedExpression` 1、
// 多 `Bracket` 1。**同一形状在别的落点是好的**：`const v = (x in y);` 与 `f((x in y));` 逐节点一致——
// 投影那边有一条「值位括号 → `ParenthesizedExpression`」的判据（`print-ast-common` 的 `parenthesizedOf`），
// 它认的是「这一格是操作数」那种落点，认不出**计算属性名那一格**（那里括号被原样透传）。
// 与 `in` 无关：`{ [(a + b)]: 1 }` / `{ [(f(x))]: 1 }` 一样对不上（实测三条同形）。
// 下一轮的入手处：找计算属性名那条投影路径（`ComputedPropertyName` 的名字投影），把「一格 `(` 括号」
// 按 `parenthesizedOf` 投——**判据别新写**，问现成的那一条。
// xl:known-gap 计算属性名里套圆括号时括号不成形（缺 ParenthesizedExpression 1、多未映射 Bracket 1）
// xl:end
const o = { [(x in y)]: 1 };
const p = { [(a + b)]: 1 };
