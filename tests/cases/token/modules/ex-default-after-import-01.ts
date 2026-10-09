// xl:note 导入声明后面的换行就是语句边界：下一条 `export default` 是独立的 `ExportAssignment`，不许被折成再下一条声明的修饰词
// xl:expect Root,Statement:3,Import,String,ConstString,Export,Keyword:2,Identifier,Class,ClassBody
import './pool'
export default Agent

declare class Agent {}
