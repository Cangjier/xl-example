// xl:title `Array.from` 的类数组与 `mapFn`：三种来路与那一条 `TypeError`
// xl:round 768
// xl:judge stdout
// xl:note 三条来路一起钉：**类数组**（读 `length` 再按下标取，缺的下标给 `undefined`）、
// xl:note **只有 `length`** 那一档（`mapFn` 的第二个实参是下标）、**可迭代物**（`Set` / `Map`）。
// xl:note `Array.from(null)` 抛 `TypeError`（`ToObject` 的第一步没得绕）。
// xl:note `Array.from(new Map([[1,2]]))` 收的是 `[键, 值]` **对**（与 `Object.entries` 不同源）。
// xl:end
const arrayLike: any = { 0: "a", 1: "b", length: 2 };
console.log("01", JSON.stringify(Array.from(arrayLike)));
console.log("02", JSON.stringify(Array.from(arrayLike, (v: string) => v.toUpperCase())));
console.log("03", JSON.stringify(Array.from({ length: 3 }, (_v: any, i: number) => i)));
console.log("04", JSON.stringify(Array.from(new Set([1, 1, 2]))));
console.log("05", Array.from("ab").length, Array.from(new Map([[1, 2]])).length);
try { Array.from(null as any); } catch (e) { console.log("06", (e as Error).constructor.name); }
console.log("07", JSON.stringify(Array.from({ length: 2 })), JSON.stringify(Array.from(new Map([[1, 2]]))));
