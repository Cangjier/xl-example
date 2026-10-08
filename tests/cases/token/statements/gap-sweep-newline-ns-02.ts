// xl:note SWEEP-newline/ns 落点（657 审计语料）
// xl:expect Statement:3,Identifier:2,Keyword:2,Namespace,NamespaceBody,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/ns）：MISS VariableStatement TS[14,34) «export const a = 1;»
namespace N { export const 
a = 1; }
