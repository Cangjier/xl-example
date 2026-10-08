// xl:title 带标签的块与 break：跳出嵌套块
// xl:round 9
// xl:judge stdout
// xl:end

outer: {
  console.log("in");
  inner: {
    console.log("inner");
    break outer;
  }
  console.log("unreachable");
}
console.log("done");
