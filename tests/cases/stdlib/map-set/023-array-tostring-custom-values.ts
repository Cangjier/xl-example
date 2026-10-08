// xl:title 数组 toString 走元素的 toString
// xl:judge stdout
// xl:end

class C {
  toString() {
    return "C!";
  }
}
console.log([new C(), 1].toString());
