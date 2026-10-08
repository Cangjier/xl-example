// xl:title 异步管道：`async function*` 逐个取数、`for await` 汇总
// xl:round 305
// xl:judge stdout
// xl:end

interface Row { id: number; ok: boolean }
async function fetchRow(id: number): Promise<Row> {
  await null;
  return { id, ok: id % 3 !== 0 };
}
async function* rows(n: number): AsyncGenerator<Row> {
  for (let i = 1; i <= n; i++) yield await fetchRow(i);
}
async function main(): Promise<void> {
  const good: number[] = [];
  const bad: number[] = [];
  for await (const r of rows(7)) {
    if (r.ok) good.push(r.id);
    else bad.push(r.id);
  }
  console.log("good", good.join(","));
  console.log("bad", bad.join(","));
  const counts = await Promise.all(good.map(async (id) => (await fetchRow(id)).id * 10));
  console.log("counts", counts.join(","));
}
main();
