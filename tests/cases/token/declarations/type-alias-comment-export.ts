// xl:expect TypeAssign,AreaAnnotation
// xl:note `export` 与 `type` 之间夹注释
export type /* c */ D = number;
let w: D = 2;
console.log(w);
