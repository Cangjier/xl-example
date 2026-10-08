// xl:title 字符串实现的大整数加 / 乘 / 阶乘
// xl:round 371
// xl:judge stdout
// xl:end
function normalize(digits: number[]): number[] {
  let carry = 0;
  const out: number[] = [];
  for (const d of digits) {
    const v = d + carry;
    out.push(v % 10);
    carry = Math.floor(v / 10);
  }
  while (carry > 0) { out.push(carry % 10); carry = Math.floor(carry / 10); }
  while (out.length > 1 && out[out.length - 1] === 0) out.pop();
  return out;
}
function fromString(s: string): number[] {
  const out: number[] = [];
  for (let i = s.length - 1; i >= 0; i--) out.push(Number(s.charAt(i)));
  return normalize(out);
}
function toString(digits: number[]): string {
  return digits.slice().reverse().join("");
}
function add(a: number[], b: number[]): number[] {
  const out: number[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) out.push((a[i] ?? 0) + (b[i] ?? 0));
  return normalize(out);
}
function mul(a: number[], b: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length + b.length; i++) out.push(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  }
  return normalize(out);
}
console.log(toString(add(fromString("999999999999999999"), fromString("1"))));
console.log(toString(mul(fromString("123456789"), fromString("987654321"))));
let fact = fromString("1");
for (let i = 2; i <= 30; i++) fact = mul(fact, fromString(String(i)));
console.log(toString(fact), toString(fact).length);
console.log(toString(add(fromString("0"), fromString("0"))), toString(mul(fromString("0"), fromString("5"))));
