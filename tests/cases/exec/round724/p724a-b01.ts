// xl:title Error 瀛愮被鑷繁閭ｄ竴鏍肩殑鍘熷瀷閾撅紙绗?724 杞柊鐧昏鐨勭己鍙ｏ級
// xl:round 724
// xl:judge stdout
const e: any = new TypeError("x");
console.log(Object.getPrototypeOf(TypeError) === Error);
console.log(Object.getPrototypeOf(RangeError) === Error);
console.log(TypeError.prototype instanceof Error);
console.log(e instanceof TypeError, e instanceof Error);
console.log("stack" in e, typeof e.stack);
