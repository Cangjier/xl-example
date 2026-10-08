// xl:title `async` 生成器与 `for await`
// xl:round 737
// xl:judge stdout
// xl:end
async function* g() { yield 1; yield await 2; return 3; }
async function main() {
  const out: number[] = [];
  for await (const v of g()) out.push(v);
  console.log(out.join(","));
  const it = g();
  console.log(JSON.stringify(await it.next()), JSON.stringify(await it.next()), JSON.stringify(await it.next()));
}
main();
console.log("sync");
