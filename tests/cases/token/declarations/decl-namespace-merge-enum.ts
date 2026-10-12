// xl:note 命名空间与枚举合并
// xl:expect Namespace,NamespaceBody
enum E {
  A,
}
namespace E {
  export const version = "1"
}
