import { chromium } from 'playwright';
const BASE='http://localhost:4173/', CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', KEY='ninefold.save.v1';
const at=Math.floor(Date.now()/1000);
const save={v:1,at,startedAt:at-40*86400,realm:5,layer:4,qi:1e11,materials:5e6,wardenFell:false,
 levels:{technique:20,method:20,pills:20,cores:20},
 killed:{rat:140,hound:140,frog:140,serpent:60,mantis:60,bat:60,fox:1,ape:1,crane:1,tiger:1},
 worn:{},chest:[],unlocked:[],stance:null,sequence:[],tribulation:0,tribulationAt:0,tower:20,
 brewed:{body:0,bane:0,fortune:0},awakened:['feast','wolf','slaughter','platform'],
 met:[],metAt:at-12*3600,metPoints:0,seen:['guide','cap','cores','tower','gear','furnace','refine']};
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
const page=await b.newPage({viewport:{width:400,height:860}});
page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0,200)));
await page.route('**/assets/*.js',r=>r.abort()); await page.goto(BASE);
await page.evaluate(([k,s])=>{localStorage.clear();localStorage.setItem(k,JSON.stringify(s));},[KEY,save]);
await page.unroute('**/assets/*.js'); await page.goto(BASE);
await page.waitForSelector('nav.tabs button'); await page.waitForTimeout(1500);
for(let i=0;i<24;i++){const c=await page.$('.awaken .acard'); if(c){await c.click().catch(()=>{});await page.waitForTimeout(220);continue;}
  const e=await page.$('.help button.act, .help .xclose, .notice button, .scrim'); if(!e)break; await e.click().catch(()=>{}); await page.waitForTimeout(220);}
console.log('screen:', await page.getAttribute('.sheet','data-screen'));
console.log('meet card:', !!(await page.$('.meet')));
console.log('owes card:', !!(await page.$('.owes')));
console.log('tip:', await page.$eval('.tip', e=>e.textContent).catch(()=>'no tip'));
console.log('floating:', await page.$$eval('.notice,.help,.scrim,.shut,.awaken', es=>es.map(e=>e.className)));
console.log('picks:', await page.$$eval('.meet .pick', es => es.map(e => `${e.textContent} disabled=${e.disabled}`)).catch(()=>'none'));
const st = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
console.log('saved at', st.at, 'metAt', st.metAt, 'since', st.at - st.metAt, 'met', JSON.stringify(st.met));
await b.close();
