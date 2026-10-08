// xl:title 带类型标注的访问器与只读属性
// xl:round 371
// xl:judge stdout
// xl:end
class Temp {
  private _c = 0;
  get celsius(): number { return this._c; }
  set celsius(v: number) { this._c = v; }
  get fahrenheit(): number { return this._c * 9 / 5 + 32; }
  readonly id: string = "t1";
}
const t = new Temp();
t.celsius = 100;
console.log(t.celsius, t.fahrenheit, t.id);
const lit = { get v(): number { return 3; }, set v(_x: number) {} };
console.log(lit.v);
