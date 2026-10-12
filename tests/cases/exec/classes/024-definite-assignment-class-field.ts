// xl:title 确定赋值断言 `x!: T` 落在类字段上
// xl:round 304
// xl:judge stdout
// xl:end

class Holder {
  value!: number;
  init() { this.value = 7; return this.value; }
}
const h = new Holder();
console.log(h.init(), h.value);
