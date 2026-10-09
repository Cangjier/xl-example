// xl:title 二分查找：while + 下标边界
// xl:round 682
// xl:judge stdout
// xl:end
function search(xs: number[], target: number): number { let lo = 0; let hi = xs.length - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (xs[mid] === target) return mid; if (xs[mid] < target) lo = mid + 1; else hi = mid - 1; } return -1; }
const xs = [1, 3, 5, 7, 9, 11];
console.log([search(xs, 1), search(xs, 11), search(xs, 6), search([], 1)].join(','));
