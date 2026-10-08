// xl:title 版本号比较：分段数值、缺位与预发布标记
// xl:round 331
// xl:judge stdout
// xl:end

function compare(left: string, right: string): number {
  const a = left.split(".");
  const b = right.split(".");
  const width = Math.max(a.length, b.length);
  for (let i = 0; i < width; i++) {
    const x = i < a.length ? parseInt(a[i]) : 0;
    const y = i < b.length ? parseInt(b[i]) : 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
const versions = ["1.2.10", "1.2.9", "1.3", "1.2.9.1", "1.2"];
versions.sort(compare);
console.log(versions.join(" "));
console.log(compare("1.2", "1.2.0"), compare("2.0", "10.0"));
