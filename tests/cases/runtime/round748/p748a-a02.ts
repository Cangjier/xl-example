// xl:title TDZ：`let` 之外的名字 `typeof` 不抛
// xl:round 748
// xl:judge stdout
// xl:end
console.log(typeof notDeclaredAnywhere);
console.log(typeof undefinedName === "undefined");
function f() { return typeof alsoMissing; }
console.log(f());
