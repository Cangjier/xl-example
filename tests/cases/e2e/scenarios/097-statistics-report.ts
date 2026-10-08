// xl:title 统计报告：均值 / 中位数 / 标准差 / 分位数
// xl:round 371
// xl:judge stdout
// xl:end
function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function stdev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length);
}
function percentile(xs: number[], p: number): number {
  const s = xs.slice().sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
}
function histogram(xs: number[], bins: number): number[] {
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const width = (hi - lo) / bins || 1;
  const out: number[] = [];
  for (let i = 0; i < bins; i++) out.push(0);
  for (const v of xs) {
    const idx = Math.min(bins - 1, Math.floor((v - lo) / width));
    out[idx] += 1;
  }
  return out;
}
const data = [12, 7, 3, 19, 25, 7, 14, 14, 2, 30, 11];
console.log("mean", mean(data).toFixed(3), "median", median(data), "stdev", stdev(data).toFixed(3));
console.log("min", Math.min(...data), "max", Math.max(...data), "range", Math.max(...data) - Math.min(...data));
console.log("p25", percentile(data, 25), "p50", percentile(data, 50), "p90", percentile(data, 90));
console.log("hist", histogram(data, 5).join(","));
console.log("sorted", data.slice().sort((a, b) => a - b).join(","));
