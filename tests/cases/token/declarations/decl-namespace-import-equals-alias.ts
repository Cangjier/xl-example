// xl:note namespace 内的 import A = B.C 别名
// xl:expect Namespace,NamespaceBody
namespace N {
  import A = B.C
  export const a = A
}
