// xl:title JSON.parse 的三种顶层形态
// xl:round 291
// xl:judge stdout
// xl:end

const v = JSON.parse('{"a":1,"b":[true,null,"s"]}');
console.log(v.a, v.b.length, v.b[0], v.b[1], v.b[2]);
console.log(JSON.parse("5"), JSON.parse('"x"'), JSON.parse("null"));
