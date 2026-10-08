// xl:note 对已有模块名的模块扩充
// xl:expect Namespace,NamespaceBody,Interface,InterfaceBody
declare module "existing" {
  export interface Extra {
    a: number
  }
}
