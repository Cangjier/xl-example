// xl:note 命名空间与函数合并
// xl:expect Namespace,NamespaceBody
function f() {}
namespace f {
  export const version = "1"
}
