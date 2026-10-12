// xl:title arguments：类数组、与形参的联动、箭头里没有
// xl:round 371
// xl:judge stdout
// xl:end
function f(a: number, b: number): string {
  console.log(arguments.length, arguments[0], arguments[2]);
  const out: number[] = [];
  for (let i = 0; i < arguments.length; i++) out.push(arguments[i]);
  a = 99;
  return out.join(",") + "/" + a + "/" + b;
}
console.log(f(1, 2, 3));
function g(...rest: number[]): string { return rest.join("-") + "/" + Array.isArray(rest); }
console.log(g(1, 2));
const arrow = (...xs: number[]) => xs.length;
console.log(arrow(1, 2, 3));
