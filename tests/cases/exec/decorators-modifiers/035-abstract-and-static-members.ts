// xl:title 抽象成员、抽象静态、抽象访问器都不产生实现
// xl:round 371
// xl:judge stdout
// xl:end
abstract class Repo<T> {
  abstract find(id: string): T | undefined;
  abstract get size(): number;
  static create(): Repo<string> { return new Mem(); }
  list(): T[] { return []; }
}
class Mem extends Repo<string> {
  private data = new Map<string, string>();
  find(id: string): string | undefined { return this.data.get(id); }
  get size(): number { return this.data.size; }
  add(id: string, v: string): void { this.data.set(id, v); }
}
const r = Repo.create() as Mem;
r.add("a", "1");
console.log(r.find("a"), r.size, r.list().length, r instanceof Repo);
