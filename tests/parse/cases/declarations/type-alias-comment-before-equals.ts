// xl:expect TypeAssign,AreaAnnotation
// xl:note 别名与 `=` 之间夹注释
type B /* c */ = string;
let y: B = "s";
console.log(y);
