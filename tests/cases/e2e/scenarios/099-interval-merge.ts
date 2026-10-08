// xl:title 区间合并、求交与覆盖长度
// xl:round 371
// xl:judge stdout
// xl:end
type Interval = [number, number];
function merge(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [sorted[0].slice() as Interval];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else out.push(cur.slice() as Interval);
  }
  return out;
}
function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a) for (const y of b) {
    const lo = Math.max(x[0], y[0]);
    const hi = Math.min(x[1], y[1]);
    if (lo <= hi) out.push([lo, hi]);
  }
  return merge(out);
}
function covered(intervals: Interval[]): number {
  return merge(intervals).reduce((acc, [lo, hi]) => acc + (hi - lo), 0);
}
const xs: Interval[] = [[1, 3], [2, 6], [8, 10], [15, 18], [9, 12]];
console.log(JSON.stringify(merge(xs)));
console.log(JSON.stringify(intersect([[1, 5], [8, 12]], [[3, 9]])));
console.log(covered(xs), covered([]), covered([[0, 1]]));
const empty = merge([]);
console.log(empty.length, intersect([[1, 2]], [[3, 4]]).length);
