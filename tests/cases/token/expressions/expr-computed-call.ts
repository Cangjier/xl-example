// xl:note 零实参的计算成员调用：实参表里 / 运算符左脊柱上（第 179 轮）
// xl:expect Method,PropertyAccess,Bracket,BinaryOperator,NotNull
console.log(xs[0]());
console.log(xs[0]() + 1);
console.log(xs[0]() + 1 + 2);
const y = obj["m"]();
const z = map.get(k)!;
