import { connectPenpot } from "./penpot-mcp-client.mjs";
const mcp = await connectPenpot();
try {
  const code = `const p=penpotUtils.getPageById('855af85f-faf4-8069-8008-a8e75a3255fd');const ids=['41359e7a-2d9f-80d0-8008-bb00e14aa8f8','6b524fe0-a4ad-80a4-8008-bbb4f9e75e64'];const find=(n,id)=>{if(n.id===id)return n;for(const c of n.children||[]){const v=find(c,id);if(v)return v}return null};const out=[];for(const id of ids){const b=find(p.root,id);if(!b){out.push({id,error:'NOT_FOUND'});continue}const nodes=[];const walk=n=>{if(n!==b){const x=n.x-b.x,y=n.y-b.y;const inside=x<1366&&y<768&&x+n.width>0&&y+n.height>0;if(inside&&(/panel|sentence|image|option|slot|answer|word|instruction|question|alternative|confirm|continue|drag|arrasta/i.test(n.name||''))&&n.width<1300&&n.height<500)nodes.push({id:n.id,name:n.name,type:n.type,x:+x.toFixed(1),y:+y.toFixed(1),width:+n.width.toFixed(1),height:+n.height.toFixed(1),fontSize:n.fontSize,fontFamily:n.fontFamily});}for(const c of n.children||[])walk(c)};walk(b);out.push({id:b.id,name:b.name,rect:{x:0,y:0,width:b.width,height:b.height},nodes:nodes.slice(-80)})}return out;`;
  const read = await mcp.execute(code);
  for (const item of read.content || []) if (item.type === "text") process.stdout.write(item.text + "\n");
  for (const [id, name] of [["41359e7a-2d9f-80d0-8008-bb00e14aa8f8", "v11-3q-complete-live.png"], ["6b524fe0-a4ad-80a4-8008-bbb4f9e75e64", "v11-3q-order-live.png"]]) {
    const result = await mcp.exportShape({ shapeId: id, format: "png", mode: "shape", filePath: `C:/Users/augus/Downloads/workspace/artifacts/${name}` });
    for (const item of result.content || []) if (item.type === "text") process.stdout.write(`${name}: ${item.text}\n`);
  }
} finally { await mcp.close(); }
