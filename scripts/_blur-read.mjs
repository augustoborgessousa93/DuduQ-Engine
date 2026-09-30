import { connectPenpot } from "./penpot-mcp-client.mjs";
const mcp=await connectPenpot();
try { const r=await mcp.execute(`const b=penpotUtils.findShapeById("f51f6d2e-fdc0-80a2-8008-b57dc7f34011"),out=[];const w=n=>{if(n.id==="446dcf24-de1d-8065-8008-b5bba3c149cc")out.push({x:n.x-b.x,y:n.y-b.y});for(const c of n.children||[])w(c)};w(b);return {board:{x:b.x,y:b.y},out};`); console.log(JSON.stringify(r.content)); } finally {await mcp.close();}
