// xl:title 递归 + 数组：fib(18) 与 map 链
// xl:round 681
// xl:judge stdout
// xl:end
function fib(n: number): number { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
try { console.log("fib", String(fib(18))); } catch (e) { console.log("fib", "ERR", String(e && e.name)); }
try { console.log("chain", String(Array.from({ length: 5 }, (v, i) => i).map((x) => x * 2).filter((x) => x % 4 === 0).join(','))); } catch (e) { console.log("chain", "ERR", String(e && e.name)); }
