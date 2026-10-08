// xl:title 库存报表：接口 + 类 + Map + 排序 + JSON + 模板串
// xl:round 305
// xl:judge stdout
// xl:end

interface Item { name: string; qty: number; price: number }
class Store {
  private items = new Map<string, Item>();
  add(item: Item): void { this.items.set(item.name, item); }
  total(): number {
    let sum = 0;
    for (const { qty, price } of this.items.values()) sum += qty * price;
    return sum;
  }
  report(): string[] {
    return [...this.items.values()]
      .sort((a, b) => b.qty * b.price - a.qty * a.price)
      .map(({ name, qty, price }) => name + " x" + qty + " = " + (qty * price).toFixed(2));
  }
}
const s = new Store();
s.add({ name: "bolt", qty: 10, price: 0.5 });
s.add({ name: "nut", qty: 4, price: 1.25 });
s.add({ name: "washer", qty: 100, price: 0.05 });
for (const line of s.report()) console.log(line);
console.log("total", s.total().toFixed(2));
console.log(JSON.stringify(s.report().length));
