// xl:title 访问器里的 this 与解构取值
// xl:round 623
// xl:judge stdout
// xl:end

const o = {
  v: 1,
  get doubled() { return this.v * 2; },
};
const { doubled } = o;
console.log(o.doubled, doubled);
const f = o.doubled;
console.log(f);
