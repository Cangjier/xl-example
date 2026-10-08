// xl:title 时间序列分桶与环比
// xl:round 371
// xl:judge stdout
// xl:end
type Event = { at: number; value: number };
const events: Event[] = [
  { at: Date.UTC(2024, 0, 1, 0, 5), value: 1 },
  { at: Date.UTC(2024, 0, 1, 0, 45), value: 2 },
  { at: Date.UTC(2024, 0, 1, 1, 10), value: 3 },
  { at: Date.UTC(2024, 0, 1, 2, 59), value: 4 },
];
const HOUR = 3600000;
function bucket(events: Event[], sizeMs: number): Map<number, number> {
  const out = new Map<number, number>();
  for (const e of events) {
    const key = Math.floor(e.at / sizeMs) * sizeMs;
    out.set(key, (out.get(key) ?? 0) + e.value);
  }
  return out;
}
const hourly = bucket(events, HOUR);
for (const [key, total] of hourly) {
  console.log(new Date(key).toISOString().slice(11, 16), total);
}
const keys = [...hourly.keys()].sort((a, b) => a - b);
const deltas: string[] = [];
for (let i = 1; i < keys.length; i++) {
  const prev = hourly.get(keys[i - 1]) as number;
  const cur = hourly.get(keys[i]) as number;
  deltas.push(((cur - prev) / prev * 100).toFixed(1) + "%");
}
console.log(deltas.join(","));
console.log(hourly.size, bucket(events, HOUR * 2).size, bucket([], HOUR).size);
