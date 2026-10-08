// xl:title Promise.any 全拒时的 AggregateError 与 allSettled 的两种状态
// xl:judge stdout
// xl:end

const run = async () => {
  const r = await Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("x"))]);
  console.log(r.map((x) => (x.status === "fulfilled" ? "f" + x.value : "r" + (x.reason as Error).message)).join(","));
  console.log(await Promise.any([Promise.reject(new Error("a")), Promise.resolve("b")]));
  try { await Promise.any([Promise.reject(new Error("a"))]); } catch (e) { console.log((e as Error).name, ((e as any).errors as Error[]).length); }
};
run();
