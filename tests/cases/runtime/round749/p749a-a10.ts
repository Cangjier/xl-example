// xl:title 描述符：`defineProperty` 的三档与 `getOwnPropertyDescriptor`
// xl:round 749
// xl:judge stdout
// xl:end
const o: any = {};
Object.defineProperty(o, "hidden", { value: 1, enumerable: false });
Object.defineProperty(o, "ro", { value: 2, writable: false, enumerable: true, configurable: false });
o.ro = 99;
o.hidden = 99;
console.log(o.hidden, o.ro, Object.keys(o).join(","));
const d = Object.getOwnPropertyDescriptor(o, "ro") as any;
console.log(d.value, d.writable, d.enumerable, d.configurable);
try { Object.defineProperty(o, "ro", { value: 3 }); } catch (e) { console.log("redefine", (e as Error).constructor.name); }
const acc: any = {};
Object.defineProperty(acc, "p", { get() { return "G"; }, set(v: any) { console.log("set", v); }, enumerable: true });
console.log(acc.p, Object.keys(acc).join(","));
acc.p = 5;
