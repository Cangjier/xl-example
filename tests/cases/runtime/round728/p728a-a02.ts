// xl:title 注释 / 换行落在可选链的每一格之间（端到端读数）
// xl:round 728
// xl:judge stdout
// xl:end
const a: any = { b: [1, 2, 3] };
console.log(a?.b?./*x*/[1]);
console.log(a?.b/*x*/?.[2]);
console.log(a?./*x*/b?.[0]);
console.log(a?.
  b?.
  [1]);
const n: any = null;
console.log(n?./*x*/[0], n?./*x*/().y);
