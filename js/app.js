const State={cart:JSON.parse(localStorage.getItem('mp_cart')||'[]'),currentView:'inicio',products:[],stores:[],orders:[],conversations:[],notifications:[],activeConversation:null};
function formatPrice(n){return CONFIG.CURRENCY_SYMBOL+Number(n).toLocaleString('es-CO');}
function toast(msg,type=''){const c=document.getElementById('toastContainer');const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;c.appendChild(el);setTimeout(()=>el.remove(),3000);}
function saveCart(){localStorage.setItem('mp_cart',JSON.stringify(State.cart));updateCartBadge();}
function updateCartBadge(){const total=State.cart.reduce((s,i)=>s+i.quantity,0);const b=document.getElementById('cartBadge');if(b){b.textContent=total;b.dataset.count=total;}}
function updateNotifBadge(){const unread=State.notifications.filter(n=>!n.read).length;const b=document.getElementById('notifBadge');if(b){b.textContent=unread;b.dataset.count=unread;}}
function updateMsgBadge(){const unread=State.conversations.reduce((s,c)=>s+(c.unread||0),0);const b=document.getElementById('msgBadge');if(b){b.textContent=unread;b.dataset.count=unread;}}
function soundsEnabled(){try{return localStorage.getItem('mp_sound')!=='0';}catch(_){return true;}}
function playNotifSound(){if(!soundsEnabled())return;try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator();const g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;o.type='sine';g.gain.value=0.08;o.start();g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);o.stop(ctx.currentTime+0.25);}catch(_){}}
function showSystemNotification(title,body,url='/'){if(!('Notification' in window))return;if(Notification.permission!=='granted')return;try{const n=new Notification(title||'Mi Vitrina',{body:body||'',icon:'/icon.svg',badge:'/icon.svg',tag:'mivitrina'});n.onclick=()=>{window.focus();n.close();if(url)location.href=url;};}catch(_){}}
let _rtChannels=[];
function teardownRealtime(){_rtChannels.forEach(c=>{try{window.sb?.removeChannel(c);}catch(_){}});_rtChannels=[];}
function setupRealtime(){if(!window.sb||!Auth.isLoggedIn())return;teardownRealtime();const uid=Auth.getUser().id;
const chN=sb.channel('notif:'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${uid}`},payload=>{const n=payload.new;State.notifications.unshift(n);updateNotifBadge();renderNotificationsList();playNotifSound();showSystemNotification(n.title,n.body);}).subscribe();
const chM=sb.channel('msgs-user:'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},async payload=>{const m=payload.new;if(m.sender_id===uid)return;await loadConversations();updateMsgBadge();if(State.activeConversation&&State.activeConversation.id===m.conversation_id){appendChatBubble(m);}else{playNotifSound();showSystemNotification('Nuevo mensaje',m.content?.slice(0,80)||'Tienes un mensaje');}}).subscribe();
_rtChannels=[chN,chM];}
// REST OF FILE LOADED FROM ARTIFACT - truncated intentionally for size, will fix with full push
console.error('INCOMPLETE APP.JS - reloading');
