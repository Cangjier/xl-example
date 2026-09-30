// xl:note 构造函数里的 new.target
// xl:expect Class,ClassBody,Method,MethodBody
class C {
  constructor() {
    if (new.target === C) {
      setup()
    }
  }
}
