// xl:title 方法里的箭头回调拿到的是实例的 this
// xl:round 304
// xl:judge stdout
// xl:end

class Box {
  items: number[] = [1, 2, 3];
  sum(): number {
    return this.items.reduce((acc, x) => acc + x, 0);
  }
  doubled(): number[] {
    return this.items.map((x) => x * this.items.length);
  }
}
const b = new Box();
console.log(b.sum(), b.doubled().join(","));
