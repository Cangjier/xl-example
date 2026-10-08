// xl:title `Object.getOwnPropertyDescriptors` 一次拿全部描述符
// xl:round 305
// xl:judge stdout
// xl:end

const o = { a: 1 };
Object.defineProperty(o, "b", { value: 2, enumerable: false });
const ds = Object.getOwnPropertyDescriptors(o);
console.log(Object.keys(ds).join(","), ds.a.writable, ds.b.enumerable, Object.keys(o).join(","));
