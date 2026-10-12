// xl:title `toJSON` 与循环引用该抛
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { toJSON() { return { k: 1 }; } };
console.log(JSON.stringify(o));
const c: any = {};
c.self = c;
try { JSON.stringify(c); } catch (e: any) { console.log("cyclic", e.constructor.name); }
