// xl:title 私有名检查 #x in obj 与私有字段读写
// xl:round 676
// xl:judge stdout
// xl:end

class Box {
  #v = 1;
  static has(o: any): boolean {
    return #v in o;
  }
  get v(): number {
    return this.#v;
  }
}
const b = new Box();
console.log(Box.has(b), Box.has({}), b.v);
console.log(b.v + (b.v = 5));
