// xl:title `Object.create` 第二参数与 `null` 原型
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = Object.create(null, { a: { value: 1, enumerable: true } });
console.log(o.a, Object.getPrototypeOf(o) === null);
console.log(JSON.stringify(Object.keys(o)));
console.log(typeof o.toString);
