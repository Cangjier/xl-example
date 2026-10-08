// xl:note 基线用例（来自缺口审计语料）
// xl:expect Import,Namespace,NamespaceBody,Interface
declare module "a" {
  import { B } from "b"
  export interface C {
    b: B
  }
}
