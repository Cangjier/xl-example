// xl:note private name used as a class field
// xl:expect Class,ClassBody,Field,MethodDeclaration,MethodBody,Keyword
class A {
  #x = 1;
  m(/* c */) {
    return this.#x;
  }
}
