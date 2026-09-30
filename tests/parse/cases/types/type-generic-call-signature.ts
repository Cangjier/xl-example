// xl:note 泛型调用签名 `<T extends X>(a: T): void`
//（SignatureReorganization.Previous 原来只认「`(` 开头」与「`new` 开头」两种起点，
//  泛型调用签名完全产不出 Signature；而 `<` 前面有名字时要让给 MethodDeclaration，
//  否则 `m<T>(x: T): T` 会被抢成 Signature）
// xl:expect Signature:3,MethodDeclaration,Interface
interface I {
  <TIn extends Node>(node: TIn): void;
  (): any;
  new (v?: any): Object;
}
interface J {
  m<T>(x: T): T;
}
