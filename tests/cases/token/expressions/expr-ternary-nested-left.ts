// xl:note 左嵌套三元：内层在真值段里（`a ? b ? c : d : e`）
//（`Previous` / `Process` 原来都假设「左边那个 `?` 就是我的」，而左嵌套里内层那个 `:`
//  往左先撞上的是**外层**的 `?` ⇒ 内层把外层的 `:` 也吞进假值段；
//  第 857 轮起 `MatchingQuestionIndex` 按括号那样的深度算配对，两处都读它）
// 三条一起钉：不夹 `&&` 的一层、夹了 `&&` 的一层（真值段里有二元）、以及右边还有兄弟三元
// xl:expect TernaryOperator:7
const x = a ? b ? c : d : e;
const y = a === undefined ? b && c ? d : e : g;
const z = a ? b ? c : d : e ? f : g;
