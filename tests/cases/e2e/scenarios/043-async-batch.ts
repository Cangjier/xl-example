// xl:title 异步分批处理：串行 + 结果汇总 + 错误兜底
// xl:round 330
// xl:judge stdout
// xl:end

async function fetchOne(id: number): Promise<string> {
  await null;
  if (id === 3) throw new Error("boom " + id);
  return "item-" + id;
}
async function run(): Promise<void> {
  const ok: string[] = [];
  const failed: string[] = [];
  for (const id of [1, 2, 3, 4]) {
    try {
      ok.push(await fetchOne(id));
    } catch (e) {
      failed.push((e as Error).message);
    }
  }
  console.log(ok.join("|"));
  console.log(failed.join("|"));
  const all = await Promise.all([fetchOne(1), fetchOne(2)]);
  console.log(all.length, all[1]);
}
run();
