// xl:expect While,WhileBody,AreaAnnotation
// xl:note 空体 `while (a) /* c */;`：体的位置读 EmptyBodyAt，注释不挡住那个 `;`
let a = true;
while (a) /* c */;
