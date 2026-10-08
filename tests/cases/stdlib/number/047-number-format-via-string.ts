// xl:title 不靠 Intl 的数字格式化：toFixed + 千分位
// xl:round 371
// xl:judge stdout
// xl:end
function group(n: number): string {
  const s = Math.abs(n).toFixed(2);
  const dot = s.indexOf(".");
  let int = s.slice(0, dot);
  const frac = s.slice(dot);
  let out = "";
  while (int.length > 3) {
    out = "," + int.slice(int.length - 3) + out;
    int = int.slice(0, int.length - 3);
  }
  return (n < 0 ? "-" : "") + int + out + frac;
}
console.log(group(1234567.891), group(-12.5), group(0), group(999.999));
