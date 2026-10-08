// xl:note 类体里的空成员：单独一个 `;` 是 TS 的 SemicolonClassElement，不是谁的分号
// xl:expect ClassBody,SemicolonClassElement,Field,MethodDeclaration
class C {
  ;
  x = 1;
  ;
  m() {
    return 1;
  }
  ;
}
console.log(new C().x + new C().m());
