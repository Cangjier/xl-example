// xl:title `?.[]` 之后的调用与再取成员
// xl:round 741
// xl:judge stdout
// xl:want differ
// xl:why **`?.` 后面紧跟下标那一格**（第 741 轮量到）：`o?.["m"]()` / `o?.m?.().v` 这一族
// xl:why 的产物把**下标括号与实参括号一起**装进同一个 NCO，而投影只把紧挨着被调者的那一格接上，
// xl:why 剩下的落成平级 ⇒ **交出方法本身**（Node 给 `1`）。根与第 729 轮登记的 `o?.m?.()` 同源：
// xl:why 实参括号与**已折好的那一格**之间没有接线（`OptionalCallCloseRule` 认得 `IsCalleeEnd`，
// xl:why 可真正成形的那一趟落在 `?.` 的另一侧）。
// xl:end
const o: any = { m() { return { v: 2 }; } };
console.log(o?.["m"](), o?.["m"]().v);
console.log(o?.m?.().v, o?.["m"]?.().v);
