// xl:title 解构赋值写进成员位（`({ a: o.x } = src)`）
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = {};
const src = { a: 1, b: 2 };
({ a: o.x, b: o.y } = src);
console.log(o.x, o.y);
