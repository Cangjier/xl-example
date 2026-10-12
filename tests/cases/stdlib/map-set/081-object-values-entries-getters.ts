// xl:title Object.values / entries 走 [[Get]]：访问器要真读一次、不可枚举的不读、键序不变
// xl:round 655
// xl:judge stdout
// xl:end

const o: any = {};
let reads = 0;
Object.defineProperty(o, "g", { get() { reads++; return 7; }, enumerable: true });
Object.defineProperty(o, "h", { get() { return "x"; }, enumerable: true });
o.a = 1;
console.log(JSON.stringify(Object.values(o)));
console.log(JSON.stringify(Object.entries(o)));
console.log(reads);
console.log(JSON.stringify(Object.values({ 3: "three", "a-b": 1, 1: "one" })));
const arr: any = [10, 20];
Object.defineProperty(arr, "k", { get() { return 30; }, enumerable: true });
console.log(JSON.stringify(Object.values(arr)), JSON.stringify(Object.entries(arr)));
console.log(JSON.stringify(Object.values("ab")));
console.log(Object.values([1, 2]).length, Object.entries({}).length);
let order: string[] = [];
const p: any = {};
Object.defineProperty(p, "b", { get() { order.push("b"); return 2; }, enumerable: true });
Object.defineProperty(p, "a", { get() { order.push("a"); return 1; }, enumerable: true });
Object.defineProperty(p, "z", { get() { order.push("z"); return 9; }, enumerable: false });
console.log(JSON.stringify(Object.values(p)), order.join(","));
console.log(JSON.stringify(Object.entries(p)));
