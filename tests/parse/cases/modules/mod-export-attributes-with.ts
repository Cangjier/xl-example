// xl:note 导出侧的导入属性 `with { … }`：与导入侧同一条口径，要摘成 `AssertClause`，
// 不能被当成具名导出的那个花括号
// xl:expect Export,Keyword,Bracket,String,ConstString
export { a } from 'm' with { type: 'json' }
