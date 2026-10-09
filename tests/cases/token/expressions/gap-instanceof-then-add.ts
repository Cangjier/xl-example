// xl:note `instanceof` 右边那个 `<…>` 后面跟 `+` / `-` 时的比较链结合方向（第 894 轮登记、第 897 轮收掉）
// 第 894 轮登记、第 895 轮把接线修好、第 896 轮把**剩下的那一格**量到了最小片段。
//
// **TS 那边**：`canFollowTypeArgumentsInExpression` 明写「配对 `>` 后面是 `<` / `>` / `+` / `-`
// 就判否」，于是 `C<D>` 不成实例化表达式、整条读成比较链。TS 的比较运算符**同级左结合**，
// 所以给的是左嵌套：`BinaryOperator(BinaryOperator(b instanceof C, <, D), >, +e)`。
//
// **根因**（第 897 轮量清）：`RelationalInstance` 比 `InstanceofInstance` **早**问到 `<`
//（见 `parse-pipeline.xl.md` 的 `GeneralCloseRule`），而那一趟里 `instanceof` 还没折 ⇒
// `<` 把 `C` 当成了左操作数、折成 `C < D` ⇒ 最后是**右嵌套** `b instanceof ((C < D) > d)`
//（产物与 TS 逐 token 一致，只是嵌套方向相反）。
// 修法在 `binary-operator.xl.md` 的 `YieldsToInstanceof`：`<` / `>` 左边同一层里还躺着一格
// **能折的** `instanceof` 时先让开（判据原样交给 `InstanceofInstance.Previous`，不另立一套）。
//
// 片段（`tmp/r896/triple.mjs`，一个片段一个进程）：
//
//   const a = b instanceof C < D > d;   ⇒ 左嵌套 ✓（修前右嵌套 ✗）
//   const a = b instanceof C <= D >= d; ⇒ 左嵌套 ✓（`<=` / `>=` 与泛型实参不同形，本来就没坏过）
//   const a = b < c > d;               ⇒ 左嵌套 ✓（没有 `instanceof` 时本来就没坏过）
// xl:round 897
// xl:end
const a = b instanceof C<D> + e;
