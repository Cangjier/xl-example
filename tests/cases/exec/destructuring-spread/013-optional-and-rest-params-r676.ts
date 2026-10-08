// xl:title 可选形参与剩余形参的实参个数
// xl:round 676
// xl:judge stdout
// xl:end

function f(a: number, b?: number, ...rest: number[]): string {
  return [a, b, rest.length].join("/");
}
console.log(f(1), f(1, 2), f(1, 2, 3, 4));
