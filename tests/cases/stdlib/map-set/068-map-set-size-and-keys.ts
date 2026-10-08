// xl:title Map / Set 的 size 是访问器、Object.keys 看不到条目
// xl:round 371
// xl:judge stdout
// xl:end
const m = new Map([["a", 1]]);
const s = new Set([1]);
console.log(m.size, s.size, Object.keys(m as any).length, Object.keys(s as any).length);
const d = Object.getOwnPropertyDescriptor(Map.prototype, "size");
console.log(typeof d!.get, d!.set === undefined, d!.enumerable);
console.log(JSON.stringify(m), JSON.stringify(s));
