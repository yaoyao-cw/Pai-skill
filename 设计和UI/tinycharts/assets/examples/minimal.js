/* the smallest useful sheet: a kettle that boils, on a board, with one guarded event. Copy it to start. */
const ST = {cold:'cold', heating:'heating', boiled:'boiled'};
function draw(seed){ begin(seed); OX = 700; OY = 560;
  title('a flowchart · statechart','One kettle');
  board(-40,-40,360,360,30,'#e3d8c2','#b9ab90');
  put(0,0,() => box(40,40,0,220,120,60,{left:'#c79a68',top:'#e2c899',marks:false,ink:1.2}));
  put(1,0,() => group('data-state="cold"',() => lifeTurn(150,100,60,[[30,0],[34,40],[16,62]],'#a6c2d0',{cap:'#3f3a39'})));
  put(2,0,() => group('id="steam" style="display:none" data-state="boiled"',() => { const c = P(150,100,140); out.push(`<path class="pulse" d="M${c[0]} ${c[1]}q-8 -16 0 -32q8 -16 0 -32" fill="none" stroke="#9aa3a6" stroke-width="3"/>`); }));
  put(3,0,() => label(72,980,'the kettle','cold until you switch it on',[150,100,90],'start'));
  finish(); }
function init(ctx){
  let at = 'cold', water = false; const $ = id => document.getElementById(id);
  const show = () => { $('steam').style.display = at === 'boiled' ? '' : 'none'; };
  ctx.say('Press Fill it, then Switch on.');
  ctx.button('fill it',() => { if (water) return ctx.say('It is full already.'); water = true; ctx.say('Filled with water from the tap.'); });
  ctx.button('switch on',() => { if (!water) return ctx.say('Not yet: an empty kettle must not be switched on.'); if (at !== 'cold') return ctx.say('It is on already.'); at = 'heating'; ctx.say('Switched on: the water starts to heat.'); setTimeout(() => { at = 'boiled'; show(); ctx.say('Boiled: the switch clicks off.'); },1500); });
  return { tick(t,dt){} };
}
