import{test,expect}from'@playwright/test';import{readFile}from'node:fs/promises';
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

test('migrates synthetic legacy records into encrypted storage before clearing source',async({browser})=>{
 const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage();
 await page.goto('/recomp-fitness/react-v2/');
 await page.evaluate(()=>localStorage.setItem('recomp8week',JSON.stringify({measures:[{date:'2026-01-02',weight:72,waist:81}],workouts:[{date:'2026-01-03',day:5,title:'旧版训练',completed:1,entries:[{exercise:'卧推',sets:[{w:50,r:8,done:true}]}]}],food:{a:{date:'2026-01-02',kcal:1800,protein:120,memo:'测试'}}})));
 await page.reload();await expect(page.getByLabel('设置新保险库密码')).toBeVisible();await page.getByLabel('设置新保险库密码').fill('synthetic migration password');await page.getByRole('button',{name:'解锁本地保险库'}).click();await expect(page.getByRole('heading',{name:'总览'})).toBeVisible();
 const keys=await page.evaluate(()=>({legacy:localStorage.getItem('recomp8week'),vault:localStorage.getItem('recomp.encrypted.v2')}));
 expect(keys.legacy).toBeNull();expect(keys.vault).toContain('recomp-encrypted-vault');await context.close();
});

test('edits a real workout set and opens the nutrition catalog',async({browser})=>{
 const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage(),password='synthetic workflow password';
 let today='';
 await page.goto('/recomp-fitness/react-v2/');
 today=await page.evaluate(()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=(k:string)=>p.find(x=>x.type===k)?.value||'';return g('year')+'-'+g('month')+'-'+g('day')});
 await page.evaluate(async({pass,date})=>{
  const enc=new TextEncoder(),salt=new Uint8Array(16).fill(8),iv=new Uint8Array(12).fill(10),aad=enc.encode('RECOMP|encrypted-vault|v2');
  const base=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
  const state={schema:2,profile:{},settings:{start:date},measurements:[],workouts:{[date]:{date,title:'合成训练',day:4,items:[{name:'卧推',sets:[{w:50,r:8,done:true}]}]}},nutrition:{[date]:{date,entries:[{kcal:500,protein:30,fat:15,carbs:55,note:''},{kcal:null,protein:null,fat:null,carbs:null,note:''},{kcal:null,protein:null,fat:null,carbs:null,note:''},{kcal:null,protein:null,fat:null,carbs:null,note:''}],foodItems:[[],[],[],[]]}}};
  const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},key,enc.encode(JSON.stringify(state))),b64=(x:Uint8Array)=>btoa(String.fromCharCode(...x));
  localStorage.setItem('recomp.encrypted.v2',JSON.stringify({format:'recomp-encrypted-vault',version:2,kdf:'PBKDF2-SHA256',iterations:600000,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(bytes))}));
 },{pass:password,date:today});
 await page.reload();await page.getByLabel('保险库密码').fill(password);await page.getByRole('button',{name:'解锁本地保险库'}).click();
 await page.getByRole('button',{name:'训练',exact:true}).click();await expect(page.getByRole('heading',{name:'训练记录'})).toBeVisible();
 const summary=page.locator('details summary').filter({hasText:'卧推'});await expect(summary).toBeVisible();await expect(page.getByLabel('实际重量（kg）')).toBeHidden();await summary.click();await expect(page.getByLabel('实际重量（kg）')).toHaveValue('50');
 await page.getByLabel('实际次数').fill('9');const save=page.getByText('保存实际训练记录',{exact:true});await expect(save).toBeVisible();await save.click();await expect(page.getByRole('status')).toContainText('训练记录已加密保存');await page.getByRole('button',{name:'数据管理',exact:true}).click();const jsonWait=page.waitForEvent('download');await page.getByRole('button',{name:'导出训练记录（JSON）'}).click();const jsonDownload=await jsonWait;expect(jsonDownload.suggestedFilename()).toMatch(/^RECOMP_training_export_\d{4}-\d{2}-\d{2}\.json$/);const jsonText=await readFile((await jsonDownload.path())!,'utf8');const payload=JSON.parse(jsonText);expect(payload.format).toBe('recomp-training-export');expect(JSON.stringify(payload)).toContain('合成训练');expect(payload.records[0].items[0].sets[0].r).toBe(9);const csvWait=page.waitForEvent('download');await page.getByRole('button',{name:'导出训练记录（CSV）'}).click();const csvDownload=await csvWait;expect(csvDownload.suggestedFilename()).toMatch(/^RECOMP_training_export_\d{4}-\d{2}-\d{2}\.csv$/);const csvText=await readFile((await csvDownload.path())!,'utf8');expect(csvText.startsWith('\uFEFF')).toBeTruthy();expect(csvText).toContain('卧推');expect(csvText).toContain('","9",');
 await page.getByRole('button',{name:'饮食',exact:true}).click();await page.getByRole('button',{name:'食品数据库 / 添加食物'}).click();await expect(page.getByRole('heading',{name:'食品数据库与营养计算器'})).toBeVisible();const firstFood=page.locator('section[aria-label="食品数据库和营养计算器"] ul li').first();await expect(firstFood).toBeVisible();await firstFood.locator('button').first().click();await page.getByLabel('份量（g）').fill('150');await page.getByLabel('餐次').selectOption('1');await page.getByRole('button',{name:'添加到每日饮食'}).click();await expect(page.getByRole('status')).toContainText('已添加到当天餐次并加密保存');await page.getByRole('button',{name:'饮食记录',exact:true}).click();await expect(page.locator('section[aria-label="饮食记录"]')).toContainText('150 g');await page.getByRole('button',{name:'计划',exact:true}).click();await expect(page.locator('section[aria-label="训练计划"]')).toBeVisible();await expect(page.locator('section[aria-label="训练计划"]')).toContainText('系统默认计划');await expect(page.getByRole('alert')).toHaveCount(0);const plan={format:'recomp-training-plan',schema_version:1,plan_id:'synthetic-e2e-plan',plan_version:'1.0.0',name:'合成导入计划',goal:'端到端验证',duration_weeks:4,days:Array.from({length:7},(_,weekday)=>({weekday,day_id:'synthetic-day-'+weekday,name:weekday===0?'测试训练日':'恢复日',type:weekday===0?'strength':'rest',muscle_groups:weekday===0?['胸']:[],exercises:weekday===0?[{exercise_id:'synthetic-exercise',name:'测试动作',order:1,sets:2,reps:8,rest_seconds:60}]:[]}))};await page.getByLabel('导入训练计划 JSON').setInputFiles({name:'synthetic-plan.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});await expect(page.getByRole('heading',{name:'待导入计划预览'})).toBeVisible();await expect(page.locator('.plan-preview')).toContainText('合成导入计划');await page.getByRole('button',{name:'保存并启用'}).click();await expect(page.getByRole('status')).toContainText('计划已加密保存并启用');await expect(page.locator('section[aria-label="计划导入与版本管理"]')).toContainText('合成导入计划 · v1.0.0');await page.reload();await page.getByRole('button',{name:'计划',exact:true}).click();await expect(page.getByRole('heading',{name:'合成导入计划'})).toBeVisible();await context.close();
});
