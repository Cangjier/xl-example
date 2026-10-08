// xl:expect Class
// xl:note 基线用例（来自缺口审计语料）
// xl:known-gap 注释夹在方法名与泛型段 / 参数表之间，或字段 `=` 与箭头函数之间（r660 探针池 mut-cls-generic-method-arrow-field-95）
class A {
  m<T>(x: T): T {
    return x
  }
  f =/* c */ (a: number): void => {}
}
