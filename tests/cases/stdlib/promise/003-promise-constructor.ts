// xl:title `new Promise(executor)`：同步跑执行器、resolve / reject
// xl:judge stdout
// xl:end

new Promise((resolve: any) => { console.log("executor"); resolve(5); }).then((v: any) => console.log("resolved", v));
new Promise((_resolve: any, reject: any) => reject("no")).catch((e: any) => console.log("rejected", e));
