// xl:title 形参解构模式里的注释与数组解构的洞
// xl:judge stdout
// xl:end

function f(a = 1, /*c*/ { b } = { b: 2 }, /*c*/ [c] = [3]): number { return a + b + c }
console.log(f())
const [first, /*c*/ , third] = [1, 2, 3]
console.log(first, third)
const { /*c*/ } = { x: 1 }
console.log("ok")
