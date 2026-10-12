// xl:title 私有字段：品牌检查、同名不同类互不可见
// xl:round 9
// xl:judge stdout
// xl:end

class Box {
  #v: number;
  constructor(v: number) { this.#v = v; }
  static peek(o: unknown): number {
    return o instanceof Box ? o.#v : -1;
  }
}
class Other { #v = 9; }
console.log(Box.peek(new Box(5)), Box.peek(new Other()));
