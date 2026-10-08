// xl:note 命名空间：体的 `{` 与点号名字第一段由 token 出的字段定位
// xl:expect Namespace,NamespaceBody
/* A */ namespace A.B { export const x = 1 }
module /* B */ B.C { }
namespace D {
  export namespace E { export const y = 2 }
}
declare module "m" { }
