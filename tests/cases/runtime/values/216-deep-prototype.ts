// xl:title 原型链的深度查找与遮蔽
// xl:round 623
// xl:judge stdout
// xl:end

const a = { v: 1, only: "a" };
const b = Object.create(a);
const c = Object.create(b);
c.v = 3;
console.log(c.v, c.only, b.v);
console.log(Object.getPrototypeOf(Object.getPrototypeOf(c)) === a);
