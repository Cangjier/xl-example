// xl:title instanceof 对原始值与内建
// xl:judge stdout
// xl:end

console.log(1 instanceof Number, "s" instanceof String, true instanceof Boolean);
console.log([] instanceof Array, [] instanceof Object, {} instanceof Object);
console.log((() => 1) instanceof Function, null instanceof Object);
