// xl:note `export = X` 的表达式在 Export 单元的**平级兄弟**上（`Statement > [Export, Identifier]`），投影层要合成 ExportAssignment
// xl:expect Export:1,Namespace,NamespaceBody,Statement:4
declare module "m" {
  export = strict;
}
