// xl:note `=>` 与花括号体之间夹一条注释——体是不是块要读 token 字段，不能看 `=>` 之后第一个字符
// xl:expect Lamda,LamdaBody,StaticBlock
const empty = () => /* 体之前 */ {
};

const value = (a: number) => /* 体之前 */ {
  return a + 1;
};

const expression = (a: number) => /* 表达式体之前 */ a * 2;

class Holder {
  static /* 关键字与括号之间 */ {
  }

  run = async () => /* 体之前 */ {
    return value(1);
  };
}

export { empty, value, expression, Holder };
