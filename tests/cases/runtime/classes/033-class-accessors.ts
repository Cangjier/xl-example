// xl:title 类访问器：getter/setter 配对、静态访问器、只读缓存
// xl:round 9
// xl:judge stdout
// xl:end

class Temp {
  private c = 0;
  get celsius(): number { return this.c; }
  set celsius(v: number) { this.c = v; }
  get fahrenheit(): number { return this.c * 9 / 5 + 32; }
  static get label(): string { return "temp"; }
}
const t = new Temp();
t.celsius = 25;
console.log(t.celsius, t.fahrenheit, Temp.label);
const d = Object.getOwnPropertyDescriptor(Temp.prototype, "celsius");
console.log(typeof d.get, typeof d.set);
