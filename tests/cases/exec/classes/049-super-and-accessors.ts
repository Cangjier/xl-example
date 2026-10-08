// xl:title super 与访问器：子类里 super.x / super.f() 与 get/set 覆盖
// xl:round 7
// xl:judge stdout
// xl:end

class Base {
  #tag = "base";
  get label(): string { return "L:" + this.#tag; }
  set label(v: string) { this.#tag = v; }
  who(): string { return "base"; }
}
class Sub extends Base {
  override get label(): string { return super.label + "!"; }
  override set label(v: string) { super.label = v.toUpperCase(); }
  override who(): string { return super.who() + "/sub"; }
}
const s = new Sub();
console.log(s.label, s.who());
s.label = "x";
console.log(s.label, s.who());
