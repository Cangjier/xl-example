// xl:title 类字段里的箭头函数：this 永远是这个实例
// xl:round 304
// xl:judge stdout
// xl:end

class Counter {
  n = 0;
  bump = () => { this.n += 1; return this.n; };
}
const c = new Counter();
const detached = c.bump;
console.log(detached(), detached(), c.n);
