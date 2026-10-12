// xl:note 条件类型跨行书写：`extends` 在行尾、真分支在下一行，整体仍是一个节点
// xl:expect ConditionalType,Keyword
// xl:absent TernaryOperator
type V = ReturnType<any[]> extends
  Iterator<any, infer TReturn> ? TReturn
  : any
