// xl:title 类型注解：变量 / 参数 / 返回值 / 类字段
// xl:judge stdout
// xl:end

let a: number = 1;
const b: string = "s";
const xs: number[] = [1, 2];
const tup: [number, string] = [1, "x"];
function f(n: number, s: string): string { return s + n; }
class C { n: number = 5; m(v: boolean): boolean { return v; } }
console.log(a, b, xs.length, tup[1], f(1, "n"), new C().n, new C().m(true));
