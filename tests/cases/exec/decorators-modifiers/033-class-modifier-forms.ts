// xl:title 类成员修饰符：static / readonly / override / abstract 的擦除
// xl:round 371
// xl:judge stdout
// xl:end
abstract class Base {
  abstract run(): string;
  protected helper(): string { return "h"; }
  readonly tag: string = "b";
  static kind = "base";
  abstract get value(): number;
}
class Impl extends Base {
  override run(): string { return "r" + this.helper() + this.tag + Base.kind; }
  get value(): number { return 5; }
}
const i: Base = new Impl();
console.log(i.run(), i.value, Base.kind, Impl.kind);
