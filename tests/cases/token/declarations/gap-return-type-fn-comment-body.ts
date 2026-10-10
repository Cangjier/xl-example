// xl:note 第 926 轮量出的余量：返回类型是「带注释的函数类型」时，方法 / 函数体里的语句不再包 `Statement`
// xl:known-gap 体里那几格的语句包装被「带注释的返回类型」折叠那一趟挤掉了（第 926 轮量到，未收）
// xl:expect MethodDeclaration:1,FunctionType:1,MethodBody:1
class E { on(): ()/*c*/ => void { return; } }
