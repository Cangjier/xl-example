// xl:title 普通数组上这三格取不到（助手挂在迭代器自己身上）
// xl:round 725
// xl:judge stdout
// xl:end
const a: any = [1, 2, 3];
console.log(typeof a.take, typeof a.drop, typeof a.toArray);
console.log(typeof a.next, typeof a.values().next);
console.log(typeof a.values().take, typeof a.values().toArray, typeof [].drop);
