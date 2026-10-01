// xl:note 箭头函数的块体是语句块：`return a` 是语句，不能退化成 Field
// xl:expect Lamda,LamdaBody,Keyword,Identifier
// xl:absent TypeLiteral,Field
const f = (a) => {
  return a
}
