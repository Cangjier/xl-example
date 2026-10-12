// xl:title 进制转换与十六进制转储
// xl:round 371
// xl:judge stdout
// xl:end
function toBase(n: number, base: number): string {
  const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
  if (n === 0) return "0";
  const sign = n < 0 ? "-" : "";
  let v = Math.abs(Math.trunc(n));
  let out = "";
  while (v > 0) { out = digits.charAt(v % base) + out; v = Math.floor(v / base); }
  return sign + out;
}
function fromBase(s: string, base: number): number {
  const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
  const sign = s.startsWith("-") ? -1 : 1;
  const body = sign === -1 ? s.slice(1) : s;
  let out = 0;
  for (const ch of body.toLowerCase()) {
    const d = digits.indexOf(ch);
    if (d < 0 || d >= base) throw new Error("bad digit: " + ch);
    out = out * base + d;
  }
  return out * sign;
}
for (const [n, b] of [[255, 16], [255, 2], [64, 8], [-100, 36], [0, 2]] as [number, number][]) {
  console.log(n, b, toBase(n, b), fromBase(toBase(n, b), b));
}
function hexdump(data: number[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < data.length; i += 8) {
    const slice = data.slice(i, i + 8);
    const hex = slice.map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const text = slice.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
    out.push(i.toString(16).padStart(4, "0") + "  " + hex.padEnd(23, " ") + "  " + text);
  }
  return out;
}
for (const line of hexdump([72, 101, 108, 108, 111, 0, 255, 65, 66])) console.log(line);
