// xl:title 静态块 + 私有字段 / 私有方法 / 私有静态
// xl:round 7
// xl:judge stdout
// xl:end

class Counter {
  #count = 0;
  static #instances = 0;
  static registry: string[] = [];
  static {
    Counter.registry.push("init");
  }
  constructor() { Counter.#instances++; }
  static get instances(): number { return Counter.#instances; }
  #bump(): void { this.#count++; }
  inc(): number { this.#bump(); return this.#count; }
  static has(obj: any): boolean { return #count in obj; }
}
const c = new Counter();
console.log(c.inc(), c.inc(), Counter.instances, Counter.registry.join(","));
console.log(Counter.has(c), Counter.has({}));
