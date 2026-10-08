// xl:title 数组迭代器的 `next()` 走到底之后的形状
// xl:round 737
// xl:judge stdout
// xl:end
const it = [1, 2].values();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()));
const kt = ["a"].keys();
console.log(JSON.stringify(kt.next()), JSON.stringify(kt.next()));
