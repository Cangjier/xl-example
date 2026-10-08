// xl:note SWEEP-linecomment/ns 落点（657 审计语料）
// xl:expect Statement:3,Identifier:2,Keyword:2,LineAnnotation,Namespace,NamespaceBody,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/ns）：MISS VariableStatement TS[14,37) «export const //c a = 1;»
namespace N { export const //c
a = 1; }
