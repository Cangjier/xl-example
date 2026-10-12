// xl:title catch 不带绑定（`catch {`）：照样接得住
// xl:judge stdout
// xl:end

try { throw new Error("x"); } catch { console.log("caught"); }
try { JSON.parse("{"); } catch { console.log("parse failed"); }
