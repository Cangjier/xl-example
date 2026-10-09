// xl:note 箭头函数的返回类型标注冒号后面换行（第 900 轮片段普查量出、第 901 轮转绿）：换行原来被 ASI 判成语句边界，`number => 1` 另起一条 `Statement`（产物里是 3 条语句），箭头只盖到那个冒号
// xl:round 900
// xl:expect Lamda:1,LamdaParameters:1,LamdaBody:1,TypeDefine:2,Statement:2
// xl:end
const f = (a: string):
number => 1;
