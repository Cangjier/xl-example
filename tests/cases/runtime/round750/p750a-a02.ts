// xl:title 原始值接收者：`Object.keys` / `hasOwn` / `freeze` 三格
// xl:round 750
// xl:judge stdout
// xl:end
const show = (f: () => any) => { try { return "ok:" + JSON.stringify(f()); } catch (e) { return "throw:" + (e as Error).constructor.name; } };
console.log(show(() => Object.keys(1 as any)), show(() => Object.keys("ab" as any)));
console.log(show(() => Object.getOwnPropertyNames(1 as any)), show(() => Object.getOwnPropertyNames("ab" as any)));
console.log(show(() => Object.hasOwn(1 as any, "x")), show(() => Object.hasOwn("ab" as any, 0)), show(() => Object.hasOwn("ab" as any, "length")));
console.log(show(() => Object.freeze(1 as any)), show(() => Object.isFrozen(1 as any)), show(() => Object.isSealed("s" as any)));
console.log(show(() => Object.getPrototypeOf(1 as any) === Number.prototype));
console.log(show(() => Object.preventExtensions(1 as any)));
