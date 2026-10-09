// xl:note 第 869 轮普查量出的缺口（enum-computed-comment-11）：这一条钉的是上面那条根因的一个落点
// 第 872 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 枚举成员初始值里、二元运算符与操作数之间的注释：初始值那一趟的相邻判据没走 trivia 口径（`BinaryExpression` 与运算符 / 字面量一起丢）
enum E { A = 1 << 2, B = A /*c*/ | 4 }
