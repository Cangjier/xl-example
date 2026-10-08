// xl:title 描述符对象的形状：数据四格、访问器两格，且都带 `enumerable`
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.defineProperty(o, "g", { get() { return 1; }, enumerable: true });
console.log(Object.keys(Object.getOwnPropertyDescriptor(o, "a")!).join(","));
console.log(Object.keys(Object.getOwnPropertyDescriptor(o, "g")!).join(","));
console.log(JSON.stringify(Object.getOwnPropertyDescriptor({}, "nope")));
