// xl:title 区间与切片工具：range / chunk / window / zip
// xl:round 371
// xl:judge stdout
// xl:end
function range(start: number, end: number, step = 1): number[] {
  const out: number[] = [];
  if (step === 0) return out;
  if (step > 0) for (let i = start; i < end; i += step) out.push(i);
  else for (let i = start; i > end; i += step) out.push(i);
  return out;
}
function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}
function window<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i + size <= xs.length; i++) out.push(xs.slice(i, i + size));
  return out;
}
function zip<A, B>(a: A[], b: B[]): [A, B][] {
  const out: [A, B][] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) out.push([a[i], b[i]]);
  return out;
}
console.log(range(0, 5).join(","), range(5, 0, -2).join(","), range(0, 5, 2).join(","));
console.log(JSON.stringify(chunk([1, 2, 3, 4, 5], 2)));
console.log(JSON.stringify(window([1, 2, 3, 4], 3)));
console.log(zip(["a", "b", "c"], [1, 2]).map((p) => p[0] + p[1]).join(","));
console.log(JSON.stringify(chunk([], 2)), window([1], 2).length, range(0, 0).length);
