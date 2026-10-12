import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSpec,canonicalJson} from '../src/engine.js';
import {document,renderExperiment} from '../src/render.js';
import {main,analysisDocument} from '../bin/counterplot.js';
import {ENGINE_SHA256,ANALYSIS_SHA256} from '../src/source.js';

test('CSP fingerprints match HTML-parsed newline normalization on Windows',()=>{
  const script='const a=1;\r\nconst b=2;\r\n',css='body {\r\ncolor: black;\r\n}';
  const html=document('Newline test','<main></main>',css,script);
  const actual=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.equal(actual.includes('\r'),false);
  assert.ok(html.includes(createHash('sha256').update(actual).digest('base64')));
  const style=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.ok(html.includes(createHash('sha256').update(style).digest('base64')));
});
test('portable analysis source is bundled, syntactically complete and permits only local blob workers',async()=>{
  const html=await renderExperiment(createSpec('classification'));
  assert.ok(html.includes('worker-src blob:'));
  assert.ok(html.includes("connect-src &#39;none&#39;"));
  assert.ok(html.includes(ENGINE_SHA256));assert.ok(html.includes(ANALYSIS_SHA256));
  const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(()=>new Function(code));
});
test('CLI sensitivity exports immutable input and both actual module fingerprints',async()=>{
  const root=await mkdtemp(join(tmpdir(),'counterplot-study-'));
  try{const input=join(root,'experiment.json'),out=join(root,'study.json');
    await main(['init','classification','--out',input]);
    await main(['sensitivity',input,'--out',out]);
    const result=JSON.parse(await readFile(out,'utf8'));
    assert.equal(result.format,'counterplot-analysis');assert.equal(result.analysisSha256,ANALYSIS_SHA256);
    assert.equal(result.engineSha256,ENGINE_SHA256);
    assert.equal(result.specSha256,createHash('sha256').update(canonicalJson(result.spec)).digest('hex'));
    assert.deepEqual(result,analysisDocument(result.spec,'sensitivity',{}));
  }finally{await rm(root,{recursive:true,force:true});}
});
