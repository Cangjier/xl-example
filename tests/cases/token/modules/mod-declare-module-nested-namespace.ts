// xl:note namespace nested inside an ambient module
// xl:expect Let,Namespace,NamespaceBody
declare module "x" {
  namespace N {
    const a: number;
  }
}
