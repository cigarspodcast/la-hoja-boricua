
import {collectFolder,publishRequest,sha256} from "/home/user/tab/publish-cli.mjs";
const {files,skipped}=collectFolder(process.argv[2]);
const manifest=files.map(f=>({path:f.path,sha256:sha256(f.bytes)}));
const enc=files.map(f=>({path:f.path,content_base64:Buffer.from(f.bytes).toString("base64")}));
const body={slug:"lahojaboricua",title:"La Hoja Boricua v20",files:enc};
console.error("bytes",JSON.stringify(body).length,"skipped",skipped.length);
const r=await publishRequest("site.publish",body,{identity:{slug:"lahojaboricua",manifest}});
console.log(r.status, JSON.stringify(r.result).slice(0,2500));
