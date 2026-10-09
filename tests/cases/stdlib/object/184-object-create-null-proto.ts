// xl:title `Object.create`：`null` 原型与第二参数（属性描述表）
// xl:round 371
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的五条**（同一件事被五轮各写了一遍）：
//   `006-object-create-prototype-root`（严格说它问的是"继承读"，见下）
//   · `023-object-create-and-prototype-forms` · `077-object-create-null-and-descriptors`
//   · `113-object-create-prototype-r676` · `146-object-create-descriptors`
// 判定点：**`Object.create(null)` 真给一个没有原型的对象**（`getPrototypeOf` 是 `null`、
// 连 `toString` 都没有），而**第二参数是一张属性描述表**（默认不可枚举，`enumerable: true` 才进 `keys`）。
//
// **"继承读"那一件留在 `038-object-create-and-prototype`**（问的是原型链上读得到什么，
// 与 `null` 原型 / 第二参数不是同一个判定点）——`006` 的内容正是它，所以这里只留 `null` 那两档。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① null 原型：拿不到原型、也没有原型上那一族方法
  const bare: any = Object.create(null);
  bare.x = 1;
  console.log(show(Object.getPrototypeOf(bare)));
  console.log(show([bare.x, typeof bare.toString, "toString" in bare].join("|")));
  console.log(show(bare instanceof Object));

  // ② 第二参数：描述表里没写 `enumerable` ⇒ 不进 `keys`；写了才进
  const strict: any = Object.create({}, { v: { value: 7 } });
  console.log(show([strict.v, Object.keys(strict).join(",")].join("|")));
  const shown: any = Object.create({}, { v: { value: 7, enumerable: true } });
  console.log(show([shown.v, Object.keys(shown).join(",")].join("|")));

  // ③ 两档叠在一起：null 原型 + 第二参数
  const both: any = Object.create(null, { a: { value: 1, enumerable: true } });
  console.log(show([both.a, Object.getPrototypeOf(both) === null, typeof both.toString].join("|")));

  // ④ 有原型那一档（与"继承读"共用，但这里的判定点是"原型接对了"）
  const proto: any = { greet: "hi" };
  const child: any = Object.create(proto);
  console.log(show([child.greet, Object.getPrototypeOf(child) === proto].join("|")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
