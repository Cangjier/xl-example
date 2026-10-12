// xl:title 端到端：泛型 memoize + 递归 DP
// xl:round 323
// xl:judge stdout
// xl:end

function memo<A extends string | number, R>(f: (k: A) => R): (k: A) => R {
  const cache = new Map<A, R>();
  return (k: A) => {
    if (!cache.has(k)) cache.set(k, f(k));
    return cache.get(k)!;
  };
}
let calls = 0;
const fib = memo((n: number): number => { calls += 1; return n < 2 ? n : fib(n - 1) + fib(n - 2); });
console.log(fib(20), calls);
const key = memo((s: string) => s.toUpperCase() + "!");
console.log(key("a"), key("a"), key("b"));
