// xl:title 自定义数字格式化：千分位、百分比、字节单位
// xl:round 371
// xl:judge stdout
// xl:end
function group(n: number, sep = ","): string {
  const sign = n < 0 ? "-" : "";
  const parts = Math.abs(n).toFixed(0).split(".");
  let int = parts[0];
  let out = "";
  while (int.length > 3) { out = sep + int.slice(int.length - 3) + out; int = int.slice(0, int.length - 3); }
  return sign + int + out;
}
function percent(part: number, whole: number, digits = 1): string {
  if (whole === 0) return "n/a";
  return ((part / whole) * 100).toFixed(digits) + "%";
}
function bytes(n: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return (unit === 0 ? String(value) : value.toFixed(1)) + units[unit];
}
console.log(group(0), group(999), group(1000), group(1234567), group(-9876543));
console.log(percent(1, 3), percent(2, 3, 2), percent(0, 0), percent(5, 5));
for (const n of [0, 512, 1024, 1536, 1048576, 1073741824, 1099511627776]) console.log(n, bytes(n));
console.log([1, 22, 333].map((n) => n.toString().padStart(5, "0")).join(" "));
