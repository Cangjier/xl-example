// xl:note `!` 后面跟 `.`：非空断言（不是明确赋值断言）
// xl:expect NotNull
// xl:expect PropertyAccess
// xl:expect TypeDefine
class A {
  public a: number | null = null;
  public m(): string {
    return a!.toString();
  }
  public n(): string {
    return this.a!.valueOf().toString();
  }
}
const box = { v: 1 as number | null };
const s = box.v!.toString();
console.log(new A().m(), new A().n(), s);
