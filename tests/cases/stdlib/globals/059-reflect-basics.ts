// xl:title `Reflect` 的取/设/删/有无
// xl:round 691
// xl:judge stdout
// xl:want blocked
// xl:why `Reflect` 还没装（`name is not a local or a capture: Reflect`）。要做
//       （用户口径：`Reflect` 与 `RegExp` / `BigInt` 一样都在口径内，只是还没做）。
// xl:end
const o: any = { a: 1 };
console.log(Reflect.get(o, "a"), Reflect.has(o, "a"), Reflect.ownKeys(o).join(","));
console.log(Reflect.set(o, "b", 2), o.b, Reflect.deleteProperty(o, "b"), o.b);
console.log(Reflect.getPrototypeOf(o) === Object.prototype);
