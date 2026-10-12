// xl:note 派生类构造函数里的 super() 与方法里的 super.m()
// xl:expect Method
class B {
  m() {}
}
class D extends B {
  constructor() {
    super();
  }
  m() {
    super.m();
  }
}
