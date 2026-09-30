// xl:note override 修饰符（含 override readonly / override 方法）
// xl:expect Class,ClassBody
class D extends B {
  override m() {}
  override readonly p: number = 1
}
