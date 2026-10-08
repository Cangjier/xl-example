// xl:title `defineProperties` 一次定义多个，且默认不可枚举
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = {};
Object.defineProperties(o, { a: { value: 1 }, b: { value: 2, enumerable: true } });
console.log(Object.keys(o).join(","), o.a, o.b);
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(o, "a")));
