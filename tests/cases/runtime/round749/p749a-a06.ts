// xl:title `async` 生成器与 `for await`
// xl:round 749
// xl:judge stdout
// xl:end
async function* gen() { yield 1; yield 2; yield 3; }
async function main() {
  const out: number[] = [];
  for await (const v of gen()) out.push(v);
  console.log("forawait", out.join(","));
  const collected: number[] = [];
  for await (const v of [Promise.resolve(7), 8]) collected.push(v);
  console.log("mixed", collected.join(","));
}
main().then(() => console.log("done"));
console.log("sync");
