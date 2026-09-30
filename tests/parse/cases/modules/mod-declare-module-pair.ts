// xl:note 两条环境模块声明连续出现：是两条语句、两个 Namespace，不该并成一个 Statement
// xl:expect Statement:6,Namespace:2,NamespaceBody:2
declare module "x" { const a: number }
declare module "node:x" { const b: string }
