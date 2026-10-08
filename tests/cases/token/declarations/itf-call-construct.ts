// xl:expect Interface,Signature
// xl:note 基线用例（来自缺口审计语料）
interface I {
  (a: number): string
  new (a: number): I
  new <T>(a: T): T
}
