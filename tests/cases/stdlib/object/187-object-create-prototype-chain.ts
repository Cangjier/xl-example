// xl:title `Object.create`：原型链（含 `null`）与第二参数（属性描述表）
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十二条**：
//   probe-j02 · probe-j15 · probe693-o28 · probe693-o29 · probe693-o30 · probe693-o31 ·
//   probe693-o33 · probe695-o28 · probe695-o29 · probe695-o30 · probe704-o-d04 ·
//   probe704-o-d05 · probe704-o-d40 · probe705-o-b14 · probe705-o-b15 · probe705-o-b18 ·
//   probe705-o-b17 · probe705-o-b28
//   ＋ `184-object-create-null-proto`（同一件事的合并稿，本轮并入这里）
//
// 判定点只有一个：**`Object.create` 造出来的对象接在哪条链上**——
//  ① `null` 原型：`getPrototypeOf` 给 `null`、`instanceof Object` 假、连 `toString` 都没有；
//  ② 普通原型：读得到原型上的格，`in` 沿链问、`hasOwn` 只看自有；
//  ③ 第二参数是一张属性描述表（默认**不可枚举**，写了 `enumerable: true` 才进 `keys`）；
//  ④ `setPrototypeOf` 之后 `instanceof` 跟着变（与 `081` 同一件事，这里只留 `create` 那一档）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① null 原型
  const bare: any = Object.create(null);
  bare.a = 1;
  console.log(show(Object.getPrototypeOf(bare)));
  console.log(show(Object.getPrototypeOf(bare) === null));
  console.log(show(typeof bare.toString));
  console.log(show(bare instanceof Object));
  console.log(show(bare.hasOwnProperty));
  console.log(show(Object.create(null).toString === undefined));
  console.log(show(JSON.stringify(Object.create(null))));
  console.log(show(Object.getPrototypeOf(Object.create(null))));
  // ② 普通原型链
  const proto: any = { greet: "hi", a: 1 };
  const child: any = Object.create(proto);
  console.log(show(child.greet));
  console.log(show(Object.getPrototypeOf(child) === proto));
  console.log(show("a" in child));
  console.log(show(Object.hasOwn(child, "a")));
  console.log(show(Object.create({ a: 1 }).a));
  // ③ 第二参数：默认不可枚举
  const strict: any = Object.create({}, { v: { value: 7 } });
  console.log(show([strict.v, Object.keys(strict).join(",")].join("|")));
  const shown: any = Object.create({}, { v: { value: 7, enumerable: true } });
  console.log(show([shown.v, Object.keys(shown).join(",")].join("|")));
  console.log(show(Object.create(null, { a: { value: 1 } }).a));
  console.log(show(Object.create({ a: 1 }, { b: { value: 2 } }).b));
  console.log(show(Object.getPrototypeOf([]) === Array.prototype));
  console.log(show(Object.getPrototypeOf("a") === String.prototype));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
