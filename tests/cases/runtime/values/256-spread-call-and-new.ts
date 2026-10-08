// xl:title 展开实参 / new / 数组字面量 / 对象字面量
// xl:round 9
// xl:judge stdout
// xl:end

function f(a: number, b: number, c: number) { return a + b + c; }
console.log(f(...[1, 2, 3]));
console.log(f(1, ...[2, 3]));
class P {
  x: number;
  y: number;
  constructor(x: number, y: number) { this.x = x; this.y = y; }
}
const p = new P(...[4, 5]);
console.log(p.x, p.y, [..."abc"].join("|"));
const o = { a: 1, ...{ b: 2 }, c: 3 };
console.log(JSON.stringify(o));
