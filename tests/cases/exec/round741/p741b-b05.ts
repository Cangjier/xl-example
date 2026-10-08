// xl:title 降级层：`?.[]` 之后的调用
// xl:round 741
// xl:judge stdout
// xl:want differ
// xl:why **与 `p741a-a02` 同一条根**：`?.` 后面紧跟**下标**那一格——产物是
// xl:why `[Method(o) ∋ [o, NCO([m], ())]]`（下标括号与实参括号一起装在同一个 NCO 里），
// xl:why 而 `chainWithOptional` 只认两种形状（NCO 第一格是 `Method`，或第一格是
// xl:why `PropertyAccess` 且头一格是实参括号）⇒ 整条链落回「按成员名折属性访问」
// xl:why ⇒ **交出方法本身**（Node 给 `1`）；与第 729 轮那一族同源。
// xl:end
const o: any = { m() { return { v: 1 }; } };
console.log(o?.["m"]().v, o?.["m"]?.().v);
