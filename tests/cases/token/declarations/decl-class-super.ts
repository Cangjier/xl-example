// xl:note super() 调用与 super.method() / super.field 访问
// xl:expect Class,ClassBody,Method,MethodBody
class D extends B {
  constructor() {
    super()
  }
  m() {
    super.m()
  }
}
