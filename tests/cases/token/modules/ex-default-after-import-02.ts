// xl:note 同一条边界：具名子句的导入没有分号时，`export default 42` 与它后面�?`interface` 各是各的语句
// xl:expect Root,Statement:2,Import,Bracket,Identifier:3,String,ConstString,Export,Keyword:2,Interface,InterfaceBody
import { a } from './pool'
export default 42

interface I {}
