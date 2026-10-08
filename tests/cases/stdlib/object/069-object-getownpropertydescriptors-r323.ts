// xl:title Object.getOwnPropertyDescriptors：一次拿全表的描述符
// xl:round 323
// xl:judge stdout
// xl:end

const o = { a: 1, get b() { return 2; } };
Object.defineProperty(o, "c", { value: 3, enumerable: false, writable: false });
const d = Object.getOwnPropertyDescriptors(o);
console.log(Object.keys(d).join(","), d.a.value, d.a.enumerable, d.b.get !== undefined, d.c.writable);
