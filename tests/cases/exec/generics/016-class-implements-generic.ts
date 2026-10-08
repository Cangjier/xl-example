// xl:title 类实现泛型接口并带头部类型实参
// xl:round 304
// xl:judge stdout
// xl:end

interface Repo<T> { get(id: number): T | undefined; all(): T[] }
class MemRepo<T extends { id: number }> implements Repo<T> {
  private rows: T[] = [];
  add(row: T) { this.rows.push(row); }
  get(id: number): T | undefined { return this.rows.find((r) => r.id === id); }
  all(): T[] { return this.rows.slice(); }
}
const r = new MemRepo<{ id: number; name: string }>();
r.add({ id: 1, name: "a" });
console.log(r.get(1)?.name, r.all().length);
