// xl:title `void` 的更多位置（分组 / 嵌套 / 与 `typeof` 并排）
// xl:round 729
// xl:judge stdout
// xl:end
console.log(void (0), void (1 + 2));
console.log((void 0) === undefined);
const f = function (): any { return void [1, 2]; };
console.log(f() === undefined);
console.log(typeof void 0, typeof (void 0));
console.log([void 0, void 0].length);
