// xl:title 端到端：生成器搭的三段流水线
// xl:round 323
// xl:judge stdout
// xl:end

function* source(n: number) { for (let i = 1; i <= n; i++) yield i; }
function* doubled(xs: Iterable<number>) { for (const x of xs) yield x * 2; }
function* onlyEven(xs: Iterable<number>) { for (const x of xs) if (x % 4 === 0) yield x; }
const out = [...onlyEven(doubled(source(10)))];
console.log(out.join(","), out.length);
let first: number | undefined;
for (const v of onlyEven(doubled(source(5)))) { first = v; break; }
console.log(first);
