// xl:title 静态私有字段与静态方法一起用
// xl:round 304
// xl:judge stdout
// xl:end

class Registry {
  static #items: string[] = [];
  static add(x: string) { Registry.#items.push(x); return Registry.#items.length; }
  static get all() { return Registry.#items.join(","); }
}
console.log(Registry.add("a"), Registry.add("b"), Registry.all);
