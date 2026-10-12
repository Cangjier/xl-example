// xl:title 端到端：任务调度器（优先级 + 去重 + 依赖完成后才跑 + 结果聚合）
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

type Task = { id: string; deps: string[]; run: () => number };
class Scheduler {
  constructor(private tasks: Task[]) {}
  run(): string {
    const done = new Map<string, number>();
    let progress = true;
    while (progress) {
      progress = false;
      for (const t of this.tasks) {
        if (done.has(t.id)) continue;
        if (t.deps.every((d) => done.has(d))) { done.set(t.id, t.run()); progress = true; }
      }
    }
    const pending = this.tasks.filter((t) => !done.has(t.id)).map((t) => t.id);
    return [...done.entries()].map(([k, v]) => k + "=" + v).join(",") + "|pending:" + pending.join(",");
  }
}
const s = new Scheduler([
  { id: "c", deps: ["a", "b"], run: () => 3 },
  { id: "a", deps: [], run: () => 1 },
  { id: "b", deps: ["a"], run: () => 2 },
]);
console.log(s.run());
const cyc = new Scheduler([{ id: "x", deps: ["y"], run: () => 0 }, { id: "y", deps: ["x"], run: () => 0 }]);
console.log(cyc.run());
