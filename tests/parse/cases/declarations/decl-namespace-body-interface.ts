// xl:note namespace 体里只放 interface（用来单独区分哪种声明在 namespace 体内失败）
// xl:expect Interface,InterfaceBody,Field,Namespace,NamespaceBody
namespace N {
  export interface I {
    a: number
  }
}
