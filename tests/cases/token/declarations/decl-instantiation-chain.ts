// xl:note 实例化表达式（TS 4.7）：被实例化的是**一条点号链**，不是单个名字
// xl:expect PropertyAccess:2,GenericType:2
const f = a.b.c<string>;
const g = a[c]<string>;
