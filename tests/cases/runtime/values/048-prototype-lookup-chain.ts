// xl:title 原型链查找：三级、遮蔽、缺失给 undefined
// xl:judge stdout
// xl:end

const base = { a: 1, b: 2 };
const mid = Object.create(base);
mid.b = 20;
const leaf = Object.create(mid);
leaf.c = 3;
console.log(leaf.a, leaf.b, leaf.c, leaf.nope);
console.log(Object.getPrototypeOf(leaf) === mid, Object.getPrototypeOf(base) === Object.prototype);
