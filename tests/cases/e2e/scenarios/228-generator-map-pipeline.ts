// xl:title 完整程序：生成器 + Map + 模板串的流水线
// xl:round 676
// xl:judge stdout
// xl:end

function* range(n: number) {
  for (let i = 0; i < n; i += 1) yield i;
}
const seen = new Map<string, number>();
for (const n of range(5)) {
  if (n % 2 === 0) seen.set(`k${n}`, n * n);
}
const parts: string[] = [];
for (const [k, v] of seen) parts.push(`${k}=${v}`);
console.log(parts.join(" "), seen.size);
