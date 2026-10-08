// xl:title 泛型类 + 泛型方法 + 约束：类型位全擦、运行期只有值
// xl:judge stdout
// xl:end

class Box<T> {
  v: T;
  constructor(v: T) { this.v = v; }
  get(): T { return this.v; }
  map<U>(f: (x: T) => U): Box<U> { return new Box<U>(f(this.v)); }
}
function first<T extends { length: number }>(xs: T): number { return xs.length; }
const b = new Box<number>(3).map((x) => x * 2);
console.log(b.get(), first("abcd"), first([1, 2, 3]));
