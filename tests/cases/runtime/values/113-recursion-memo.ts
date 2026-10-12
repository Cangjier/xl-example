// xl:title 递归加记忆化：Map 当缓存
// xl:round 304
// xl:judge stdout
// xl:end

const cache = new Map<number, number>();
function fib(n: number): number {
  if (n < 2) return n;
  const hit = cache.get(n);
  if (hit !== undefined) return hit;
  const v = fib(n - 1) + fib(n - 2);
  cache.set(n, v);
  return v;
}
console.log(fib(30), cache.size);
