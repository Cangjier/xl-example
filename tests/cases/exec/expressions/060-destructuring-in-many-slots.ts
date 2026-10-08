// xl:title 解构落在形参 / for..of 头 / catch / 赋值四种位置上
// xl:round 323
// xl:judge stdout
// xl:end

function f({ a, b = 2 }: { a: number; b?: number }) { return a + b; }
for (const [k, v] of [["x", 1] as [string, number]]) console.log(k, v);
try { throw { code: 7 }; } catch ({ code }) { console.log(code); }
let p = 0, q = 0;
[p, q] = [1, 2];
console.log(f({ a: 1 }), p, q);
