// xl:title Object.prototype.toString 给出的那几档标签
// xl:round 678
// xl:judge stdout
// xl:end

const tag = Object.prototype.toString;
console.log(tag.call({}), tag.call([]), tag.call(null), tag.call(undefined));
console.log(tag.call(1), tag.call("s"), tag.call(true));
console.log(tag.call(function () {}));
console.log(tag.call(new Map()), tag.call(new Set()));
