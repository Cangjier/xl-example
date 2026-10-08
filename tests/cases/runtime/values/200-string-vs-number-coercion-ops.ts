// xl:title 运算符两侧的强制转换：+ - * / 与比较
// xl:round 371
// xl:judge stdout
// xl:end
console.log("1" + 1, "1" - 1, "3" * "2", "10" / "2", "5" % "2");
console.log(1 + "2" + 3, 1 + 2 + "3", "a" + null, "a" + undefined);
console.log([] + [], [] + {}, [1] + [2], [1, 2] + 3);
console.log("2" > 1, "2" > "10", 2 > "10", null >= 0, undefined >= 0);
console.log(true + true, false - 1, +true, +"", +" 1 ");
