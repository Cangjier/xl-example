// xl:title 端到端：依赖注入容器（工厂 / 单例 / 循环依赖检测）
// xl:round 7
// xl:judge stdout
// xl:end

class Container {
  private factories = new Map<string, () => any>();
  private instances = new Map<string, any>();
  private building: string[] = [];
  register(name: string, factory: () => any): void { this.factories.set(name, factory); }
  resolve(name: string): any {
    if (this.instances.has(name)) return this.instances.get(name);
    const factory = this.factories.get(name);
    if (factory === undefined) throw new Error("missing " + name);
    if (this.building.includes(name)) throw new Error("cycle: " + this.building.concat(name).join("->"));
    this.building.push(name);
    const value = factory();
    this.building.pop();
    this.instances.set(name, value);
    return value;
  }
}
const c = new Container();
c.register("log", () => ({ lines: [] as string[] }));
c.register("svc", () => {
  const log = c.resolve("log");
  return { run(n: number) { log.lines.push("run " + n); return n * 2; } };
});
console.log(c.resolve("svc").run(21), c.resolve("svc") === c.resolve("svc"));
console.log(c.resolve("log").lines.join(","));
c.register("a", () => c.resolve("b"));
c.register("b", () => c.resolve("a"));
try { c.resolve("a"); } catch (e) { console.log(String((e as Error).message)); }
