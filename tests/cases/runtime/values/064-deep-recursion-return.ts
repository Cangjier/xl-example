// xl:title 深递归：回程顺序与累加
// xl:judge stdout
// xl:end

function down(n: number, acc: string[]): string[] { if (n === 0) return acc; acc.push("in" + n); down(n - 1, acc); acc.push("out" + n); return acc; }
console.log(down(4, []).join(" "));
function fact(n: number): number { return n <= 1 ? 1 : n * fact(n - 1); }
console.log(fact(6), fact(10));
