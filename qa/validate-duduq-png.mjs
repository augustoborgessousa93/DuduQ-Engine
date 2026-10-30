#!/usr/bin/env node
/**
 * Read-only PNG RGBA8 decoder/structural validator for DUDUQ candidates.
 * Rejects signature-only files, truncated chunks, bad CRC, un-decodable IDAT,
 * unsupported palette/interlace, fully transparent or opaque pictures.
 */
import {inflateSync} from 'node:zlib';
const signature=Buffer.from('89504e470d0a1a0a','hex');
const crcTable=Array.from({length:256},(_,i)=>{let x=i;for(let j=0;j<8;j++)x=(x&1)?(0xedb88320^(x>>>1)):(x>>>1);return x>>>0});
function crc(b){let v=0xffffffff;for(const z of b)v=crcTable[(v^z)&255]^(v>>>8);return (v^0xffffffff)>>>0}
function invalid(code){throw Error('DUDUQ_PNG_INVALID:'+code)}
export function validateDuduqRgbaPng(b){
 if(!Buffer.isBuffer(b)||b.length<70||!b.subarray(0,8).equals(signature))invalid('SIGNATURE_OR_TRUNCATED');
 if(b.length>80*1024*1024)invalid('FILE_TOO_LARGE');
 let offset=8,head=null,parts=[],seenIDAT=false,afterIDAT=false,seenIEND=false;
 while(offset<b.length){
  if(b.length-offset<12)invalid('TRUNCATED_CHUNK_HEADER');
  const size=b.readUInt32BE(offset),start=offset+8,end=start+size;
  if(size>80*1024*1024||end+4>b.length)invalid('CHUNK_LENGTH');
  const type=b.toString('ascii',offset+4,offset+8);
  if(!/^[A-Za-z]{4}$/.test(type))invalid('CHUNK_TYPE');
  if(b.readUInt32BE(end)!==crc(b.subarray(offset+4,end)))invalid('CRC_'+type);
  const data=b.subarray(start,end);
  if(!head&&type!=='IHDR')invalid('IHDR_NOT_FIRST');
  if(seenIDAT&&type!=='IDAT')afterIDAT=true;
  if(type==='IHDR'){
   if(head||size!==13)invalid('BAD_IHDR');
   const width=data.readUInt32BE(0),height=data.readUInt32BE(4);
   if(!width||!height||width>8192||height>8192||width*height>16e6)invalid('DIMENSIONS');
   if(data[8]!==8||data[9]!==6||data[10]!==0||data[11]!==0||data[12]!==0)invalid('NOT_RGBA8_NONINTERLACED');
   head={width,height};
  }else if(type==='IDAT'){
   if(!head||afterIDAT)invalid('IDAT_OUT_OF_ORDER');
   seenIDAT=true;parts.push(data);
  }else if(type==='IEND'){
   if(size!==0||!seenIDAT)invalid('BAD_IEND');
   seenIEND=true;offset=end+4;if(offset!==b.length)invalid('TRAILING_BYTES');break;
  }else if(!(type.charCodeAt(0)&32))invalid('UNKNOWN_CRITICAL_CHUNK_'+type);
  offset=end+4;
 }
 if(!head||!seenIDAT||!seenIEND)invalid('MISSING_REQUIRED_CHUNKS');
 const rowBytes=head.width*4,expected=head.height*(rowBytes+1);
 let decoded;
 try{decoded=inflateSync(Buffer.concat(parts),{maxOutputLength:expected+1})}catch{invalid('IDAT_ZLIB_DECODE')}
 if(decoded.length!==expected)invalid('BAD_DECODED_SIZE');
 let pos=0,prev=Buffer.alloc(rowBytes),transparent=0,opaque=0;
 for(let y=0;y<head.height;y++){
  const filter=decoded[pos++];if(filter>4)invalid('INVALID_FILTER');
  const row=Buffer.allocUnsafe(rowBytes);
  for(let x=0;x<rowBytes;x++){
   const a=x>=4?row[x-4]:0,up=prev[x],upperLeft=x>=4?prev[x-4]:0;
   let p=0;
   if(filter===1)p=a;
   else if(filter===2)p=up;
   else if(filter===3)p=(a+up)>>1;
   else if(filter===4){
    const v=a+up-upperLeft,da=Math.abs(v-a),db=Math.abs(v-up),dc=Math.abs(v-upperLeft);
    p=da<=db&&da<=dc?a:db<=dc?up:upperLeft;
   }
   row[x]=(decoded[pos++]+p)&255;
  }
  for(let x=3;x<rowBytes;x+=4){if(row[x]===0)transparent++;if(row[x]>=240)opaque++}
  prev=row;
 }
 if(transparent<head.width*head.height*0.001)invalid('NO_MEANINGFUL_TRANSPARENT_MARGIN');
 if(!opaque)invalid('NO_VISIBLE_SUBJECT');
 return {width:head.width,height:head.height,transparentPixels:transparent,opaquePixels:opaque,valid:true};
}
