// xl:note 字符串模块名是一个整体（模块路径），不按点号拆成嵌套的 Namespace
// xl:expect Namespace:1,NamespaceBody:1
declare module "./m" { interface I { x: number } }
