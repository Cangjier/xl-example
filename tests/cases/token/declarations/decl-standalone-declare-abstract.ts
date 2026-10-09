// xl:note 孤立的上下文关键字：`declare` / `abstract` 后面没有「要被修饰的东西」时不升级成 Keyword
// xl:expect Identifier:5,Statement:5,Root
declare;
abstract;
declare
const a = 1;
abstract
class A {}
