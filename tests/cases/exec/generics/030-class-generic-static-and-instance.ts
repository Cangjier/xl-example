// xl:title 泛型类的静态成员与实例成员分工
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Registry<T> {
  static count = 0;
  static of<T>(v: T): Registry<T> { Registry.count++; return new Registry<T>(v); }
  private items: T[] = [];
  constructor(private seed: T) { this.items.push(seed); }
  add(v: T): this { this.items.push(v); return this; }
  values(): T[] { return this.items; }
  static reset(): void { Registry.count = 0; }
}
const r = Registry.of("a").add("b");
console.log(r.values().join(","), Registry.count, typeof Registry.of);
Registry.reset();
console.log(Registry.count);
