// xl:note 计算属性名里**套一层圆括号**（第 953 轮普查量出、第 954 轮收掉）：TS 那边是
// `ComputedPropertyName > ParenthesizedExpression > BinaryExpression`，产物原来是**一格裸 `Bracket`**
// （未映射 ⇒ 缺 `ParenthesizedExpression` 1、多未映射 `Bracket` 1）。根因在 `print-ast-common` 的
// `computedNameExpression`：它给**单个子单元**开了近路（直接 `projectNode`），而
// 「值位括号 → `ParenthesizedExpression`」那条判据长在 `projectExpression` 里（`parenthesizedOf`）
// ⇒ 单格也交给它问一次，**判据一条没新写**。与 `in` 无关，也与落点无关：
// 对象字面量 / 类字段 / 类方法 / getter / 嵌两层括号共 25 条片段全过（`tmp/r954/snips.json`）。
// 同一形状在别的落点一直是好的（`const v = (x in y);` / `f((x in y));` 逐节点一致）。
// xl:round 953
// xl:expect ObjectLiteral:3,ArrayLiteral:5,Bracket:7,BinaryOperator:6
// xl:absent TypeParameter
// xl:end
const o = { [(x in y)]: 1 };
const p = { [(a + b)]: 1 };
const q = { [((a + b) * c)]: 1 };
class C {
  [(a + b)] = 1;
  [(a * b)]() {}
}
