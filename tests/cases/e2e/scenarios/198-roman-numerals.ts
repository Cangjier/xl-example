// xl:title 端到端：罗马数字编解码（贪心表 + 往返 + 非法输入）
// xl:round 7
// xl:judge stdout
// xl:end

const table: Array<[number, string]> = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
function enc(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) throw new RangeError("out of range: " + n);
  let out = "";
  for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
  return out;
}
function dec(s: string): number {
  const vals: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = vals[s[i]];
    if (cur === undefined) throw new SyntaxError("bad char " + s[i]);
    const nxt = vals[s[i + 1]] ?? 0;
    total += cur < nxt ? -cur : cur;
  }
  return total;
}
console.log([1, 4, 9, 14, 40, 90, 400, 1994, 3999].map(enc).join(" "));
console.log(dec("MCMXCIV"), dec("MMXXIV"), [1, 44, 999, 2024].every((n) => dec(enc(n)) === n));
for (const bad of [0, 4000, 1.5]) { try { enc(bad); } catch (e) { console.log((e as Error).name + ":" + bad); } }
try { dec("MZ"); } catch (e) { console.log((e as Error).name); }
