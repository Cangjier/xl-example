// xl:note 箭头函数的返回类型标注冒号后面换行（第 900 轮片段普查量出）：换行被 ASI 判成语句边界，`number => 1` 另起一条 `Statement`（产物里是 3 条语句），箭头只盖到那个冒号
// xl:round 900
// xl:known-gap 变量声明里 `(…):` 换行之后的类型段不在「这一行没完」的续接表里——`IsVariableTypeAnnotationColon` 只认同行那一格
// xl:expect Lamda:1,LamdaParameters:1,LamdaBody:1,TypeDefine:1,Statement:3
// xl:end
const f = (a: string):
number => 1;
