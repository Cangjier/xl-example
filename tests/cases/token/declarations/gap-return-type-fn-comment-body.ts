// xl:note 返回类型是「带注释的函数类型」时，方法体里的语句仍要被包进 `Statement`（第 926 轮登记、第 927 轮转绿，`xl:known-gap` 按规矩撤掉，用例留着当守卫：`IsFunctionTypeArrow` 往回那三格原来只跳软换行 ⇒ 那条注释让「这是函数类型的箭头」判否 ⇒ 体的 `{` 被认成对象字面量 ⇒ 两个语句成形器都在值位花括号那一格早退）
// xl:round 926
// xl:expect MethodDeclaration:1,FunctionType:1,MethodBody:1,Statement:1
// xl:end
class E { on(): ()/*c*/ => void { return; } }
