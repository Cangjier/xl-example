// xl:title 箭头 IIFE 里的 this 与外部一致
// xl:round 304
// xl:judge stdout
// xl:end

const obj = {
  tag: "obj",
  run() {
    return (() => this.tag)();
  },
  run2() {
    return (function (this: any) { return this === undefined ? "undefined" : "bound"; })();
  },
};
console.log(obj.run(), obj.run2());
