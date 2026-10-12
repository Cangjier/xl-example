// xl:note `import … = require` 换行 `("m")` 是一条 ImportEqualsDeclaration——模块引用可以跨行，`type` 那一档也不许被读成「上一行是类型标注」（第 984 轮）
// xl:expect Import:2,Method:2,ConstString:2,Identifier:2
import A = require
("m");
import type B = require
("m");
