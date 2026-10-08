// xl:note J-import-export 落点（657 审计语料）
// xl:expect Identifier:5,SymbolToken:2,As,ConstString,Import,ObjectLiteral,Root,Statement,String
// xl:known-gap 注释 / 换行落在语法相邻位置之间（J-import-export）：FIELD ImportSpecifier [15,21) 产物[name] TS[name,propertyName] «b as c»
import d, { a, b as c } from "m";
