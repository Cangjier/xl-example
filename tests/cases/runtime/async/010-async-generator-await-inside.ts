// xl:title 异步生成器体里 `await` 之后的 `yield`
// xl:round 305
// xl:judge stdout
// xl:end

async function* g() {
  for (const n of [1, 2]) {
    const v = await Promise.resolve(n * 10);
    yield v;
  }
}
async function main() {
  const out: number[] = [];
  for await (const v of g()) out.push(v);
  console.log(out.join(","));
}
main();
