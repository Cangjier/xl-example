// xl:title `for await..of` 一个 `Map` 的 entries，并解构
// xl:round 305
// xl:judge stdout
// xl:end

async function main() {
  const m = new Map<string, number>([["a", 1], ["b", 2]]);
  const out: string[] = [];
  for await (const [k, v] of m) out.push(k + "=" + v);
  console.log(out.join(","));
}
main();
