// xl:title 箭头函数不绑 this；普通函数绑调用者
// xl:round 9
// xl:judge stdout
// xl:end

const obj = {
  v: 10,
  arrow() { return (() => this.v)(); },
  normal() { return function (this: any) { return this === undefined ? "u" : "b"; }(); },
};
console.log(obj.arrow(), obj.normal());
