// xl:title `new` 与可选链 / 非空断言 / 下标混用（第 729 轮量出来的两条根都在这里）
// xl:round 729
// xl:judge stdout
// xl:want differ
// xl:why **两条根都在「可选链 / 非空断言后面跟调用」那一格**（第 729 轮量的）：
// xl:why ① `o?.m?.()` 原来被收成**两个平级的 NCO**（`o` + `NCO(m)` + `NCO(括号)`）
// xl:why ⇒ 降级层把中间那一格当成**实参表**、没有调用节点 ⇒ 那一格**静默给 `undefined`**
// xl:why （Node 给 `1`）；② `o!.m!()` 被收成 `NCO(Method(m, NotNull, 括号))`
// xl:why ⇒ 投影出的 `PropertyAccessExpression.name` 是空 `Identifier`、
// xl:why `arguments` 是 `[]` ⇒ 降级层报 `cannot call a non-closure value`
// xl:why （**整份脚本在这里断**，Node 给 `1 1 1`）。
// xl:why 两条的根同一处：实参括号与**已折好的那一格**（NCO / NotNull）之间没有接线——
// xl:why `OptionalCallCloseRule.IsCalleeEnd` / `IsChainLink` 认 `NotNull` / `NCO`，
// xl:why 但真正成形的那一趟落在 `?.` 的**另一侧**，`MethodCloseRule` 与它各收各的。
// xl:end
class C { v = 1; m() { return this.v; } }
const o: any = new C();
console.log(o?.v, o?.m?.(), (new C())?.["v"], new C().v);
console.log((o as any)!.v, o!.v, o!.m!());
