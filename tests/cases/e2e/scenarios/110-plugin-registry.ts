// xl:title 插件注册表：惰性工厂、依赖顺序、失败隔离
// xl:round 371
// xl:judge stdout
// xl:end
type Plugin = { name: string; deps: string[]; factory: () => string };
class Registry {
  private defs = new Map<string, Plugin>();
  private built = new Map<string, string>();
  private building = new Set<string>();
  register(p: Plugin): this { this.defs.set(p.name, p); return this; }
  get(name: string): string {
    const cached = this.built.get(name);
    if (cached !== undefined) return cached;
    const def = this.defs.get(name);
    if (!def) throw new Error("unknown plugin: " + name);
    if (this.building.has(name)) throw new Error("cycle at " + name);
    this.building.add(name);
    const parts = def.deps.map((d) => this.get(d));
    const value = def.factory() + "(" + parts.join("+") + ")";
    this.building.delete(name);
    this.built.set(name, value);
    return value;
  }
  names(): string[] { return [...this.defs.keys()].sort(); }
}
const reg = new Registry();
reg.register({ name: "core", deps: [], factory: () => "core" });
reg.register({ name: "log", deps: ["core"], factory: () => "log" });
reg.register({ name: "http", deps: ["log", "core"], factory: () => "http" });
reg.register({ name: "app", deps: ["http"], factory: () => "app" });
console.log(reg.get("app"));
console.log(reg.names().join(","));
reg.register({ name: "x", deps: ["x"], factory: () => "x" });
try { reg.get("x"); } catch (e) { console.log((e as Error).message); }
try { reg.get("nope"); } catch (e) { console.log((e as Error).message); }
console.log(reg.get("app") === reg.get("app"));
