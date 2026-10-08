// xl:title implements 多个接口 / 泛型接口的形状擦除
// xl:round 371
// xl:judge stdout
// xl:end
interface Readable<T> { read(): T }
interface Writable<T> { write(v: T): void }
interface Store<T> extends Readable<T>, Writable<T> { size: number }
class Mem<T> implements Store<T> {
  private items: T[] = [];
  read(): T { return this.items[0]; }
  write(v: T): void { this.items.push(v); }
  get size(): number { return this.items.length; }
}
const m = new Mem<number>();
m.write(1);
m.write(2);
console.log(m.read(), m.size, m instanceof Mem);
