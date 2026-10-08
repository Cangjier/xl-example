// xl:title 任务调度器：优先级队列 + 依赖等待
// xl:round 371
// xl:judge stdout
// xl:end
type Job = { name: string; priority: number; deps: string[] };
class Scheduler {
  private jobs = new Map<string, Job>();
  private done = new Set<string>();
  add(job: Job): void { this.jobs.set(job.name, job); }
  run(): string[] {
    const order: string[] = [];
    let progress = true;
    while (progress) {
      progress = false;
      const ready = [...this.jobs.values()]
        .filter((j) => !this.done.has(j.name) && j.deps.every((d) => this.done.has(d)))
        .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
      if (ready.length > 0) {
        const job = ready[0];
        this.done.add(job.name);
        order.push(job.name);
        progress = true;
      }
    }
    return order;
  }
  blocked(): string[] {
    return [...this.jobs.keys()].filter((n) => !this.done.has(n)).sort();
  }
}
const s = new Scheduler();
s.add({ name: "deploy", priority: 1, deps: ["build", "test"] });
s.add({ name: "build", priority: 5, deps: [] });
s.add({ name: "test", priority: 3, deps: ["build"] });
s.add({ name: "lint", priority: 9, deps: [] });
s.add({ name: "docs", priority: 2, deps: ["build"] });
console.log(s.run().join("->"));
console.log(s.blocked().length);
const dead = new Scheduler();
dead.add({ name: "a", priority: 1, deps: ["b"] });
dead.add({ name: "b", priority: 1, deps: ["a"] });
console.log(dead.run().length, dead.blocked().join(","));
