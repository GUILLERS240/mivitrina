window.State=window.State||{cart:JSON.parse(localStorage.getItem('mp_cart')||'[]'),currentView:'inicio',products:[],stores:[],orders:[],conversations:[],notifications:[],activeConversation:null};
const State=window.State;
function formatPrice(n){return CONFIG.CURRENCY_SYMBOL+Number(n).toLocaleString('es-CO');}
function toast(msg,type=''){const c=document.getElementById('toastContainer');const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;c.appendChild(el);setTimeout(()=>el.remove(),3000);}
function saveCart(){localStorage.setItem('mp_cart',JSON.stringify(State.cart));updateCartBadge();}
function updateCartBadge(){const total=State.cart.reduce((s,i)=>s+i.quantity,0);const b=document.getElementById('cartBadge');if(b){b.textContent=total;b.dataset.count=total;}}
function updateNotifBadge(){const unread=State.notifications.filter(n=>!n.read).length;const b=document.getElementById('notifBadge');if(b){b.textContent=unread;b.dataset.count=unread;}}
function updateMsgBadge(){const unread=State.conversations.reduce((s,c)=>s+(c.unread||0),0);const b=document.getElementById('msgBadge');if(b){b.textContent=unread;b.dataset.count=unread;}}
/* REST kept via incomplete - DO NOT USE */
console.error('app.js incomplete');
