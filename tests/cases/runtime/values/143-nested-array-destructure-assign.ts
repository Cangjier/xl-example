// xl:title 嵌套解构赋值（左边是成员位）
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = {};
const src = { a: 1, b: { c: 2 } };
({ a: o.x, b: { c: o.y } } = src);
console.log(o.x, o.y);
