import{test,expect}from'@playwright/test';
test('serves React vault lock screen without writing data',async({page})=>{await page.goto('/recomp-fitness/react-v2/');await expect(page.getByRole('heading',{name:'RECOMP 2.0'})).toBeVisible();await expect(page.getByRole('button',{name:'解锁本地保险库'})).toBeVisible();expect(await page.evaluate(()=>localStorage.length)).toBe(0);});
test('caches app shell for offline reopen',async({browser})=>{const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage();await page.goto('/recomp-fitness/react-v2/');await expect(page.getByRole('heading',{name:'RECOMP 2.0'})).toBeVisible();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'RECOMP 2.0'})).toBeVisible();await context.close();});

test('unlocks a synthetic legacy vault, restores within the day, and honors manual lock',async({browser})=>{
 const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage(),password='synthetic-only password';
 await page.goto('/recomp-fitness/react-v2/');
 await page.evaluate(async(pass)=>{
  const enc=new TextEncoder(),salt=new Uint8Array(16).fill(7),iv=new Uint8Array(12).fill(9),aad=enc.encode('RECOMP|encrypted-vault|v2');
  const base=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
  const state={schema:2,profile:{},settings:{start:'2026-01-01'},measurements:[],workouts:{},nutrition:{}};
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},key,enc.encode(JSON.stringify(state)));
  const b64=(x:Uint8Array)=>btoa(String.fromCharCode(...x));
  localStorage.setItem('recomp.encrypted.v2',JSON.stringify({format:'recomp-encrypted-vault',version:2,kdf:'PBKDF2-SHA256',iterations:600000,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext))}));
 },password);
 await page.reload();await page.getByLabel('保险库密码').fill(password);await page.getByRole('button',{name:'解锁本地保险库'}).click();
 await expect(page.getByRole('heading',{name:'总览'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'总览'})).toBeVisible();
 await page.getByRole('button',{name:'锁定'}).click();await expect(page.getByLabel('保险库密码')).toBeVisible();
 await page.reload();await expect(page.getByRole('button',{name:'解锁本地保险库'})).toBeVisible();await context.close();
});
