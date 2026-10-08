// xl:title 访问器覆盖：子类 getter 调 super 的 getter
// xl:judge stdout
// xl:end

class Base {
  #v = 1;
  get value() { return this.#v; }
  set value(next: number) { this.#v = next; }
}
class Doubled extends Base {
  get value() { return super.value * 2; }
  set value(next: number) { super.value = next; }
}
const d = new Doubled();
d.value = 21;
console.log(d.value, Object.getPrototypeOf(Doubled.prototype) === Base.prototype);
