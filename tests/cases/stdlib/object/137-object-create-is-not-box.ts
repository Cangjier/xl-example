// xl:title `Object.create(Number.prototype)` **不是**箱：标签该是 `Object`
// xl:round 690
// xl:judge stdout
// xl:why 认出「这是箱」的判据是**自有那一格 `__box` 在不在**（`UnwrapBox`），
//       不是「原型是不是 `Number.prototype`」——JS 里 `Object.create(Number.prototype)`
//       没有 `[[NumberData]]`，`Object.prototype.toString.call` 给它 `"[object Object]"`。
//       这一条钉住「照原型认」那条例外：它能把三族修对，也会把这一档答反。
// xl:end
const fake: any = Object.create(Number.prototype);
console.log(Object.prototype.toString.call(fake));
console.log("hasBox", fake.hasOwnProperty("__box"));
console.log("proto", Object.getPrototypeOf(fake) === Number.prototype);
