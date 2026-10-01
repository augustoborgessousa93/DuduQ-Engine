import { connectPenpot } from "./penpot-mcp-client.mjs";
const mcp=await connectPenpot();
try{
 const code=`const p=penpotUtils.getPageById('855af85f-faf4-8069-8008-a8e75a3255fd');const ids=['7b8032f1-73fc-8058-8008-aa6760962707','179c70ae-2ebb-806e-8008-b75e3fc9cd10'];const find=(n,id)=>{if(n.id===id)return n;for(const c of n.children||[]){const v=find(c,id);if(v)return v}return null};return ids.map(id=>{const n=find(p.root,id);return n?{id:n.id,name:n.name,type:n.type,x:n.x,y:n.y,width:n.width,height:n.height}:{id,error:'NOT_FOUND'}});`;
 const result=await mcp.execute(code);
 for(const item of result.content||[])if(item.type==="text")process.stdout.write(item.text+"\n");
}finally{await mcp.close()}
