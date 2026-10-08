// xl:title 点名：getOwnPropertyDescriptor 的形状与 getOwnPropertyDescriptors 的成批形态
// xl:judge stdout
// xl:end

const o = { a: 1 };
const d = Object.getOwnPropertyDescriptor(o, "a");
console.log(Object.keys(d).sort().join(","), d.value, d.writable, d.enumerable, d.configurable, "get" in d, "set" in d);
const all = Object.getOwnPropertyDescriptors(o);
console.log(Object.keys(all).join(","), all.a.value);
const withAccessor = { get g() { return 7; } };
const dg = Object.getOwnPropertyDescriptor(withAccessor, "g");
console.log(typeof dg.get, typeof dg.set, "value" in dg, dg.get());
