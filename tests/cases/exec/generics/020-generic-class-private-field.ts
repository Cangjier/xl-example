// xl:title 泛型类 + 私有字段 + 泛型 getter
// xl:round 305
// xl:judge stdout
// xl:end

class Box<T> {
  #v: T;
  constructor(v: T) { this.#v = v; }
  get value(): T { return this.#v; }
}
console.log(new Box(5).value, new Box("s").value, new Box([1, 2]).value.length);
