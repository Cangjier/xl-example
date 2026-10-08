// xl:title `typeof` 打在**函数表达式 / 类表达式 / 箭头**上
// xl:round 740
// xl:judge stdout
// xl:end
console.log(typeof function () {});
console.log(typeof (() => 1));
console.log(typeof class { });
const C = class { };
console.log(typeof C);
