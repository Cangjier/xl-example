// xl:title 并发：`Promise.all` 与串行 `for await` 两种写法
// xl:round 331
// xl:judge stdout
// xl:end

async function fetchValue(id: number): Promise<number> {
  await null;
  return id * 2;
}
async function main(): Promise<void> {
  const ids = [1, 2, 3, 4];
  const concurrent = await Promise.all(ids.map((id) => fetchValue(id)));
  console.log("concurrent", concurrent.join(","));
  const serial: number[] = [];
  for (const id of ids) serial.push(await fetchValue(id));
  console.log("serial", serial.join(","));
  const settled = await Promise.allSettled(ids.map((id) => fetchValue(id)));
  console.log("settled", settled.length, settled[0].status);
}
main();
