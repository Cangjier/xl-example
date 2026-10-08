// xl:title 原始值接收者：`setPrototypeOf` / `defineProperty` 该抛的都抛
// xl:round 750
// xl:judge stdout
// xl:end
const show = (f: () => any) => { try { return "ok:" + String(f()); } catch (e) { return "throw:" + (e as Error).constructor.name; } };
console.log(show(() => Object.setPrototypeOf(1 as any, {} as any)));
console.log(show(() => Object.setPrototypeOf("s" as any, null as any)));
console.log(show(() => Object.defineProperty(1 as any, "x", { value: 1 })));
console.log(show(() => Object.defineProperty("s" as any, "x", { value: 1 })));
console.log(show(() => Object.defineProperty(null as any, "x", { value: 1 })));
console.log(show(() => Reflect.defineProperty(1 as any, "x", { value: 1 })));
