import {collectFolder} from "/home/user/tab/publish-cli.mjs";
const {files,skipped}=collectFolder(process.argv[2]);
const enc=files.map(f=>({path:f.path,content_base64:Buffer.from(f.bytes).toString("base64")}));
const body={slug:"lahojaboricua",title:"La Hoja Boricua v16",files:enc};
console.log("request_bytes",JSON.stringify(body).length,"files",files.length,"raw",files.reduce((a,f)=>a+f.bytes.length,0),"skipped",skipped.length, JSON.stringify(skipped).slice(0,300));
