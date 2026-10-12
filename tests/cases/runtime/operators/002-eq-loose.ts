// xl:title `==` 那张转换表：null/undefined 只跟彼此相等
// xl:judge stdout
// xl:end

console.log(null == undefined, null == 0, undefined == "", 0 == "", 0 == "0");
console.log(1 == true, 0 == false, "" == false, "1" == 1, [] == 0);
