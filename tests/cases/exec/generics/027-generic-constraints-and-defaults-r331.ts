// xl:title 泛型的约束与默认值在运行期一行都不产生
// xl:round 331
// xl:judge stdout
// xl:end

class Container<T extends { id: number } = { id: number }> {
  items: T[] = [];
  add(item: T): void {
    this.items.push(item);
  }
  ids(): number[] {
    return this.items.map((item) => item.id);
  }
}
const box = new Container();
box.add({ id: 3 });
box.add({ id: 4 });
console.log(box.ids().join(","), box.items.length);
