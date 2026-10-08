// xl:title 可选调用接在**普通成员链**后面
// xl:round 741
// xl:judge stdout
// xl:want differ
// xl:why **`?.m?.()` 是两个平级 NCO**（第 729 轮登记过、这一轮量到它的另一种排版）：
// xl:why `o.a?.m?.()` 的产物是 `[Method(o) ∋ [o, ., a, NCO(m), NCO(())]]`——第二个 NCO 里装的是
// xl:why **实参括号**，而投影的链那一支只把紧挨着被调者的那个 NCO 接上，第二个落成平级
// xl:why ⇒ 那一格**静默给 `undefined`**（Node 给 `3`）。
// xl:end
const o: any = { a: { m() { return 3; } } };
console.log(o.a.m?.(), o.a?.m(), o.a?.m?.());
console.log(o.b?.m?.(), o.a.m?.().toString());
