// xl:title 静态与实例成员的隔离，静态块里的 this
// xl:round 371
// xl:judge stdout
// xl:end
class Config {
  static defaults: Record<string, number> = { a: 1 };
  static instances = 0;
  private data: Record<string, number>;
  constructor(overrides: Record<string, number> = {}) {
    this.data = { ...Config.defaults, ...overrides };
    Config.instances += 1;
  }
  get(key: string): number { return this.data[key]; }
  static { Config.defaults.extra = Config.defaults.a + 1; }
}
const a = new Config();
const b = new Config({ a: 10 });
a.data["a"] = 99;
console.log(a.get("a"), b.get("a"), Config.defaults.a, Config.defaults.extra, Config.instances);
console.log(Object.keys(a).join(","), Object.keys(Config).join(","));
