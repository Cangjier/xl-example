// xl:title 类型标注在每一种位置上都被擦掉
// xl:round 371
// xl:judge stdout
// xl:end
const a: number = 1;
let b: string | null = "s";
var c: readonly number[] = [1];
function f(x: number, y?: string, ...rest: boolean[]): number { return x + (y ? y.length : 0) + rest.length; }
class K { field: number = 1; static s: string = "x"; m(v: Map<string, number[]>): void {} }
const g = (x: number): number => x;
const h: (n: number) => number = (n) => n;
for (const v of [1, 2] as number[]) { const z: number = v; }
try { throw new Error("e"); } catch (err: unknown) { }
console.log(a, b, c.length, f(1, "ab", true, false), new K().field, K.s, g(2), h(3));
