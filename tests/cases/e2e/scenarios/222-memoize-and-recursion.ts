// xl:title 记忆化 + 递归（斐波那契与阶乘的缓存命中）
// xl:round 8
// xl:judge stdout
// xl:end

function memo(fn) {
  const cache = new Map();
  return (...args) => {
    const key = args.join(",");
    if (cache.has(key)) return cache.get(key);
    const value = fn(...args);
    cache.set(key, value);
    return value;
  };
}
const fib = memo((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)));
console.log(fib(30), fib(10));
let calls = 0;
const slow = memo((n) => { calls++; return n * 2; });
console.log(slow(3), slow(3), calls);
