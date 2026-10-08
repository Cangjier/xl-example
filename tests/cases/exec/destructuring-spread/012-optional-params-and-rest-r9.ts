// xl:title 形参：可选、默认、剩余、arguments 交互
// xl:round 9
// xl:judge stdout
// xl:end

function f(a: number, b = a * 2, ...rest: number[]) {
  return [a, b, rest.length, arguments.length].join(",");
}
console.log(f(1), f(1, 2), f(1, 2, 3, 4));
const sum = (...xs: number[]) => xs.reduce((p, c) => p + c, 0);
console.log(sum(), sum(1, 2, 3));
