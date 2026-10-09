// xl:title 泛型的约束与默认值只是编译期信息
// xl:round 371
// xl:judge stdout
// xl:end
interface HasId { id: string }
function byId<T extends HasId, K extends keyof T = keyof T>(items: T[], key: K): T[] {
  return items.slice().sort((x, y) => String(x[key]).localeCompare(String(y[key])));
}
class Store<T extends HasId = HasId> {
  private items: T[] = [];
  add(item: T): void { this.items.push(item); }
  all(): T[] { return this.items; }
}
const s = new Store();
s.add({ id: "b" });
s.add({ id: "a" });
console.log(s.all().map((x) => x.id).join(","), byId([{ id: "z" }, { id: "y" }], "id").map((x) => x.id).join(","));
