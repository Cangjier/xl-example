// xl:title 罗马数字互转与全表校验
// xl:round 371
// xl:judge stdout
// xl:end
const TABLE: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
function toRoman(n: number): string {
  if (n <= 0 || n >= 4000) throw new RangeError("out of range: " + n);
  let out = "";
  let rest = n;
  for (const [value, symbol] of TABLE) {
    while (rest >= value) { out += symbol; rest -= value; }
  }
  return out;
}
function fromRoman(s: string): number {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = values[s.charAt(i)];
    const next = values[s.charAt(i + 1)] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}
for (const n of [1, 4, 9, 14, 40, 90, 400, 1987, 3999]) console.log(n, toRoman(n), fromRoman(toRoman(n)));
console.log(fromRoman("MCMXCIV"), toRoman(2024));
try { toRoman(0); } catch (e) { console.log((e as Error).name); }
let allRoundTrip = true;
for (let n = 1; n <= 3999; n++) if (fromRoman(toRoman(n)) !== n) allRoundTrip = false;
console.log("roundtrip", allRoundTrip);
