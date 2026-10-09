// xl:note `instanceof` 右边那个 `<…>` 后面跟 `+` / `-` 时的比较链结合方向（已知缺口）
// 第 894 轮登记、第 895 轮把接线修好、第 896 轮把**剩下的那一半**量到了最小片段。
//
// **TS 那边**：`canFollowTypeArgumentsInExpression` 明写「配对 `>` 后面是 `<` / `>` / `+` / `-`
// 就判否」，于是 `C<D>` 不成实例化表达式、整条读成比较链。TS 的比较运算符**同级左结合**，
// 所以给的是左嵌套：`BinaryOperator(BinaryOperator(b instanceof C, <, D), >, +e)`。
//
// **本仓现在**：第 895 轮修好接线之后产物与 TS **逐 token 一致**
//（`<BinaryOperator op="instanceof">…` 里嵌着 `<BinaryOperator op=">"><BinaryOperator op="<">…`），
// 而**结合方向相反**——右嵌套。
//
// **第 896 轮把它缩到了最小片段**（`tmp/r896/triple.mjs`，一个片段一个进程）：
//
//   const a = b instanceof C < D > d;   ⇒ 右嵌套 ✗（TS 左嵌套）
//   const a = b instanceof C <= D >= d; ⇒ 左嵌套 ✓
//   const a = b < c > d;               ⇒ 左嵌套 ✓
//
// 也就是说：**同一个位置、只有 `<` / `>` 这一对会反，`<=` / `>=` 与没有 `instanceof` 的
// 写法都正常**。差别只在尖括号那一支（`GenericTypeBranch` 要把 `C<D>` 试读成一个类型实参段，
// 而那次试读恰好被 `instanceof` 判否）——所以要收这一格，入手处是
// 「试读失败之后那两格尖括号在二元折叠里的次序」，不是 `instanceof` 那一支。
// xl:known-gap 同级尖括号比较链折成了右嵌套（`>` 先折、`<` 后折），TS 给左嵌套
// xl:round 896
// xl:end
const a = b instanceof C<D> + e;
