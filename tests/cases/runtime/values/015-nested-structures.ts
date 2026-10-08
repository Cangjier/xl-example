// xl:title 深层嵌套结构的读写与序列化
// xl:judge stdout
// xl:end

const cfg: any = { a: { b: { c: [1, { d: 2 }] } } };
console.log(cfg.a.b.c[1].d);
cfg.a.b.c[1].d = 9;
cfg.x = { y: [3, 4] };
console.log(cfg.a.b.c[1].d, cfg.x.y[1], JSON.stringify(cfg));
