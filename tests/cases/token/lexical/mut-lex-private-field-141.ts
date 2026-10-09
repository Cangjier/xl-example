// xl:note private name used as a class field
// xl:expect Class,ClassBody,Field,Keyword,PropertyAccess
class A {
  #x = 1;
  m/* c */() {
    return this.#x;
  }
}
