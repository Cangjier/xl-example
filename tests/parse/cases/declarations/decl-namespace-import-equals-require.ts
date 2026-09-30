// xl:note namespace 内的 import x = require("m")
// xl:expect Namespace,NamespaceBody
namespace N {
  import x = require("m")
  export const a = x
}
