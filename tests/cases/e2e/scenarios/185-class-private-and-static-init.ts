// xl:title 端到端：私有字段 + 静态初始化顺序 + getter 只算一次
// xl:round 639
// xl:judge stdout
// xl:end

const order: string[] = [];
class Counter {
  static total = 0;
  static { order.push("static-block"); Counter.total = 100; }
  #hits = 0;
  get hits(): number { order.push("get"); return this.#hits; }
  bump(): number { this.#hits += 1; Counter.total += 1; return this.#hits; }
  static has(obj: object): boolean { return #hits in obj; }
}
const c = new Counter();
c.bump();
c.bump();
console.log(order.join(","));
console.log(c.hits, Counter.total, Counter.has(c));
