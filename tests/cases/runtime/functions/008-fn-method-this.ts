// xl:title 方法调用里的 this 就是接收者（含转手调用）
// xl:judge stdout
// xl:end

const o: any = {
  n: 5,
  read() { return this.n; },
};
console.log(o.read());
const detached = { n: 9, read: o.read };
console.log(detached.read());
