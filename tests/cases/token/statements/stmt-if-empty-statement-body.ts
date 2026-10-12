// xl:expect IfSet,IfStatement
// xl:note 空语句体：`if (a);` 的 thenStatement 是 EmptyStatement（它不在行首，投影侧的行首判据会判掉）
if (a);
