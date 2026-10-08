// xl:title 私有字段 / 私有方法 / `#x in o` / 静态私有
// xl:round 736
// xl:judge stdout
// xl:want differ
// xl:why **私有字段漏进了 `Object.getOwnPropertyNames`**：`class A { #p = 1 }` 的实例在 Node 里
// xl:why 自有名字是**空的**（`#p` 不是属性名），本仓给 `#p`——私有那一摞与普通属性**同住一张表**，
// xl:why 而列名字那一趟没把它挡掉。`JSON.stringify` / `Object.keys` 那边看不出来（私有格不可枚举），
// xl:why 只有「逐个列名字」这一问露出来。
// xl:why **收它要在那一趟里按名字首字符判一次**（或给私有格一个标志位）——那是私有成员那一层的事，
// xl:why 本轮先量出来登着。
// xl:end
class A {
  #p = 1;
  static #sp = 2;
  #m() { return this.#p + 1; }
  has(o: any) { return #p in o; }
  run() { return this.#m(); }
  static getSp() { return A.#sp; }
}
const a = new A();
console.log(a.run(), a.has(a), a.has({}), A.getSp());
console.log(Object.getOwnPropertyNames(a).join(","));
console.log(Object.getOwnPropertyNames(A.prototype).join(","), typeof (a as any).run);
