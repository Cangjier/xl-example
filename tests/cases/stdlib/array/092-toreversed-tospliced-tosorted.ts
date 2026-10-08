// xl:title ES2023 非变体数组方法：toReversed / toSorted / toSpliced / with
// xl:round 647
// xl:judge stdout
// xl:end

const xs = [3, 1, 2];
console.log(JSON.stringify(xs.toReversed()), JSON.stringify(xs.toSorted()), JSON.stringify(xs));
console.log(JSON.stringify(xs.toSpliced(1, 1, 9, 8)), JSON.stringify(xs));
console.log(JSON.stringify(xs.with(0, 7)), JSON.stringify(xs.with(-1, 5)));
console.log(JSON.stringify(xs));
