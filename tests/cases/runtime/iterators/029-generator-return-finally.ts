// xl:title 生成器 return()：值、finally 与之后的 done
// xl:round 676
// xl:judge stdout
// xl:end

function* g() {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log("cleanup");
  }
  return "done";
}
const it = g();
console.log(it.next().value);
console.log(JSON.stringify(it.return("early")));
console.log(it.next().done);
