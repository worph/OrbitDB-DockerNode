//const json = require('../dockflow.json');//NOTE this has to specifically be a require, not an import (otherwise it will chge the directory scructure in dist since it is outside of the src
import "dotenv/config";
import {DistributedDB} from "./DistributedDB.js";

console.log(`DB_NAME=${process.env.DB_NAME}`);
console.log(`DB_TYPE=${process.env.DB_TYPE}`);
console.log(`PORT=${process.env.PORT}`);
console.log(`HOST=${process.env.HOST}`);
console.log(`BOOTSTRAP=${process.env.BOOTSTRAP}`);


process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


(async ()=>{
    let ddht = new DistributedDB();
    await ddht.start()
})()