// xl:title 箱自己带 `Symbol.toStringTag` 时，标签表要让它说了算
// xl:round 690
// xl:judge stdout
// xl:why JS 的 `Object.prototype.toString` 是「先 `Get(O, @@toStringTag)`，
//       不是字符串才用内部标签」——所以包装对象那一格**必须排在 `toStringTag` 之后**。
//       顺序反了，`o[Symbol.toStringTag] = "Custom"` 这种写法就会被
//       `"Number"` 抢先（`129-object-tolocalestring` 那一族量的正是同一处次序）。
// xl:end
const n: any = new Number(3);
(n as any)[Symbol.toStringTag] = "Custom";
console.log(Object.prototype.toString.call(n));
const plain: any = { [Symbol.toStringTag]: "Plain" };
console.log(Object.prototype.toString.call(plain));
