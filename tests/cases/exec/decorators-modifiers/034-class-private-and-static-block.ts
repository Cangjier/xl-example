// xl:title 私有字段 / 私有方法 / 静态块 / 计算键一起上
// xl:round 371
// xl:judge stdout
// xl:end
class Counter {
  #count = 0;
  static #instances = 0;
  static registry: Record<string, number> = {};
  static { Counter.registry["init"] = 1; }
  constructor() { Counter.#instances = Counter.#instances + 1; }
  #bump(by: number): number { this.#count = this.#count + by; return this.#count; }
  get value(): number { return this.#count; }
  static get instances(): number { return Counter.#instances; }
  ["dyn" + "amic"](): string { return "d"; }
  static has(obj: unknown): boolean { return #count in (obj as object); }
}
const c = new Counter();
console.log(c.value, c.dynamic(), Counter.instances, Counter.has(c), Counter.registry.init);
try { console.log((c as any).count); } catch (e) { console.log("no field"); }
