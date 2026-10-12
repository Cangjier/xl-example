// xl:title 异步任务池：并发上限、错误隔离、结果汇总
// xl:round 371
// xl:judge stdout
// xl:end
async function pool<T, R>(items: T[], limit: number, work: (item: T, index: number) => Promise<R>): Promise<{ ok: R[]; failed: { item: T; error: string }[] }> {
  const ok: R[] = [];
  const failed: { item: T; error: string }[] = [];
  let next = 0;
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    workers.push((async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        try { ok.push(await work(items[index], index)); }
        catch (e) { failed.push({ item: items[index], error: (e as Error).message }); }
      }
    })());
  }
  await Promise.all(workers);
  return { ok, failed };
}
async function main(): Promise<void> {
  let active = 0;
  let peak = 0;
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  const r = await pool(items, 3, async (n) => {
    active += 1;
    peak = Math.max(peak, active);
    await Promise.resolve();
    active -= 1;
    if (n % 3 === 0) throw new Error("bad " + n);
    return n * 10;
  });
  console.log(r.ok.sort((a, b) => a - b).join(","));
  console.log(r.failed.map((f) => f.item + ":" + f.error).join("|"));
  console.log("peak", peak <= 3, r.ok.length + r.failed.length);
}
main();
