// xl:note 方法声明里残留的名字 + 形参表不许再收成一个调用（第 66 轮的对照组）
// xl:expect MethodDeclaration:2
// xl:absent Method
class A {
  #m() { return 1; }
  n() {}
}
