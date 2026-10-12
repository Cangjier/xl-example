// xl:title 类字段箭头函数：`this` 钉在实例上
// xl:round 330
// xl:judge stdout
// xl:end

class Counter {
  count = 0;
  bump = (): number => {
    this.count = this.count + 1;
    return this.count;
  };
  twice(): number {
    return this.bump() + this.bump();
  }
}
const c = new Counter();
const detached = c.bump;
console.log(detached(), c.twice(), c.count);
