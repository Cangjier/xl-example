// xl:note SWEEP-newline/generic 落点（657 审计语料）
// xl:expect Identifier:7,Statement:3,Bracket:2,Keyword:2,Function,GenericType,Parameter,ReturnType,Root,SymbolToken,TypeDefine,TypeParameter
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/generic）：DRIFT FunctionDeclaration TS[0,47) 产物[0,30) «function f<T extends U>(x: T): T { return x; }»
function f<T extends U>(x: T): 
T { return x; }
