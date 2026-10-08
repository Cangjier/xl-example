// xl:title 流式处理：分批读取、窗口聚合、背压
// xl:round 371
// xl:judge stdout
// xl:end
function* chunks<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}
type Row = { ts: number; value: number };
const rows: Row[] = [];
for (let i = 0; i < 20; i++) rows.push({ ts: i, value: i % 5 });
function aggregate(batch: Row[], size: number): string[] {
  const out: string[] = [];
  for (const group of chunks(batch, size)) {
    const sum = group.reduce((a, b) => a + b.value, 0);
    out.push(group[0].ts + "-" + group[group.length - 1].ts + ":" + sum);
  }
  return out;
}
let batches = 0;
let total = 0;
for (const batch of chunks(rows, 6)) {
  batches += 1;
  total += batch.length;
  console.log(batches, batch.length, aggregate(batch, 2).join(" "));
}
console.log(batches, total, rows.length);
const empty: string[] = [];
for (const batch of chunks(empty, 3)) console.log("never");
console.log([...chunks([1, 2, 3], 10)].length, [...chunks([1], 1)].length);
