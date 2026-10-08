// xl:title getOwnPropertyDescriptor 读访问器那一格
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = { _v: 1 };
Object.defineProperty(o, "v", { get() { return this._v; }, set(n: number) { this._v = n; }, enumerable: true });
const d = Object.getOwnPropertyDescriptor(o, "v");
console.log(typeof d?.get, typeof d?.set, d?.enumerable, d?.configurable);
o.v = 5;
console.log(o.v);
