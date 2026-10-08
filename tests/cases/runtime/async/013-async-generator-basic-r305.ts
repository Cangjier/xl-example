// xl:title `async function*` 与 `for await..of`
// xl:round 305
// xl:judge stdout
// xl:end

async function* g(): AsyncGenerator<number> { yield 1; yield 2; }
async function main() {
  const out: number[] = [];
  for await (const v of g()) out.push(v);
  console.log("agen", out.join(","));
}
main();
