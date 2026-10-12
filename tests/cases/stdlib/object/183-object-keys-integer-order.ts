// xl:title `Object.keys` 的键序：整数键在前（按数值升序），其余按插入序
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十六条**（同一件事被逐批重抄的结果）：
//   probe693-o01 · probe693-o02 · probe694-o11 · probe694-o12 · probe694-o13 ·
//   probe694-o14 · probe695-o23 · probe695-o24 · probe697-f08 · probe697-f09 ·
//   probe698-f07 · probe703-o-a36 · probe704-o-d01 · probe-j20
//   ＋ `140-object-keys-order`（同一件事的第三份，含 `values` / `entries` 两个侧面）
//   ＋ `124-object-internals` 的第一档（同一件事的第四份）
// 判定点只有一个：**`OrdinaryOwnPropertyKeys` 的键序**——
//   ① 整数下标键（`0 … 2^32-2`）在最前、**按数值升序**；
//   ② 其余字符串键按**插入序**；
//   ③ `"01"` / `"1.5"` / `"-1"` **不是**整数下标键 ⇒ 归入插入序那一档；
//   ④ `keys` / `values` / `entries` **三支共用同一个次序**（所以它们不是三个判定点）。
// 与 `174-object-keys-primitive`（原始值 / 空表）和符号那一档不是同一个判定点。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① 整数键升序在前，其余按插入序（插入顺序故意写成乱的）
  console.log(show(Object.keys({ b: 1, 2: 2, a: 3, 1: 4 }).join(",")));
  // ② 同一件事：用赋值插进去（不是字面量），次序规则不变
  const o: any = {};
  o.b = 1; o[2] = 2; o.a = 3; o[1] = 4;
  console.log(show(Object.keys(o).join(",")));
  // ③ 不是整数下标键的三档：`"01"` / `"1.5"` / `"-1"` 都按插入序
  console.log(show(Object.keys({ 10: 1, 2: 2, "01": 3 }).join(",")));
  console.log(show(Object.keys((() => { const t: any = {}; t[1.5] = 1; t[2] = 2; return t; })()).join(",")));
  // ④ 上界：`4294967294` 是整数下标键、`4294967295`（2^32-1）不是
  console.log(show(Object.keys({ 4294967295: 1, 4294967294: 2 }).join(",")));
  // ⑤ 三支共用同一个次序（`values` / `entries` 不是另外两个判定点）
  const same: any = { b: 1, 2: 2, a: 3, 1: 4 };
  console.log(show(Object.values(same).join(",")));
  console.log(show(JSON.stringify(Object.entries(same))));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
