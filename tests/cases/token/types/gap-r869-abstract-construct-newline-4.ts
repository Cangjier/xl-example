// xl:note 第 869 轮普查量出的缺口（abstract-construct-newline-4）：这一条钉的是上面那条根因的一个落点
// 第 873 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `abstract` 与 `new` 之间的注释 / 换行：构造签名类型那一支只认 `new` 紧跟形参表，`abstract` 那一格没接上
type T = abstract 
 new () => X;
