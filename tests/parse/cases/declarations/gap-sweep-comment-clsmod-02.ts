// xl:note SWEEP-comment/clsmod 落点（657 审计语料）
// xl:expect AreaAnnotation,Bracket,Class,ClassBody,Field,Identifier,MethodBody,MethodDeclaration,Parameter,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/clsmod）：FIELD MethodDeclaration [40,60) 产物[body,modifiers,name,parameters] TS[body,modifiers,name] «private m(/*c*/) { }»
class C { public static readonly a = 1; private m(/*c*/) { } }
