// xl:note SWEEP-linecomment/import 落点（657 审计语料）
// xl:expect Identifier:5,Statement:2,Bracket,ConstString,Import,LineAnnotation,Root,String,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/import）：DRIFT ImportDeclaration TS[0,34) 产物[0,20) «import { a, b as c } //c from "m";»
import { a, b as c } //c
from "m";
