// xl:title `var` 在块外可见、重复声明
// xl:round 691
// xl:judge stdout
// xl:end
{ var v = 1; }
console.log(v);
var v = 2;
console.log(v);
function g(): number { if (true) { var w = 3; } return w; }
console.log(g());
