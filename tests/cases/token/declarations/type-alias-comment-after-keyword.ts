// xl:expect TypeAssign,AreaAnnotation
// xl:note `type` 与别名之间夹注释
type /* c */ A = number;
let x: A = 1;
console.log(x);
