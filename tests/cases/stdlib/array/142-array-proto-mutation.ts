// xl:title 往 `Array.prototype` 上加一格，所有数组都看得见
// xl:round 691
// xl:judge stdout
// xl:end
(Array.prototype as any).last = function () { return this[this.length - 1]; };
console.log([1, 2, 3].last());
console.log(JSON.stringify(Object.keys([1])));
delete (Array.prototype as any).last;
console.log(typeof ([1] as any).last);
