// xl:title 私有方法 / 静态私有成员 / 私有名访问
// xl:judge stdout
// xl:end

class Counter {
  #n = 0;
  static #instances = 0;
  constructor() { Counter.#instances += 1; }
  #bump() { this.#n += 1; return this.#n; }
  tick() { return this.#bump(); }
  static get count() { return Counter.#instances; }
  has(o: any) { return #n in o; }
}
const a = new Counter();
const b = new Counter();
a.tick(); a.tick(); b.tick();
console.log(a.tick(), Counter.count, a.has(a), a.has({}));
