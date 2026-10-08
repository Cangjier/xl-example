// xl:title return / throw / yield 位置上的断言与泛型
// xl:round 371
// xl:judge stdout
// xl:end
function f(v: unknown): { n: number } { return { n: v as number }; }
function g(): void { throw new Error(String(1 as number)); }
function* gen(): Generator<number> { yield 1 as number; yield* [2, 3] as number[]; }
async function h(): Promise<string> { return "s" as string; }
console.log(f(1).n, [...gen()].join(","));
h().then((v) => console.log(v));
try { g(); } catch (e) { console.log((e as Error).message); }
