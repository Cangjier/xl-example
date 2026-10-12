// xl:title 箭头抓外层的 this；方法里的 this 指向接收者
// xl:round 323
// xl:judge stdout
// xl:end

const obj = {
  v: 1,
  arrow() { return (() => this.v)(); },
  method() { return this.v + 1; },
};
console.log(obj.arrow(), obj.method(), obj.v);
const f = () => typeof this;
console.log(typeof f);
