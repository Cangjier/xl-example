// xl:title 默认参数与实参个数：undefined 触发、null 不触发
// xl:round 371
// xl:judge stdout
// xl:end
function f(a: number = 1, b: string = "b", c?: number): string { return [a, b, c].join(","); }
console.log(f(), f(2), f(2, "x"), f(undefined, "y"), f(null as any, "z"), f(1, undefined, 3));
function g(a: number, b: number = a * 2, c: number = b + a): number { return a + b + c; }
console.log(g(1), g(1, 2), g(1, 2, 3));
function h(...rest: number[]): number { return rest.length; }
console.log(h(), h(1), h(1, 2, 3), h.length);
