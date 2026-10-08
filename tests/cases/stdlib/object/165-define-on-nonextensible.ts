// xl:title `preventExtensions` 之后**新**属性抛、已有属性照改
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.preventExtensions(o);
o.a = 2;
console.log(o.a, Object.isExtensible(o));
try { Object.defineProperty(o, "b", { value: 3 }); console.log("new ok"); } catch (e: any) { console.log("new", e.constructor.name); }
