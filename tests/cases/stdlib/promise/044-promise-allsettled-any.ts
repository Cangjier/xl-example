// xl:title Promise：allSettled / any / race / all 的结果形状
// xl:round 9
// xl:judge stdout
// xl:end

async function main() {
  const settled = await Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("x"))]);
  console.log(settled.map((r) => r.status).join(","));
  console.log(await Promise.any([Promise.reject(new Error("a")), Promise.resolve("ok")]));
  console.log(await Promise.race([Promise.resolve("first"), Promise.resolve("second")]));
  try { await Promise.all([Promise.resolve(1), Promise.reject(new Error("boom"))]); }
  catch (e) { console.log("all-rejected", (e as Error).message); }
}
main();
