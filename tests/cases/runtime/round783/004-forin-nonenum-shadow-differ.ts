// xl:title `for..in`：**自有的不可枚举属性要挡住**原型上同名的那一格
// xl:round 783
// xl:judge stdout
// xl:end
// **第 892 轮收掉**（台账撤掉、留作守卫）：`CollectForInKeys` 那一趟在**每一层**
// 补一次「自有**全部**字符串键」的标记（新抽的 `OwnStringKeyTexts`：与可枚举名单
// 同一套下标判据、只是**不筛 `IsEnumerable`**），于是「自有那一格存在就 `visited` 掉」
// 那一步有了——十八档全部对上 Node（八个方向 + 十档对照）。
// **第一版把它写在 `while` 外面，八档输出与改之前逐字相同**（原型链已经走完了才补标记），
// 所以这一步**必须**在每一层的循环体里、并且用**那一层**（`layer`）。
// 下面那一段是**收之前记的账**（一字未改），留作「这一条在测什么」的说明。
//
// xl:why 第 783 轮量到的：`for..in` 沿原型链枚举时，**自有的不可枚举属性要挡住**
// xl:why 原型上同名那一格（规范 §14.7.5.6 `EnumerateObjectProperties` 的
// xl:why `[[GetOwnProperty]]`：自有那一格**存在**就 `visited` 掉、**不再往下走**，
// xl:why 与「可不可枚举」无关）。本仓**挡不住**——四个出口同一个根：
// xl:why ① 自有不可枚举的**数据**属性挡不住原型的可枚举同名格（Node 给 `[]`、本仓给 `["a"]`）；
// xl:why ② 自有不可枚举的**访问器**同样挡不住（Node `[]`、本仓 `["a"]`）；
// xl:why ③ 隔一层也一样（`o → p → g`，`p` 上那一格不可枚举：Node `[]`、本仓 `["a"]`）；
// xl:why ④ 自有不可枚举那一格**旁边**的可枚举格仍然要出现（Node `["b"]`、本仓 `["b","a"]`
// xl:why ——`a` 多出来的正是没被挡住的那一格）。
// xl:why **已经对的那一半**（这一条不许把它们带坏）：自有的**可枚举**格挡得住原型上的
// xl:why 不可枚举格（第 3 档两边都给 `[]`）、原型上不可枚举的格本来就不列
// xl:why （第 5 档两边都给 `[]`）、以及 `Object.keys` 与 `in` 两问本来就只看自有
// xl:why （第 9 / 10 档两边一致）。
// xl:why **同一族的另一半已经对了**：`for..in` 里 `delete` **当前**那一格之后
// xl:why 它仍然出现一次（`runtime/round755/r755a-02` 与 `runtime/round769/r769d-02`
// xl:why 量着，两条都过）——所以这不是「枚举那一趟整体没做」，缺的是
// xl:why **「自有存在就标记已访问」**那一步。
// xl:end

const show = (label: string, f: () => any): void => {
  try {
    console.log(label + " = " + JSON.stringify(f()));
  } catch (e) {
    console.log(label + " = throw:" + ((e as any) && (e as any).constructor ? (e as any).constructor.name : "?"));
  }
};
const keys = (o: any): string[] => { const out: string[] = []; for (const k in o) out.push(k); return out; };

// —— 该被挡住的三档（本仓多出 "a"） ——
show("01 own nonenum data shadows proto", () => {
  const p: any = { a: 1 };
  const o: any = Object.create(p);
  Object.defineProperty(o, "a", { value: 2, enumerable: false });
  return keys(o);
});
show("02 own nonenum accessor shadows proto", () => {
  const p: any = { a: 1 };
  const o: any = Object.create(p);
  Object.defineProperty(o, "a", { get() { return 2; }, enumerable: false });
  return keys(o);
});
show("03 shadow two levels up", () => {
  const g: any = { a: 1 };
  const p: any = Object.create(g);
  Object.defineProperty(p, "a", { value: 2, enumerable: false });
  const o: any = Object.create(p);
  return keys(o);
});
show("04 sibling enum key still listed", () => {
  const p: any = { a: 1 };
  const o: any = Object.create(p);
  Object.defineProperty(o, "a", { value: 2, enumerable: false });
  o.b = 3;
  return keys(o);
});

// —— **已经对的那一半**（对照组） ——
show("11 own enum shadows proto nonenum", () => {
  const p: any = {};
  Object.defineProperty(p, "a", { value: 1, enumerable: false });
  const o: any = Object.create(p);
  o.a = 2;
  return keys(o);
});
show("12 proto nonenum never listed", () => {
  const p: any = {};
  Object.defineProperty(p, "a", { value: 1, enumerable: false });
  p.b = 2;
  return keys(Object.create(p));
});
show("13 proto enum listed", () => {
  return keys(Object.create({ a: 1 }));
});
show("14 own enum plus proto enum", () => {
  const o: any = Object.create({ p: 1 });
  o.b = 2;
  return keys(o);
});
show("15 delete current key still visits once", () => {
  const o: any = { a: 1 };
  const out: string[] = [];
  for (const k in o) { out.push(k); delete o.a; }
  return out;
});

// —— `Object.keys` / `in` 两问不受这一条影响 ——
show("16 Object.keys unaffected", () => {
  const p: any = { a: 1 };
  const o: any = Object.create(p);
  Object.defineProperty(o, "a", { value: 2, enumerable: false });
  return Object.keys(o);
});
show("17 in unaffected", () => {
  const p: any = { a: 1 };
  const o: any = Object.create(p);
  Object.defineProperty(o, "a", { value: 2, enumerable: false });
  return ["a" in o, o.a];
});
show("18 getOwnPropertyNames sees it", () => {
  const p: any = { a: 1 };
  const o: any = Object.create(p);
  Object.defineProperty(o, "a", { value: 2, enumerable: false });
  return Object.getOwnPropertyNames(o);
});
