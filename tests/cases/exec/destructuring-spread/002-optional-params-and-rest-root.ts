// xl:title 可选形参 + 剩余形参 + 实参少于形参
// xl:judge stdout
// xl:end

function f(a: number, b?: number, ...rest: number[]): string {
  return [a, b, rest.length, rest.join("")].join("/");
}
console.log(f(1), f(1, 2), f(1, 2, 3, 4), f(1, undefined, 5));
const g = (x: number, y = 10) => x + y;
console.log(g(1), g(1, 2), g(1, undefined));
