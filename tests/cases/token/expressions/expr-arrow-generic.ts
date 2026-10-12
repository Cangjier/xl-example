// xl:note 泛型箭头函数 <T>(x: T): T => x 与 <T,>(x: T) => x
// xl:expect Lamda,GenericType
const f = <T>(x: T): T => x;
const g = <T,>(x: T) => x;
