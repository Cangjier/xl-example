// xl:title **可写**的格子上 `writable: true -> false` 是允许的，翻回来不是
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.defineProperty(o, "a", { writable: false });
console.log(Object.getOwnPropertyDescriptor(o, "a")!.writable, o.a);
try { Object.defineProperty(o, "a", { writable: true }); console.log("back ok"); } catch (e: any) { console.log("back", e.constructor.name); }
