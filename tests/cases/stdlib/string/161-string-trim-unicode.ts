// xl:title `trim` 族吃的空白集合
// xl:round 691
// xl:judge stdout
// xl:end
console.log(JSON.stringify(" \t\n\u00a0x\u3000 ".trim()));
console.log(JSON.stringify("\ufeff y".trim()));
console.log("ab".codePointAt(1), String.fromCharCode(65, 66));
