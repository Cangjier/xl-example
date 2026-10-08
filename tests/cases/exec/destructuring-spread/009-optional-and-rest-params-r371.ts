// xl:title 可选参数、默认参数、剩余参数的实参个数口径
// xl:round 371
// xl:judge stdout
// xl:end
function f(a: number, b?: string, c: number = 10, ...rest: boolean[]): string {
  return [a, b, c, rest.length].join(",");
}
console.log(f(1), f(1, "s"), f(1, "s", 2), f(1, undefined, 2, true, false));
console.log(f.length, ((...xs: number[]) => xs.length).length);
function withDefault(x: number = 1, y: number = x + 1): number { return x + y; }
console.log(withDefault(), withDefault(5), withDefault(undefined, 7));
