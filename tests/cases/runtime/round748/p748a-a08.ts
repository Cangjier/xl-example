// xl:title 删除进行中的名字：`delete` 的返回值与属性去向
// xl:round 748
// xl:judge stdout
// xl:want differ
// xl:why `delete 字符串下标`：JS 给 **`false`**（`"abc"[0]` 那一格是**不可配置**的——
// xl:why 字符串的「字符下标」是异质对象上的一格有性质属性），本仓给 `true`。
// xl:why **不是「原始值接收者一律给 `true`」那条**（第 748 轮刚收掉：`delete (1).x` /
// xl:why `delete s.missing` 两边都是 `true`）——**只有字符串的下标**这一档要答 `false`，
// xl:why 判据打出第 3 行 `false a`（Node）对 `true a`（本仓）。
// xl:why 根在**本仓没有「字符串异质对象」那一层**：`"abc"` 的下标是现算的，
// xl:why 不存在任何「不可配置」的落点，于是 `DeleteProperty` 那一趟无从拒绝。
// xl:why 收它要么给字符串一格真的（不可配置的）下标表，要么在 `del_prop` 那一支
// xl:why 对「字符串接收者 + 整数下标 + 下标在长度内」**单开一条判据**——
// xl:why 两条都是新语义，不是修一处笔误；**这一轮的普查只把它量清楚**。
// xl:end
const o: any = { a: 1, b: 2 };
console.log(delete o.a, "a" in o, o.a, Object.keys(o).join(","));
console.log(delete (o as any).missing, delete o["b"]);
const s = "abc";
console.log(delete (s as any)[0], s[0]);
const frozen = Object.freeze({ k: 1 });
console.log(delete (frozen as any).k, frozen.k);
console.log(delete (1 as any).x);
