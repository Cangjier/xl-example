// xl:note 裸块与连写分号：`{ … } ;` 是块 + 空语句，`let a = 1;;` 是变量声明 + 空语句
// xl:expect Bracket,Let,Statement
{
  a();
}
;
let b = 1;;
