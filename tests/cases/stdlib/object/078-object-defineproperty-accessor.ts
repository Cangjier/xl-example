// xl:title defineProperty：访问器、不可写、不可枚举、getOwnPropertyDescriptor
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = {};
let backing = 1;
Object.defineProperty(o, "v", { get() { return backing; }, set(x: number) { backing = x * 2; }, enumerable: false, configurable: true });
o.v = 5;
console.log(o.v, backing, Object.keys(o).length);
const d = Object.getOwnPropertyDescriptor(o, "v");
console.log(typeof d.get, typeof d.set, d.enumerable, d.configurable);
console.log(Object.getOwnPropertyDescriptor(o, "nope"));
