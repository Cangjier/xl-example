// xl:title `?.[` 与 `?.(`：注释 / 换行夹在 `?.` 与括号之间
// xl:round 728
// xl:judge stdout
// xl:end
const o: any = { arr: [10, 20], m() { return 5; } };
console.log(o?.["arr"]?.[1], o?.arr?.[0]);
console.log(o?. /*c*/ arr /*c*/ ?. /*c*/ [1]);
console.log(o?.
  arr?.
  [0]);
