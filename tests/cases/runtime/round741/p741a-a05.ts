// xl:title 可选调用接在**一元前缀**后面
// xl:round 741
// xl:judge stdout
// xl:end
const o: any = { m() { return 0; } };
console.log(!o?.m?.(), typeof o?.m, typeof o?.m?.());
console.log(void o?.m?.(), -o?.m?.());
