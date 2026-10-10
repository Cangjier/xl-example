// xl:note 函数头的返回类型是**复合类型**时，体写在下一行照样是一条声明（第 985 轮：`IsHeaderBodyBrace` 的名字预算量不了一个可以有任意长度的返回类型）
// xl:expect Function:4,FunctionBody:4,ReturnType:4,TypeOperator:1,TypeQuery:1,TupleType:1,ConditionalType:1
function a(): keyof T
{ return null as any; }
function b(): typeof x
{ return null as any; }
function c(): [A, ...B]
{ return null as any; }
function d(): A extends B ? C : D
{ return null as any; }
