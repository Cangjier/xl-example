// xl:title 异步流水线：逐级加工与背压
// xl:round 371
// xl:judge stdout
// xl:end
type Stage = { name: string; run: (v: number) => Promise<number> };
async function runPipeline(stages: Stage[], seeds: number[]): Promise<string[]> {
  const out: string[] = [];
  for (const seed of seeds) {
    let value = seed;
    const trace: string[] = [];
    for (const stage of stages) {
      value = await stage.run(value);
      trace.push(stage.name + "=" + value);
    }
    out.push(trace.join(","));
  }
  return out;
}
async function main(): Promise<void> {
  const stages: Stage[] = [
    { name: "double", run: async (v) => v * 2 },
    { name: "increment", run: async (v) => { await Promise.resolve(); return v + 1; } },
    { name: "clamp", run: async (v) => Math.min(v, 10) },
  ];
  const lines = await runPipeline(stages, [1, 4, 9]);
  for (const line of lines) console.log(line);
  const failing: Stage[] = [{ name: "boom", run: async () => { throw new Error("stop"); } }];
  try {
    await runPipeline(failing, [1]);
  } catch (e) {
    console.log("caught", (e as Error).message);
  }
  console.log("done", lines.length);
}
main();
