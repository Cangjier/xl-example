// xl:title `Object.getOwnPropertyNames`：原型链上的格**不进**自有名表
// xl:round 697
// xl:judge stdout
// xl:end
// 合并原先**同一个判定点**的两条原子探针：
//   probe697-q16（`o.__proto__ = { g: 1 }` 之后）· probe698-c10（`Object.create({}, { a: … })`）
// 判定点只有一个：**这一族只答自有格**——原型链上有什么一律不算
//（`q16` 的原型上有一格 `g`，`c10` 的原型是 `{}`，两边都只能数出自有那一格）。
// 打印壳与原来那两条一致。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // 一：原型上有一格，自有是零
  const p: any = { g: 1 };
  const o: any = {};
  o.__proto__ = p;
  console.log(show(Object.getOwnPropertyNames(o).length));
  console.log(show(Object.getOwnPropertyNames(o).join(",")));
  // 二：原型是空的，自有由第二参数装出来
  const c: any = Object.create({}, { a: { value: 1, enumerable: true } });
  console.log(show([c.a, Object.keys(c).length, Object.getOwnPropertyNames(c).join(",")].join("|")));
  // 对照：继承来的那一格 `in` 给真、自有名表里没有
  console.log(show(["g" in o, Object.getOwnPropertyNames(o).includes("g")].join("|")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
