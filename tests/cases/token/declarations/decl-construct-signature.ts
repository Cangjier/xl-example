// xl:note 可构造签名 `new (…)` 与可调用签名 `(…)` 在产物里同标签（Signature），靠 kind 属性分：construct / call
// xl:expect Signature:2,New,Parameter:2
interface I {
  new (x: number): A;
  (y: string): B;
}
