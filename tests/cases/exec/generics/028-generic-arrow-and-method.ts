// xl:title 泛型箭头函数与泛型方法
// xl:round 371
// xl:judge stdout
// xl:end
const first = <T,>(xs: T[]): T => xs[0];
const pair = <A, B>(a: A, b: B): [A, B] => [a, b];
class Repo {
  items: string[] = [];
  add<T extends string>(x: T): this { this.items.push(x); return this; }
  all<T>(): T[] { return this.items as unknown as T[]; }
}
console.log(first([3, 4]), pair(1, "x").join("-"), new Repo().add("a").add("b").all().join(""));
