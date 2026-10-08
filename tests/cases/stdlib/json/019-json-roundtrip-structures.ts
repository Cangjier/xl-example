// xl:title JSON 往返：形状与嵌套
// xl:round 291
// xl:judge stdout
// xl:end

const src = { n: 1, s: "x", b: true, z: null, arr: [1, [2]], obj: { k: "v" } };
const back = JSON.parse(JSON.stringify(src));
console.log(JSON.stringify(back) === JSON.stringify(src), back.arr[1][0], back.obj.k);
