// xl:title 泛型：函数 / 类 / 接口 / 约束（全部擦掉）
// xl:judge stdout
// xl:end

function identity<T>(v: T): T { return v; }
function first<T extends { length: number }>(xs: T[]): T { return xs[0]; }
class Box<T> {
  value: T | undefined;
  constructor(v?: T) { this.value = v; }
  get(): T | undefined { return this.value; }
}
interface Wrap<T> { item: T }
const w: Wrap<number> = { item: 3 };
console.log(identity(1), identity("s"), first([1, 2]), new Box<number>(9).get(), w.item);
