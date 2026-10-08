// xl:title 购物车：Map 计数、折扣、格式化金额
// xl:round 331
// xl:judge stdout
// xl:end

type Line = { sku: string; price: number; qty: number };
class Cart {
  private lines = new Map<string, Line>();
  add(sku: string, price: number, qty = 1): void {
    const found = this.lines.get(sku);
    if (found === undefined) {
      this.lines.set(sku, { sku, price, qty });
      return;
    }
    found.qty = found.qty + qty;
  }
  subtotal(): number {
    let total = 0;
    for (const line of this.lines.values()) total = total + line.price * line.qty;
    return total;
  }
  discount(): number {
    const base = this.subtotal();
    return base >= 100 ? base * 0.1 : 0;
  }
  report(): string[] {
    const out: string[] = [];
    for (const line of this.lines.values()) {
      out.push(line.sku + " x" + line.qty + " = " + (line.price * line.qty).toFixed(2));
    }
    out.push("subtotal " + this.subtotal().toFixed(2));
    out.push("discount " + this.discount().toFixed(2));
    out.push("total " + (this.subtotal() - this.discount()).toFixed(2));
    return out;
  }
}
const cart = new Cart();
cart.add("apple", 3.5, 4);
cart.add("bread", 12, 1);
cart.add("apple", 3.5, 2);
cart.add("milk", 8.25, 6);
for (const line of cart.report()) console.log(line);
