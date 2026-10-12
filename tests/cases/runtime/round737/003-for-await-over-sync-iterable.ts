// xl:title `for await` 一个**同步可迭代物**（值自动 `await`）
// xl:round 737
// xl:judge stdout
// xl:end
// 本文件是 `p737a-a13` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

async function main() {
  const out: string[] = [];
  for await (const v of [1, Promise.resolve(2), 3] as any) out.push(String(v));
  console.log(out.join(","));
  for await (const ch of "ab") out.push(ch);
  console.log(out.join(","));
}
main();
