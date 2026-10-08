// xl:title `for...in` 与 `for...of` 的 `continue` / `break`
// xl:round 742
// xl:judge stdout
// xl:end
const o: any = { a: 1, b: 2, c: 3 };
const ks: string[] = [];
for (const k in o) { if (k === "b") continue; ks.push(k); }
const vs: number[] = [];
for (const v of [10, 20, 30]) { if (v === 20) break; vs.push(v); }
console.log(ks.join(","), vs.join(","));
