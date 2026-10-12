// xl:title async 里的 map + await 串行
// xl:round 304
// xl:judge stdout
// xl:end

async function double(n: number) { return n * 2; }
async function run() {
  const out: number[] = [];
  for (const n of [1, 2, 3]) out.push(await double(n));
  return out.join(",");
}
run().then((s) => console.log(s));
