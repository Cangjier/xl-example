// xl:note 命名空间与类合并（类 + 同名 namespace）
// xl:expect Namespace,NamespaceBody
class C {
  m() {}
}
namespace C {
  export const version = "1"
}
