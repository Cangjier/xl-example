// xl:title 不可配置的格子上那一整族改写该抛 `TypeError`
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = {};
Object.defineProperty(o, "a", { value: 1, configurable: false });
const t = (f: any, tag: string) => { try { f(); console.log(tag, "ok"); } catch (e: any) { console.log(tag, e.constructor.name); } };
t(() => Object.defineProperty(o, "a", { value: 2 }), "value");
t(() => Object.defineProperty(o, "a", { value: 1 }), "same");
t(() => Object.defineProperty(o, "a", { enumerable: true }), "enum");
t(() => Object.defineProperty(o, "a", { configurable: true }), "conf");
t(() => Object.defineProperty(o, "a", { writable: true }), "write");
t(() => Object.defineProperty(o, "a", { get() { return 9; } }), "toaccessor");
console.log(o.a, Object.keys(o).length);
