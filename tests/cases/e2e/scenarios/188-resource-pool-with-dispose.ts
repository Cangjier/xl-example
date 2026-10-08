// xl:title 资源池：借出 / 归还 / 超时释放的顺序（不用 using）
// xl:round 653
// xl:judge stdout
// xl:end

class Pool {
  free: number[] = [1, 2];
  used: number[] = [];
  acquire(): number | null {
    const id = this.free.shift();
    if (id === undefined) return null;
    this.used.push(id);
    return id;
  }
  release(id: number): boolean {
    const at = this.used.indexOf(id);
    if (at < 0) return false;
    this.used.splice(at, 1);
    this.free.push(id);
    return true;
  }
}
const pool = new Pool();
const a = pool.acquire();
const b = pool.acquire();
console.log(a, b, pool.acquire(), pool.free.join(","), pool.used.join(","));
console.log(pool.release(a as number), pool.release(9), pool.free.join(","), pool.used.join(","));
