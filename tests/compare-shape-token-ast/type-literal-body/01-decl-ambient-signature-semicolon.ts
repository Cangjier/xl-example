// token: TypeLiteralBody
// xl:note 环境签名（没有体的函数声明）后面那个 `;` 归声明自己，不是空语句
// xl:expect Function
declare function g(): {
  config?: any;
};
