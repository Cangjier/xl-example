// xl:title delete 一个属性之后：`in`、keys、再 delete
// xl:judge stdout
// xl:end

const o: any = { a: 1, b: 2 };
console.log(delete o.a, "a" in o, Object.keys(o).join(","));
console.log(delete o.zzz, o.b);
delete o["b"];
console.log(Object.keys(o).length);
