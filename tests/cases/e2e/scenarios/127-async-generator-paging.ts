// xl:title 异步生成器分页拉取与聚合
// xl:round 371
// xl:judge stdout
// xl:end
type Page = { items: number[]; next: number | null };
const source: Record<number, Page> = {
  0: { items: [1, 2, 3], next: 1 },
  1: { items: [4, 5], next: 2 },
  2: { items: [6], next: null },
};
async function fetchPage(cursor: number): Promise<Page> {
  await Promise.resolve();
  const page = source[cursor];
  if (!page) throw new Error("bad cursor " + cursor);
  return page;
}
async function* allItems(): AsyncGenerator<number> {
  let cursor: number | null = 0;
  while (cursor !== null) {
    const page = await fetchPage(cursor);
    for (const item of page.items) yield item;
    cursor = page.next;
  }
}
async function main(): Promise<void> {
  const collected: number[] = [];
  for await (const item of allItems()) {
    collected.push(item);
    if (collected.length === 4) break;
  }
  console.log(collected.join(","));
  let total = 0;
  let count = 0;
  for await (const item of allItems()) { total += item; count += 1; }
  console.log(total, count, (total / count).toFixed(2));
  const it = allItems();
  console.log((await it.next()).value, (await it.next()).value);
}
main();
