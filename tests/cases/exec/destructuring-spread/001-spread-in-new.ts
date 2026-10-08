// xl:title 带展开的构造：`new C(...xs)`
// xl:judge stdout
// xl:end

class P { x = 0; y = 0; constructor(x: number, y: number) { this.x = x; this.y = y; } }
const args: [number, number] = [1, 2];
console.log(new P(...args).x, new P(...[3, 4]).y);
console.log(new Map([[1, 2]] as any).get(1));
