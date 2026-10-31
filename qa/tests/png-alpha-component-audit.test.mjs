#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {analyzeAlphaComponents} from '../png-alpha-component-audit.mjs';

const crcTable=Array.from({length:256},(_,i)=>{let value=i;for(let bit=0;bit<8;bit++)
  value=(value&1)?(0xedb88320^(value>>>1)):(value>>>1);return value>>>0;});
function crc(bytes){let value=0xffffffff;for(const byte of bytes)value=crcTable[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0;}
function chunk(type,data){
  const size=Buffer.alloc(4),tail=Buffer.alloc(4),body=Buffer.concat([Buffer.from(type),data]);
  size.writeUInt32BE(data.length);tail.writeUInt32BE(crc(body));
  return Buffer.concat([size,body,tail]);
}
function rgbaPng(width,height,visible){
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
  const pixels=Buffer.alloc(height*(width*4+1));let offset=0;
  for(let y=0;y<height;y++){
    pixels[offset++]=0;
    for(let x=0;x<width;x++){
      pixels[offset++]=40;pixels[offset++]=120;pixels[offset++]=230;
      pixels[offset++]=visible(x,y)?255:0;
    }
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),
    chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}

test('clean connected cutout has no secondary or micro alpha islands',()=>{
  const report=analyzeAlphaComponents(rgbaPng(32,32,(x,y)=>x>=8&&x<24&&y>=8&&y<24));
  assert.equal(report.componentCount,1);
  assert.equal(report.microOpaqueIslandCount,0);
});

test('two intentional large subjects remain visible in the raw audit without a false micro-artifact verdict',()=>{
  const report=analyzeAlphaComponents(rgbaPng(48,32,(x,y)=>(x>=5&&x<17&&y>=8&&y<24)||(x>=31&&x<43&&y>=8&&y<24)));
  assert.equal(report.componentCount,2);
  assert.equal(report.secondaryComponentCount,1);
  assert.equal(report.microOpaqueIslandCount,0);
});

test('detached opaque pixel cluster is reported as a micro alpha island',()=>{
  const report=analyzeAlphaComponents(rgbaPng(48,48,(x,y)=>(x>=12&&x<36&&y>=12&&y<36)||(x>=42&&x<44&&y>=42&&y<44)));
  assert.equal(report.componentCount,2);
  assert.equal(report.microOpaqueIslandCount,1);
  assert.equal(report.microOpaqueIslandPixels,4);
});
