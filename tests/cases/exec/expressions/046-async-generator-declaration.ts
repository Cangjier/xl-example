// xl:title `async function*` 声明 + `for await..of`
// xl:round 305
// xl:judge stdout
// xl:end

async function* range(n: number): AsyncGenerator<number> {
  for (let i = 0; i < n; i++) yield i;
}
async function main() {
  const out: number[] = [];
  for await (const v of range(3)) out.push(v);
  console.log(out.join(","));
}
main();
