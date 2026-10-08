// xl:title 内建方法自己那两格（`call` / `apply` / `bind` / `toString` 那一族）
// xl:round 731
// xl:judge stdout
// xl:end
console.log(Function.prototype.call.name, Function.prototype.apply.name, Function.prototype.bind.name);
console.log(Object.prototype.toString.name, Object.prototype.hasOwnProperty.name);
console.log(Math.max.name, JSON.stringify(Math.max.name), Math.random.name);
