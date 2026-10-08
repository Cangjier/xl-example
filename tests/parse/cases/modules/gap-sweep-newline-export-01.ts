// xl:note SWEEP-newline/export 落点（657 审计语料）
// xl:expect Statement:3,Identifier:2,Bracket,Export,Keyword,Let,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/export）：DRIFT ExportDeclaration TS[13,27) 产物[13,25) «export { a } ;»
const a = 1;
export { a }
;
