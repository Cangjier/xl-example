// xl:title `Object` 的取值族在原始值 / `null` / 类数组上
// xl:round 768
// xl:judge stdout
// xl:note 字符串那一档：`Object.keys("abc")` 给**下标**（`0,1,2`）、`Object.values` 给字符
// xl:note （`length` 不是自有可枚举属性，所以不进来）；`Object.entries` 给 `[下标, 字符]` 对。
// xl:note 数字那一档给**空数组**（装箱对象上没有可枚举自有属性）。
// xl:note `null` / `undefined` 那一档**抛 `TypeError`**（`ToObject` 的第一步）——三格一起钉。
// xl:note 类数组（`{0:'a',1:'b',length:2}`）给的是**自有键**（含 `length`），
// xl:note 那是与 `Array.from` 不同的口径（后者读 `length` 再按下标取）。
// xl:end
console.log("01", Object.keys("abc" as any).join(","), Object.values("abc" as any).join(","));
console.log("02", Object.entries("ab" as any).map((e) => e.join(":")).join("|"));
console.log("03", Object.keys(1 as any).length);
const guard = (f: () => any) => { try { return String(f()); } catch (e) { return "throw:" + (e as Error).constructor.name; } };
console.log("04", guard(() => Object.keys(null as any).length), guard(() => Object.entries(null as any).length));
console.log("05", guard(() => Object.values(undefined as any).length));
const arrayLike: any = { 0: "a", 1: "b", length: 2 };
console.log("06", Object.keys(arrayLike).join(","), Object.values(arrayLike).length);
console.log("07", Object.entries({ a: 1, b: 2 }).map((e) => e.join(":")).join(","));
