// xl:title 稀疏与密集的传递：`concat` / `slice` / `splice` / 展开
// xl:round 750
// xl:judge stdout
// xl:end
const a: any[] = [1, , 3];
console.log(JSON.stringify(a.concat([4])), a.concat([4]).length);
console.log(JSON.stringify(a.slice()), a.slice().length, 1 in a.slice());
console.log(JSON.stringify([...a]), 1 in [...a]);
const b: any[] = [1, 2, 3];
const removed = b.splice(1, 1);
console.log(JSON.stringify(b), JSON.stringify(removed), b.length);
const c: any[] = [1, 2, 3, 4];
console.log(JSON.stringify(c.toSpliced(1, 2)), JSON.stringify(c));
console.log(JSON.stringify([1, 2].flatMap((v) => (v === 1 ? [, 9] : [v]))));
