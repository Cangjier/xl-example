// xl:title 展开实参、展开数组元素与展开对象属性
// xl:round 676
// xl:judge stdout
// xl:end

function sum(...ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}
const xs = [1, 2];
console.log(sum(...xs, 3), sum(...[4, 5]));
console.log([0, ...xs, 3].join(","));
const o = { a: 1 };
console.log(JSON.stringify({ ...o, b: 2 }));
