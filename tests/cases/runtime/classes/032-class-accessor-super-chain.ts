// xl:title 派生类里 get / set 与 super 的两向配合
// xl:round 7
// xl:judge stdout
// xl:end

class Base {
  protected raw = 1;
  get value(): number { return this.raw; }
  set value(next: number) { this.raw = next; }
}
class Doubler extends Base {
  get value(): number { return super.value * 2; }
  set value(next: number) { super.value = next; }
}
const d = new Doubler();
console.log(d.value);
d.value = 5;
console.log(d.value);
const target = { get v() { return "g"; }, set v(x: string) { console.log("set", x); } };
target.v = "z";
console.log(target.v);
