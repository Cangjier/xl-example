// xl:title 私有成员：# 字段 / # 方法 / static # 与 in 判定
// xl:round 7
// xl:judge stdout
// xl:end

class Counter {
  #n = 0;
  static #total = 0;
  #bump() { this.#n++; Counter.#total++; return this.#n; }
  step() { return this.#bump(); }
  static total() { return Counter.#total; }
  static has(o: any) { return #n in o; }
}
const c = new Counter();
console.log(c.step(), c.step(), Counter.total(), Counter.has(c), Counter.has({}));
