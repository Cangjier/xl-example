// xl:title 私有字段**出现在表达式里**（`this.#n + 1` / `this.#n * 2` / `this.#n++`）
// xl:judge stdout
// xl:end

class Counter {
  #n = 7;
  plus(): number { return this.#n + 1; }
  times(): number { return this.#n * 2; }
  test(): boolean { return this.#n === 7; }
  post(): number { return this.#n++; }
  get value(): number { return this.#n; }
}
const c = new Counter();
console.log(c.plus(), c.times(), c.test(), c.post(), c.value);
