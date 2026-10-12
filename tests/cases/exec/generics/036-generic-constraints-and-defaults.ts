// xl:title 泛型约束 / 默认值 / 多个类型参数
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

function pick<T extends object, K extends keyof T>(source: T, key: K): T[K] {
  return source[key];
}
const person = { name: "kim", age: 30 };
console.log(pick(person, "name"), pick(person, "age"));
function wrap<T = string>(value: T): { value: T } { return { value }; }
console.log(wrap("s").value, wrap(1).value);
class Box<T extends { id: number }> {
  constructor(public item: T) {}
  id(): number { return this.item.id; }
}
console.log(new Box({ id: 9, tag: "t" }).id());
