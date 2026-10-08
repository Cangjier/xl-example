// xl:title 标签的另外两面：带标签的循环、嵌套的标签块
// xl:judge stdout
// xl:end

let l2 = "";
loop: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) break loop;
    l2 += i + "" + j;
  }
}
console.log(l2);
let l3 = "";
two: {
  l3 += "x";
  inner: {
    l3 += "y";
    if (l3.length === 2) break two;
    l3 += "z";
  }
  l3 += "w";
}
console.log(l3);
