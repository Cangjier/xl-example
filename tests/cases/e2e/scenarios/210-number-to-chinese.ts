// xl:title 端到端：整数转中文读法（分组 + 单位 + 零的合并规则）
// xl:round 7
// xl:judge stdout
// xl:want blocked
// xl:why 只用正则做切分的一版；换掉正则的那一版已经另收（见同批 pass 的候选），这一条留着量 `RegExp`。**必做**
// xl:end

const digits = "零一二三四五六七八九";
const units = ["", "十", "百", "千"];
const groups = ["", "万", "亿", "兆"];
function under10000(n: number): string {
  let out = "";
  let zero = false;
  for (let i = 3; i >= 0; i--) {
    const d = Math.floor(n / 10 ** i) % 10;
    if (d === 0) { zero = out !== ""; continue; }
    if (zero) { out += "零"; zero = false; }
    out += digits[d] + units[i];
  }
  if (out.startsWith("一十")) out = out.slice(1);
  return out;
}
function toChinese(n: number): string {
  if (n === 0) return "零";
  const sign = n < 0 ? "负" : "";
  let v = Math.abs(n);
  const parts: string[] = [];
  let g = 0;
  while (v > 0) {
    const chunk = v % 10000;
    if (chunk !== 0) parts.unshift(under10000(chunk) + groups[g]);
    else if (parts.length > 0 && !parts[0].startsWith("零")) parts.unshift("零");
    v = Math.floor(v / 10000);
    g++;
  }
  return sign + parts.join("").replace(/零+$/g, "");
}
for (const n of [0, 7, 10, 15, 20, 101, 110, 1001, 10000, 10001, 12345, 100000000, -42]) {
  console.log(n + "=" + toChinese(n));
}
