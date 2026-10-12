// xl:note private name used as a class method
// xl:expect Class,ClassBody,MethodDeclaration,MethodBody
class A {
  #m() {}
  call() {
    this.#m();
  }
}
