// xl:note private name used as a class field
// xl:expect Class,ClassBody,Field,MethodDeclaration,MethodBody,Keyword
// xl:known-gap 注释夹在私有字段那个类的方法名 / 参数表里（r660 探针池 mut-lex-private-field-142）
class A {
  #x = 1;
  m(/* c */) {
    return this.#x;
  }
}
