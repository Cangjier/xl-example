// xl:note SWEEP-linecomment/import 落点（657 审计语料）
// xl:expect Identifier:4,Statement:2,As,BinaryOperator,Bracket,ConstString,Import,LineAnnotation,Root,String,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/import）：DRIFT ImportSpecifier TS[12,18) 产物[12,22) «b as c»
import { a, b as c //c
} from "m";
