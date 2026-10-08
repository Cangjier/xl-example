// xl:note SWEEP-comment/import 落点（657 审计语料）
// xl:expect Identifier:5,AreaAnnotation,Bracket,ConstString,Import,Root,Statement,String,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/import）：DRIFT ImportDeclaration TS[0,35) 产物[0,29) «import { a, b as c } from "m"/*c*/;»
import { a, b as c } from "m"/*c*/;
