// xl:title 可选调用与**二元**的排布
// xl:round 741
// xl:judge stdout
// xl:want differ
// xl:why **二元单元的右操作数延续到外面的兄弟**（第 145 轮那一族）：`o?.m() * 2 + o?.m()`
// xl:why 的产物是 `[o, BinaryOperator(+)( BinaryOperator(*)(NCO(m), *, 2), +, o ), NCO(Method(m))]`
// xl:why ——右操作数那半截（`?.m()`）掉在二元单元**外面**当兄弟，投影没把它接回右操作数上
// xl:why ⇒ 交出来的是 `{ m: … }`（Node 给 `3`）。同一条根：那一格与 `?.` 的另一侧没有接线。
// xl:end
const o: any = { m() { return 1; } };
const n: any = null;
console.log(o?.m() + 1, (n?.m() ?? 5) + 1);
console.log(o?.m() === 1, n?.m() === undefined);
console.log(o?.m() * 2 + o?.m());
