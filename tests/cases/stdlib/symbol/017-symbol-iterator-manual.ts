// xl:title 手动拿数组的 Symbol.iterator 再 next
// xl:round 304
// xl:judge stdout
// xl:end

const it = [10, 20][Symbol.iterator]();
console.log(it.next().value, it.next().value, it.next().done);
const s = "ab"[Symbol.iterator]();
console.log(s.next().value, s.next().value, s.next().done);
