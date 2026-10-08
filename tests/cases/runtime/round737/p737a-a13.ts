// xl:title `for await` 一个**同步可迭代物**（值自动 `await`）
// xl:round 737
// xl:judge stdout
// xl:end
async function main() {
  const out: string[] = [];
  for await (const v of [1, Promise.resolve(2), 3] as any) out.push(String(v));
  console.log(out.join(","));
  for await (const ch of "ab") out.push(ch);
  console.log(out.join(","));
}
main();
