// xl:title getOwnPropertyDescriptor 的五个标志位
// xl:round 678
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
Object.defineProperty(o, "b", { value: 2, enumerable: false, writable: false, configurable: false });
const da: any = Object.getOwnPropertyDescriptor(o, "a");
const db: any = Object.getOwnPropertyDescriptor(o, "b");
console.log(da.value, da.writable, da.enumerable, da.configurable);
console.log(db.value, db.writable, db.enumerable, db.configurable);
console.log(Object.getOwnPropertyDescriptor(o, "zz") === undefined);
