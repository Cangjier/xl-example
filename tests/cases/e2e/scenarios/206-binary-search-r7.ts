// xl:title 端到端：二分查找的四种形态（命中 / 插入位 / 重复元素边界 / 空数组）
// xl:round 7
// xl:judge stdout
// xl:end

function lowerBound(xs: number[], target: number): number {
  let lo = 0, hi = xs.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (xs[mid] < target) lo = mid + 1; else hi = mid; }
  return lo;
}
function upperBound(xs: number[], target: number): number {
  let lo = 0, hi = xs.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (xs[mid] <= target) lo = mid + 1; else hi = mid; }
  return lo;
}
const xs = [1, 3, 3, 3, 7, 9];
console.log(lowerBound(xs, 3), upperBound(xs, 3), xs.slice(lowerBound(xs, 3), upperBound(xs, 3)).length);
console.log(lowerBound(xs, 0), lowerBound(xs, 100), lowerBound([], 5));
console.log(xs.includes(7), xs[lowerBound(xs, 8) - 1]);
const words = ["apple", "banana", "cherry"];
console.log(lowerBound(words.map((w) => w.length), 6), words[lowerBound(words.map((w) => w.length), 6)]);
