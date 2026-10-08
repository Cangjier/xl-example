// xl:title 带类型标注的箭头立即调用与嵌套的立即调用
// xl:round 371
// xl:judge stdout
// xl:end
console.log(((a: number, b: number): number => a + b)(1, 2));
console.log(((x: string): string => ((): string => x + "!" )())("a"));
console.log((<T,>(v: T): T => v)(5));
const obj = { m: (n: number): number => n * 2 };
console.log(obj.m(3), ((f: (n: number) => number) => f(4))((n) => n + 1));
