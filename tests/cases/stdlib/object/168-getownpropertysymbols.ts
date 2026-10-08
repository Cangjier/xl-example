// xl:title `getOwnPropertySymbols` 与 `propertyIsEnumerable`
// xl:round 691
// xl:judge stdout
// xl:end
const s1: any = Symbol("a");
const s2: any = Symbol("b");
const o: any = { x: 1 };
o[s1] = 2;
Object.defineProperty(o, s2, { value: 3, enumerable: false });
console.log(Object.getOwnPropertySymbols(o).length);
console.log(Object.getOwnPropertySymbols(o).map((s: any) => s === s1).join(","));
console.log(o.propertyIsEnumerable(s1), o.propertyIsEnumerable(s2), o.propertyIsEnumerable("x"));
console.log(Object.prototype.propertyIsEnumerable.call([1], "0"));
