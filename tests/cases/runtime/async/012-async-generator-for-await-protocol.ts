// xl:title 异步生成器与 `for await` 的完整回合（含手动 `next()` 的三档）
// xl:round 371
// xl:judge stdout
// xl:end

async function* pages(): AsyncGenerator<number[]> {
  yield [1, 2];
  await Promise.resolve();
  yield [3];
}
async function main(): Promise<void> {
  const all: number[] = [];
  for await (const page of pages()) {
    for (const v of page) all.push(v);
  }
  console.log(all.join(","));
  const it = pages();
  const first = await it.next();
  console.log(first.done, JSON.stringify(first.value));
  const second = await it.next();
  console.log(second.done, JSON.stringify(second.value));
  const third = await it.next();
  console.log(third.done, third.value);
}
main();
