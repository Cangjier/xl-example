// xl:title `in` / `hasOwn` / `getOwnPropertyNames` 在访问器与不可枚举上
// xl:round 750
// xl:judge stdout
// xl:end
const o: any = {};
Object.defineProperty(o, "h", { value: 1, enumerable: false });
Object.defineProperty(o, "g", { get() { return 2; }, enumerable: true });
console.log("h" in o, Object.hasOwn(o, "h"), Object.keys(o).join(","), Object.getOwnPropertyNames(o).join(","));
console.log(o.h, o.g, Object.getOwnPropertyDescriptor(o, "h")!.enumerable);
const arr: any = [1, 2];
console.log("length" in arr, Object.hasOwn(arr, "length"), Object.keys(arr).join(","), Object.getOwnPropertyNames(arr).join(","));
console.log(Object.hasOwn(arr, 0), Object.hasOwn(arr, "0"), "0" in arr);
