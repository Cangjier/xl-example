// xl:title `Object.defineProperty` 的访问器与描述符形状
// xl:round 736
// xl:judge stdout
// xl:end
const o: any = {};
let stored = 1;
Object.defineProperty(o, "a", { get() { return stored; }, set(v: any) { stored = v * 2; }, enumerable: true, configurable: true });
o.a = 5;
console.log(o.a, JSON.stringify(Object.getOwnPropertyDescriptor(o, "a"), ["get", "set", "enumerable", "configurable"] as any));
console.log(Object.keys(o).join(","), typeof Object.getOwnPropertyDescriptor(o, "a").get);
