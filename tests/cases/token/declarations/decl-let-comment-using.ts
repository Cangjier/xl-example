// xl:expect Let,AreaAnnotation,Function,FunctionBody
// xl:note 显式资源管理声明的 `using` 与名字之间夹注释
function g() { using /* c */ r = open(); }
g();
