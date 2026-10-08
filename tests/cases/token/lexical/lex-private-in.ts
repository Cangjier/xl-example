// xl:note private name used with the in operator
// xl:expect Class,ClassBody,Field,MethodDeclaration,MethodBody,Keyword
class A {
  #x = 1;
  has(o: object) {
    return #x in o;
  }
}
