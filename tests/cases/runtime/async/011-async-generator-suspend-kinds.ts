// xl:title 异步生成器：`await` 摘的挂起与 `yield` 摘的挂起不是一回事
// xl:round 319
// xl:judge stdout
// xl:end

async function* g(): AsyncGenerator<number> { yield 1; yield await Promise.resolve(2); yield 3; }
async function main(): Promise<void> {
  const it: any = g();
  console.log("next1", JSON.stringify(await it.next()));
  console.log("next2", JSON.stringify(await it.next()));
  console.log("next3", JSON.stringify(await it.next()));
  console.log("done", JSON.stringify(await it.next()));
  const plain = (async function* (): AsyncGenerator<number> { yield 7; })();
  console.log("plain", JSON.stringify(await plain.next()));
}
main();
