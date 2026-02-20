<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VentasVE · Flujos Críticos</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Epilogue:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --bg:       #090c14;
  --bg2:      #0f1322;
  --surface:  #141929;
  --surface2: #1c2235;
  --surface3: #242840;
  --border:   rgba(255,255,255,0.07);
  --border2:  rgba(255,255,255,0.12);
  --text:     #e4e8f4;
  --text2:    #8892b0;
  --muted:    #4a5270;
  --accent:   #f5c842;
  --red:      #e8360e;
  --green:    #22c55e;
  --blue:     #4f8ef7;
  --purple:   #9b6dff;
  --wa:       #25d366;
}
*{margin:0;padding:0;box-sizing:border-box;}
body{
  background:var(--bg);color:var(--text);
  font-family:'Epilogue',sans-serif;
  min-height:100vh;overflow-x:hidden;
}

/* ─── SCREEN NAV ─────────────────────── */
.screen-nav{
  position:fixed;top:0;left:0;right:0;z-index:200;
  background:rgba(9,12,20,0.92);
  backdrop-filter:blur(16px);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:0;
  padding:0 20px;height:56px;
}
.logo{
  font-family:'Syne',sans-serif;font-weight:800;font-size:18px;
  margin-right:24px;letter-spacing:-.5px;
}
.logo span{color:var(--accent);}
.nav-tabs{display:flex;gap:2px;flex:1;}
.ntab{
  padding:8px 18px;border-radius:8px;font-size:13px;
  font-weight:500;cursor:pointer;color:var(--text2);
  transition:all .15s;white-space:nowrap;
  display:flex;align-items:center;gap:7px;
}
.ntab:hover{color:var(--text);background:var(--surface);}
.ntab.active{
  background:rgba(245,200,66,.12);
  color:var(--accent);font-weight:600;
}
.ntab-num{
  width:20px;height:20px;border-radius:6px;
  background:var(--surface2);font-size:10px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
  font-family:'Syne',sans-serif;
}
.ntab.active .ntab-num{background:var(--accent);color:#000;}

.screen{display:none;padding-top:56px;min-height:100vh;}
.screen.active{display:block;}

/* ═══════════════════════════════════════
   SCREEN 1 — CONFIRMACIÓN DE PEDIDO
═══════════════════════════════════════ */
#s1{
  background:
    radial-gradient(ellipse at 20% 0%, rgba(245,200,66,.07) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(79,142,247,.05) 0%, transparent 50%),
    var(--bg);
}
.s1-wrap{
  max-width:1100px;margin:0 auto;
  padding:40px 24px 80px;
  display:grid;grid-template-columns:1fr 420px;gap:28px;
  align-items:start;
}

/* SUCCESS HEADER */
.confirm-hero{
  grid-column:1/-1;
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:20px;padding:36px 40px;
  display:flex;align-items:center;gap:28px;
  position:relative;overflow:hidden;
  animation:slideDown .5s cubic-bezier(.34,1.2,.64,1) both;
}
@keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
.confirm-hero::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(34,197,94,.06) 0%,transparent 60%);
  pointer-events:none;
}
.success-ring{
  width:80px;height:80px;border-radius:50%;
  background:rgba(34,197,94,.15);
  border:2px solid rgba(34,197,94,.4);
  display:flex;align-items:center;justify-content:center;
  font-size:36px;flex-shrink:0;
  animation:popIn .6s cubic-bezier(.34,1.56,.64,1) .2s both;
  position:relative;
}
@keyframes popIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.success-ring::after{
  content:'';position:absolute;inset:-8px;
  border-radius:50%;border:2px solid rgba(34,197,94,.2);
  animation:ripple 2s ease infinite;
}
@keyframes ripple{
  0%{transform:scale(1);opacity:.6}
  100%{transform:scale(1.4);opacity:0}
}
.confirm-text{}
.confirm-tag{
  font-size:11px;font-weight:700;letter-spacing:.1em;
  color:var(--green);background:rgba(34,197,94,.12);
  padding:3px 10px;border-radius:5px;display:inline-block;margin-bottom:8px;
}
.confirm-title{
  font-family:'Syne',sans-serif;font-size:28px;font-weight:800;
  line-height:1.1;margin-bottom:6px;
}
.confirm-sub{font-size:14px;color:var(--text2);line-height:1.6;}
.confirm-id{
  margin-left:auto;text-align:right;flex-shrink:0;
}
.order-id{
  font-family:'Syne',sans-serif;font-size:32px;font-weight:800;
  color:var(--accent);letter-spacing:-1px;
}
.order-id-label{font-size:11px;color:var(--muted);margin-top:2px;}
.order-time{
  margin-top:8px;font-size:12px;color:var(--text2);
  background:var(--surface2);padding:4px 10px;border-radius:6px;
  border:1px solid var(--border2);
}

/* STATUS TRACKER */
.status-card{
  background:var(--surface);border:1px solid var(--border);
  border-radius:16px;overflow:hidden;
  animation:fadeUp .4s ease .1s both;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.card-head{
  padding:16px 20px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
}
.card-title{
  font-family:'Syne',sans-serif;font-weight:700;font-size:14px;
  display:flex;align-items:center;gap:8px;
}
.card-body{padding:20px;}

.status-track{
  display:flex;flex-direction:column;gap:0;
}
.track-step{
  display:flex;gap:16px;position:relative;
}
.track-step:not(:last-child)::after{
  content:'';position:absolute;left:17px;top:38px;
  width:2px;height:calc(100% - 14px);
  background:var(--border2);z-index:0;
}
.track-step.done::after{background:rgba(34,197,94,.4);}
.track-step.active::after{
  background:linear-gradient(180deg,rgba(245,200,66,.5),var(--border2));
}
.track-dot{
  width:36px;height:36px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:16px;flex-shrink:0;z-index:1;
  border:2px solid var(--border2);background:var(--surface2);
  transition:all .3s;
}
.track-step.done .track-dot{
  background:rgba(34,197,94,.15);border-color:var(--green);
}
.track-step.active .track-dot{
  background:rgba(245,200,66,.15);border-color:var(--accent);
  box-shadow:0 0 0 4px rgba(245,200,66,.1);
}
.track-info{padding:6px 0 24px;}
.track-name{font-size:14px;font-weight:600;margin-bottom:3px;}
.track-step.done .track-name{color:var(--green);}
.track-step.active .track-name{color:var(--accent);}
.track-step:not(.done):not(.active) .track-name{color:var(--muted);}
.track-time{font-size:11px;color:var(--muted);}
.track-step.active .track-time{color:var(--text2);}
.track-badge{
  display:inline-block;margin-top:4px;
  font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;
}
.tb-now{background:rgba(245,200,66,.15);color:var(--accent);}
.tb-done{background:rgba(34,197,94,.12);color:var(--green);}

/* ORDER SUMMARY */
.order-summary{
  animation:fadeUp .4s ease .15s both;
}
.order-item{
  display:flex;align-items:center;gap:12px;
  padding:12px 0;border-bottom:1px solid var(--border);
}
.order-item:last-child{border-bottom:none;}
.item-img{
  width:52px;height:52px;border-radius:12px;
  display:flex;align-items:center;justify-content:center;
  font-size:26px;background:var(--surface2);border:1px solid var(--border);
  flex-shrink:0;
}
.item-name{font-size:13px;font-weight:600;margin-bottom:3px;}
.item-meta{font-size:11px;color:var(--text2);}
.item-price{
  margin-left:auto;text-align:right;
  font-family:'Syne',sans-serif;font-size:15px;font-weight:700;
  color:var(--accent);flex-shrink:0;
}
.item-qty{font-size:11px;color:var(--text2);margin-top:2px;}

.summary-totals{margin-top:14px;border-top:1px solid var(--border);padding-top:14px;}
.tot-row{
  display:flex;justify-content:space-between;
  font-size:13px;color:var(--text2);margin-bottom:7px;
}
.tot-final{
  display:flex;justify-content:space-between;
  font-family:'Syne',sans-serif;font-size:20px;font-weight:800;
  padding-top:10px;border-top:1px dashed var(--border2);margin-top:4px;
}
.tot-final span:last-child{color:var(--accent);}

/* PAYMENT DETAIL CARD */
.pay-detail-card{
  background:var(--surface2);border-radius:12px;padding:16px;
  border:1px solid var(--border2);margin-top:16px;
}
.pd-row{
  display:flex;align-items:center;gap:10px;margin-bottom:8px;
}
.pd-row:last-child{margin-bottom:0;}
.pd-icon{font-size:20px;width:32px;text-align:center;}
.pd-label{font-size:11px;color:var(--muted);}
.pd-value{font-size:14px;font-weight:600;}
.copy-btn{
  margin-left:auto;font-size:11px;padding:3px 10px;
  background:var(--surface3);border:1px solid var(--border2);
  border-radius:6px;cursor:pointer;color:var(--text2);
  transition:all .15s;
}
.copy-btn:hover{color:var(--accent);border-color:var(--accent);}

/* ACTIONS */
.confirm-actions{
  grid-column:1/-1;
  display:flex;gap:12px;flex-wrap:wrap;
  animation:fadeUp .4s ease .3s both;
}
.action-btn{
  padding:13px 24px;border-radius:12px;font-size:14px;
  font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;
  font-family:'Syne',sans-serif;transition:all .2s;
}
.ab-wa{background:var(--wa);color:#fff;box-shadow:0 4px 16px rgba(37,211,102,.35);}
.ab-wa:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,211,102,.45);}
.ab-track{background:var(--surface);border:1px solid var(--border2);color:var(--text);}
.ab-track:hover{border-color:var(--accent);color:var(--accent);}
.ab-new{background:var(--accent);color:#000;box-shadow:0 4px 16px rgba(245,200,66,.3);}
.ab-new:hover{transform:translateY(-2px);}

/* ═══════════════════════════════════════
   SCREEN 2 — FLUJO DE PAGO PASO A PASO
═══════════════════════════════════════ */
#s2{
  background:
    radial-gradient(ellipse at 90% 10%, rgba(79,142,247,.07) 0%, transparent 50%),
    radial-gradient(ellipse at 10% 90%, rgba(155,109,255,.05) 0%, transparent 50%),
    var(--bg);
  display:none;
}
#s2.active{display:block;}

.s2-wrap{
  max-width:860px;margin:0 auto;
  padding:40px 24px 80px;
}

/* STEP INDICATOR */
.step-indicator{
  display:flex;align-items:center;justify-content:center;
  gap:0;margin-bottom:40px;
  animation:fadeUp .4s ease both;
}
.si-step{
  display:flex;align-items:center;gap:0;
}
.si-dot{
  width:38px;height:38px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:'Syne',sans-serif;font-size:14px;font-weight:800;
  border:2px solid var(--border2);background:var(--surface2);
  color:var(--muted);transition:all .4s cubic-bezier(.34,1.2,.64,1);
  position:relative;z-index:1;
}
.si-step.done .si-dot{
  background:rgba(34,197,94,.15);border-color:var(--green);color:var(--green);
}
.si-step.active .si-dot{
  background:var(--accent);border-color:var(--accent);
  color:#000;box-shadow:0 0 0 6px rgba(245,200,66,.15);
}
.si-label{
  font-size:11px;font-weight:600;color:var(--muted);
  position:absolute;top:44px;left:50%;transform:translateX(-50%);
  white-space:nowrap;letter-spacing:.03em;
  transition:color .3s;
}
.si-step.active .si-label{color:var(--accent);}
.si-step.done .si-label{color:var(--green);}
.si-dot-wrap{position:relative;}
.si-line{
  width:80px;height:2px;background:var(--border2);
  transition:background .4s;
  margin:0 -1px;position:relative;z-index:0;
}
.si-line.filled{background:linear-gradient(90deg,var(--green),rgba(34,197,94,.4));}

/* PAYMENT STEP PANELS */
.pay-step{display:none;animation:stepIn .35s cubic-bezier(.34,1.1,.64,1) both;}
.pay-step.active{display:block;}
@keyframes stepIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes stepBack{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
.pay-step.back{animation:stepBack .35s cubic-bezier(.34,1.1,.64,1) both;}

.step-card{
  background:var(--surface);border:1px solid var(--border);
  border-radius:20px;overflow:hidden;
  box-shadow:0 8px 40px rgba(0,0,0,.3);
}
.step-card-head{
  padding:24px 28px 20px;
  border-bottom:1px solid var(--border);
  display:flex;align-items:flex-start;gap:14px;
}
.step-num-badge{
  width:44px;height:44px;border-radius:12px;
  background:var(--accent);display:flex;align-items:center;justify-content:center;
  font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#000;
  flex-shrink:0;
}
.step-head-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:4px;}
.step-head-sub{font-size:13px;color:var(--text2);}
.step-card-body{padding:28px;}

/* AMOUNT DISPLAY */
.amount-display{
  text-align:center;padding:28px;
  background:var(--surface2);border-radius:16px;
  margin-bottom:24px;position:relative;overflow:hidden;
}
.amount-display::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 0%,rgba(245,200,66,.08),transparent 70%);
}
.amount-tag{
  font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--muted);
  margin-bottom:10px;text-transform:uppercase;
}
.amount-usd{
  font-family:'Syne',sans-serif;font-size:52px;font-weight:800;
  color:var(--accent);line-height:1;margin-bottom:6px;
  position:relative;
}
.amount-bs{font-size:16px;color:var(--text2);}
.amount-items{
  margin-top:14px;padding-top:14px;border-top:1px dashed var(--border2);
  display:flex;gap:6px;justify-content:center;flex-wrap:wrap;
}
.amount-chip{
  font-size:11px;padding:3px 10px;background:var(--surface3);
  border-radius:20px;color:var(--text2);border:1px solid var(--border);
}

/* METHOD SELECTOR */
.method-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px;}
.method-opt{
  border:2px solid var(--border2);border-radius:14px;padding:16px;
  cursor:pointer;transition:all .2s;background:var(--surface2);
  display:flex;align-items:center;gap:12px;
}
.method-opt:hover{border-color:var(--border2);transform:translateY(-1px);}
.method-opt.selected{border-color:var(--accent);background:rgba(245,200,66,.06);}
.method-opt.selected .m-radio{background:var(--accent);border-color:var(--accent);}
.method-opt.selected .m-radio::after{display:block;}
.m-icon{font-size:24px;flex-shrink:0;}
.m-name{font-size:13px;font-weight:700;}
.m-detail{font-size:11px;color:var(--text2);margin-top:1px;}
.m-radio{
  width:18px;height:18px;border-radius:50%;
  border:2px solid var(--border2);margin-left:auto;flex-shrink:0;
  position:relative;transition:all .2s;
}
.m-radio::after{
  content:'';display:none;position:absolute;
  top:3px;left:3px;width:8px;height:8px;
  border-radius:50%;background:#000;
}

/* PAYMENT INSTRUCTIONS */
.pay-instruction{
  background:var(--surface2);border-radius:14px;
  border:1px solid var(--border2);overflow:hidden;
  margin-bottom:20px;
}
.pi-head{
  padding:14px 18px;
  background:rgba(245,200,66,.08);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:10px;
  font-size:13px;font-weight:700;color:var(--accent);
}
.pi-body{padding:18px;}
.pi-row{
  display:flex;align-items:center;gap:12px;
  padding:10px 0;border-bottom:1px solid var(--border);
}
.pi-row:last-child{border-bottom:none;}
.pi-label{font-size:11px;color:var(--muted);width:90px;flex-shrink:0;}
.pi-value{font-size:14px;font-weight:600;flex:1;}
.pi-copy{
  font-size:11px;padding:4px 10px;
  background:var(--surface3);border:1px solid var(--border2);
  border-radius:6px;cursor:pointer;color:var(--text2);
  transition:all .15s;flex-shrink:0;
}
.pi-copy:hover{color:var(--accent);border-color:var(--accent);}
.pi-copy.copied{color:var(--green);border-color:var(--green);}

/* UPLOAD COMPROBANTE */
.upload-area{
  border:2px dashed var(--border2);border-radius:14px;
  padding:32px;text-align:center;cursor:pointer;
  transition:all .2s;margin-bottom:20px;
}
.upload-area:hover,.upload-area.dragover{
  border-color:var(--accent);background:rgba(245,200,66,.04);
}
.upload-area.has-file{
  border-color:var(--green);border-style:solid;
  background:rgba(34,197,94,.04);
}
.upload-icon{font-size:40px;margin-bottom:10px;}
.upload-title{font-size:14px;font-weight:600;margin-bottom:4px;}
.upload-sub{font-size:12px;color:var(--muted);}
.upload-preview{display:none;align-items:center;gap:12px;justify-content:center;}
.upload-area.has-file .upload-default{display:none;}
.upload-area.has-file .upload-preview{display:flex;}
.preview-thumb{font-size:36px;}
.preview-name{font-size:13px;font-weight:600;color:var(--green);}
.preview-size{font-size:11px;color:var(--muted);}

/* CONFIRMATION CHECKLIST */
.checklist{margin-bottom:24px;}
.check-item{
  display:flex;align-items:flex-start;gap:12px;
  padding:12px 0;border-bottom:1px solid var(--border);
}
.check-item:last-child{border-bottom:none;}
.ci-box{
  width:22px;height:22px;border-radius:6px;
  border:2px solid var(--border2);flex-shrink:0;margin-top:1px;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:all .2s;
}
.ci-box.checked{background:var(--green);border-color:var(--green);}
.ci-box.checked::after{content:'✓';font-size:12px;font-weight:800;color:white;}
.ci-text{font-size:13px;line-height:1.5;}
.ci-text strong{color:var(--accent);}

/* STEP NAV BUTTONS */
.step-nav{
  display:flex;align-items:center;gap:12px;
  padding:0 28px 28px;
}
.btn-back{
  padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;
  background:var(--surface2);color:var(--text2);cursor:pointer;
  border:1px solid var(--border2);transition:all .15s;
  font-family:'Syne',sans-serif;
}
.btn-back:hover{color:var(--text);}
.btn-next{
  flex:1;padding:14px;border-radius:12px;font-size:15px;font-weight:800;
  background:var(--accent);color:#000;cursor:pointer;
  font-family:'Syne',sans-serif;transition:all .2s;
  display:flex;align-items:center;justify-content:center;gap:8px;
  box-shadow:0 6px 20px rgba(245,200,66,.3);
}
.btn-next:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(245,200,66,.4);}
.btn-next:disabled{opacity:.4;cursor:not-allowed;transform:none;}
.btn-next.green{background:var(--green);box-shadow:0 6px 20px rgba(34,197,94,.3);}

/* SUCCESS FINAL */
.payment-success{
  text-align:center;padding:48px 28px;
}
.big-check{
  width:100px;height:100px;border-radius:50%;margin:0 auto 20px;
  background:rgba(34,197,94,.12);border:2px solid rgba(34,197,94,.4);
  display:flex;align-items:center;justify-content:center;font-size:48px;
  animation:popIn .6s cubic-bezier(.34,1.56,.64,1) both;
}
.ps-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;margin-bottom:8px;}
.ps-sub{font-size:14px;color:var(--text2);line-height:1.6;margin-bottom:28px;}
.ps-id{
  display:inline-block;font-family:'Syne',sans-serif;
  font-size:22px;font-weight:800;color:var(--accent);
  background:rgba(245,200,66,.1);padding:10px 24px;border-radius:12px;
  border:1px solid rgba(245,200,66,.25);margin-bottom:28px;
}

/* ═══════════════════════════════════════
   SCREEN 3 — CHATBOT PANEL
═══════════════════════════════════════ */
#s3{
  background:
    radial-gradient(ellipse at 30% 0%, rgba(155,109,255,.07) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 100%, rgba(37,211,102,.05) 0%, transparent 50%),
    var(--bg);
  display:none;
}
#s3.active{display:grid;grid-template-columns:340px 1fr;height:calc(100vh - 56px);}

/* CHAT SIDEBAR */
.chat-sidebar{
  background:var(--bg2);border-right:1px solid var(--border);
  display:flex;flex-direction:column;overflow:hidden;
}
.cs-head{
  padding:20px 18px 14px;border-bottom:1px solid var(--border);
}
.cs-title{
  font-family:'Syne',sans-serif;font-weight:800;font-size:16px;
  margin-bottom:4px;display:flex;align-items:center;gap:8px;
}
.bot-live{
  width:8px;height:8px;background:var(--green);border-radius:50%;
  animation:blink 1.5s ease infinite;
}
@keyframes blink{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}50%{box-shadow:0 0 0 5px rgba(34,197,94,0)}}
.cs-sub{font-size:12px;color:var(--text2);}
.cs-filter{
  display:flex;gap:4px;padding:10px 18px;border-bottom:1px solid var(--border);
}
.cf-pill{
  flex:1;padding:6px 10px;border-radius:7px;font-size:11px;font-weight:600;
  text-align:center;cursor:pointer;color:var(--muted);transition:all .15s;
}
.cf-pill.active{background:var(--surface2);color:var(--text);}

.chat-list{flex:1;overflow-y:auto;padding:8px;}
.chat-list::-webkit-scrollbar{width:4px;}
.chat-list::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}

.cl-item{
  display:flex;align-items:center;gap:10px;
  padding:10px 10px;border-radius:10px;cursor:pointer;
  transition:background .15s;margin-bottom:2px;position:relative;
}
.cl-item:hover{background:var(--surface);}
.cl-item.active{background:var(--surface);border-left:3px solid var(--accent);}
.cl-item.active{padding-left:7px;}
.cl-avatar{
  width:42px;height:42px;border-radius:12px;
  background:var(--surface2);display:flex;align-items:center;
  justify-content:center;font-size:18px;flex-shrink:0;
  position:relative;border:1px solid var(--border);
}
.cl-src{
  position:absolute;bottom:-3px;right:-3px;
  width:15px;height:15px;border-radius:4px;
  display:flex;align-items:center;justify-content:center;
  font-size:8px;border:1.5px solid var(--bg2);
}
.src-wa{background:#25d366;}
.src-ig{background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);}
.src-web{background:#4f8ef7;}
.cl-info{flex:1;min-width:0;}
.cl-name{font-size:13px;font-weight:600;margin-bottom:2px;}
.cl-preview{font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cl-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;}
.cl-time{font-size:10px;color:var(--muted);}
.cl-badge{
  min-width:18px;height:18px;background:var(--red);border-radius:9px;
  font-size:10px;font-weight:800;color:white;
  display:flex;align-items:center;justify-content:center;padding:0 4px;
}
.cl-badge.bot{background:var(--purple);}
.cl-badge.ok{background:var(--green);}

/* BOT STATUS TAG */
.cl-bot-tag{
  font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;
  letter-spacing:.03em;margin-top:2px;display:inline-block;
}
.bt-auto{background:rgba(155,109,255,.15);color:var(--purple);}
.bt-human{background:rgba(245,200,66,.12);color:var(--accent);}
.bt-done{background:rgba(34,197,94,.12);color:var(--green);}

/* CHAT MAIN */
.chat-main{display:flex;flex-direction:column;overflow:hidden;}

.chat-topbar{
  background:var(--bg2);border-bottom:1px solid var(--border);
  padding:14px 20px;display:flex;align-items:center;gap:14px;
  flex-shrink:0;
}
.ct-avatar{
  width:40px;height:40px;border-radius:12px;
  background:var(--surface2);display:flex;align-items:center;
  justify-content:center;font-size:18px;
  border:1px solid var(--border);
}
.ct-name{font-size:14px;font-weight:700;}
.ct-status{font-size:11px;color:var(--green);margin-top:1px;display:flex;align-items:center;gap:4px;}
.ct-actions{margin-left:auto;display:flex;gap:8px;}
.ct-btn{
  width:34px;height:34px;border-radius:9px;
  background:var(--surface);border:1px solid var(--border);
  display:flex;align-items:center;justify-content:center;
  font-size:15px;cursor:pointer;transition:all .15s;
}
.ct-btn:hover{border-color:var(--accent);}

/* BOT STATUS BAR */
.bot-bar{
  padding:8px 20px;background:rgba(155,109,255,.06);
  border-bottom:1px solid rgba(155,109,255,.15);
  display:flex;align-items:center;gap:8px;
  font-size:12px;color:var(--purple);flex-shrink:0;
}
.bb-dot{width:6px;height:6px;background:var(--purple);border-radius:50%;}
.bb-toggle{
  margin-left:auto;font-size:11px;padding:3px 10px;
  background:rgba(155,109,255,.15);border:1px solid rgba(155,109,255,.3);
  border-radius:6px;cursor:pointer;font-weight:600;
}

/* MESSAGES */
.messages-area{
  flex:1;overflow-y:auto;padding:20px;
  display:flex;flex-direction:column;gap:4px;
}
.messages-area::-webkit-scrollbar{width:4px;}
.messages-area::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}

.msg-group{margin-bottom:12px;}
.msg-date{
  text-align:center;font-size:11px;color:var(--muted);
  margin:12px 0 8px;
}
.msg{
  display:flex;align-items:flex-end;gap:8px;margin-bottom:3px;
}
.msg.out{flex-direction:row-reverse;}
.msg-avatar{
  width:28px;height:28px;border-radius:8px;
  background:var(--surface2);display:flex;align-items:center;
  justify-content:center;font-size:13px;flex-shrink:0;
  border:1px solid var(--border);
}
.msg-bubble{
  max-width:70%;padding:10px 14px;border-radius:14px;
  font-size:13px;line-height:1.5;position:relative;
}
.msg.in .msg-bubble{
  background:var(--surface2);border:1px solid var(--border);
  border-bottom-left-radius:4px;
}
.msg.out .msg-bubble{
  background:rgba(245,200,66,.12);border:1px solid rgba(245,200,66,.2);
  color:var(--text);border-bottom-right-radius:4px;
}
.msg.bot .msg-bubble{
  background:rgba(155,109,255,.1);border:1px solid rgba(155,109,255,.2);
  border-bottom-left-radius:4px;
}
.msg-time{font-size:10px;color:var(--muted);margin-top:3px;display:flex;align-items:center;gap:4px;}
.msg.out .msg-time{justify-content:flex-end;}
.msg-check{color:var(--blue);font-size:12px;}

/* BOT QUICK REPLIES */
.quick-replies{
  display:flex;gap:8px;flex-wrap:wrap;padding:0 0 10px 36px;
}
.qr{
  padding:6px 14px;background:var(--surface2);
  border:1px solid rgba(155,109,255,.3);border-radius:20px;
  font-size:12px;font-weight:500;color:var(--purple);
  cursor:pointer;transition:all .15s;
}
.qr:hover{background:rgba(155,109,255,.12);border-color:var(--purple);}

/* TYPING INDICATOR */
.typing-indicator{
  display:flex;align-items:center;gap:8px;padding:6px 0;
}
.typing-dots{display:flex;gap:4px;align-items:center;}
.td{
  width:7px;height:7px;border-radius:50%;background:var(--muted);
  animation:dot .8s ease infinite;
}
.td:nth-child(2){animation-delay:.16s;}
.td:nth-child(3){animation-delay:.32s;}
@keyframes dot{0%,80%,100%{transform:scale(1);opacity:.5}40%{transform:scale(1.3);opacity:1}}
.typing-label{font-size:11px;color:var(--muted);}

/* ORDER CARD IN CHAT */
.order-bubble{
  max-width:300px;
  background:var(--surface);border:1px solid var(--border2);
  border-radius:14px;overflow:hidden;margin-left:36px;margin-bottom:8px;
}
.ob-head{
  padding:12px 14px;background:rgba(34,197,94,.08);
  border-bottom:1px solid var(--border);
  font-size:12px;font-weight:700;color:var(--green);
  display:flex;align-items:center;gap:6px;
}
.ob-body{padding:12px 14px;}
.ob-item{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;}
.ob-total{
  display:flex;justify-content:space-between;
  font-family:'Syne',sans-serif;font-size:15px;font-weight:800;
  padding-top:8px;border-top:1px dashed var(--border2);margin-top:4px;
}
.ob-total span:last-child{color:var(--accent);}

/* PAYMENT CONFIRM IN CHAT */
.pay-bubble{
  max-width:280px;
  background:var(--surface);border:1px solid rgba(79,142,247,.3);
  border-radius:14px;overflow:hidden;margin-left:36px;margin-bottom:8px;
}
.pb-head{
  padding:12px 14px;background:rgba(79,142,247,.08);
  border-bottom:1px solid var(--border);
  font-size:12px;font-weight:700;color:var(--blue);
  display:flex;align-items:center;gap:6px;
}
.pb-body{padding:12px 14px;font-size:12px;}
.pb-ref{
  font-family:'Syne',sans-serif;font-size:14px;font-weight:700;
  color:var(--text);margin-top:6px;
  background:var(--surface2);padding:6px 10px;border-radius:8px;
  display:flex;justify-content:space-between;align-items:center;
}

/* CHAT INPUT */
.chat-input-area{
  padding:14px 20px;border-top:1px solid var(--border);
  background:var(--bg2);flex-shrink:0;
}
.chat-input-row{
  display:flex;gap:10px;align-items:center;
  background:var(--surface);border:1.5px solid var(--border2);
  border-radius:14px;padding:8px 12px;
  transition:border-color .2s;
}
.chat-input-row:focus-within{border-color:rgba(155,109,255,.5);}
.chat-input{
  flex:1;background:transparent;border:none;outline:none;
  font-family:'Epilogue',sans-serif;font-size:14px;color:var(--text);
  resize:none;max-height:100px;overflow-y:auto;
}
.chat-input::placeholder{color:var(--muted);}
.input-actions{display:flex;gap:6px;align-items:center;}
.ia-btn{
  width:32px;height:32px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:16px;cursor:pointer;color:var(--text2);
  transition:all .15s;
}
.ia-btn:hover{color:var(--text);}
.send-btn{
  width:36px;height:36px;border-radius:10px;
  background:var(--accent);display:flex;align-items:center;
  justify-content:center;font-size:16px;cursor:pointer;
  transition:all .15s;box-shadow:0 3px 10px rgba(245,200,66,.3);
}
.send-btn:hover{transform:scale(1.07);}

/* BOT STATS PANEL */
.bot-stats-panel{
  padding:14px 18px;border-top:1px solid var(--border);
  background:var(--bg2);flex-shrink:0;
}
.bsp-title{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--muted);margin-bottom:10px;}
.bsp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.bsp-stat{
  background:var(--surface);border-radius:10px;padding:10px;
  text-align:center;border:1px solid var(--border);
}
.bsp-num{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;}
.bsp-label{font-size:10px;color:var(--muted);margin-top:2px;}

/* RESPONSIVE */
@media(max-width:900px){
  #s3.active{grid-template-columns:1fr;height:auto;}
  .chat-sidebar{height:300px;}
  .s1-wrap{grid-template-columns:1fr;gap:18px;}
  .confirm-hero{flex-direction:column;text-align:center;}
  .confirm-id{margin-left:0;text-align:center;}
  .method-grid{grid-template-columns:1fr;}
  .step-indicator{gap:0;overflow-x:auto;}
  .si-line{width:40px;}
}
</style>
</head>
<body>

<!-- SCREEN NAV -->
<nav class="screen-nav">
  <div class="logo">Ventas<span>VE</span></div>
  <div class="nav-tabs">
    <div class="ntab active" onclick="showScreen(1,this)">
      <div class="ntab-num">1</div> Confirmación de Pedido
    </div>
    <div class="ntab" onclick="showScreen(2,this)">
      <div class="ntab-num">2</div> Flujo de Pago
    </div>
    <div class="ntab" onclick="showScreen(3,this)">
      <div class="ntab-num">3</div> Panel ChatBot IA
    </div>
  </div>
</nav>

<!-- ════════════════════════════════════
  SCREEN 1: CONFIRMACIÓN DE PEDIDO
════════════════════════════════════ -->
<div class="screen active" id="s1">
  <div class="s1-wrap">

    <!-- HERO -->
    <div class="confirm-hero">
      <div class="success-ring">✅</div>
      <div class="confirm-text">
        <div class="confirm-tag">PEDIDO RECIBIDO</div>
        <div class="confirm-title">¡Tu pedido está<br>confirmado!</div>
        <div class="confirm-sub">Hemos recibido tu pedido. El vendedor lo está preparando<br>y te notificará por WhatsApp cuando esté listo para envío.</div>
      </div>
      <div class="confirm-id">
        <div class="order-id">#1044</div>
        <div class="order-id-label">Número de pedido</div>
        <div class="order-time">📅 17 Feb 2026 · 10:42 AM</div>
      </div>
    </div>

    <!-- LEFT COLUMN -->
    <div style="display:flex;flex-direction:column;gap:20px;animation:fadeUp .4s ease .1s both">

      <!-- STATUS TRACKER -->
      <div class="status-card">
        <div class="card-head">
          <div class="card-title">📍 Estado del Pedido</div>
          <div style="font-size:11px;color:var(--text2)">Actualización automática</div>
        </div>
        <div class="card-body">
          <div class="status-track">
            <div class="track-step done">
              <div class="track-dot">✓</div>
              <div class="track-info">
                <div class="track-name">Pedido recibido</div>
                <div class="track-time">10:42 AM · Hace 2 minutos</div>
                <span class="track-badge tb-done">Completado</span>
              </div>
            </div>
            <div class="track-step done">
              <div class="track-dot">✓</div>
              <div class="track-info">
                <div class="track-name">Pago verificado</div>
                <div class="track-time">10:44 AM · Comprobante recibido</div>
                <span class="track-badge tb-done">Verificado</span>
              </div>
            </div>
            <div class="track-step active">
              <div class="track-dot">📦</div>
              <div class="track-info">
                <div class="track-name">En preparación</div>
                <div class="track-time">Tiempo estimado: 30–45 min</div>
                <span class="track-badge tb-now">En proceso</span>
              </div>
            </div>
            <div class="track-step">
              <div class="track-dot" style="font-size:14px">🚴</div>
              <div class="track-info">
                <div class="track-name">En camino</div>
                <div class="track-time">Estimado: 12:00 PM – 1:00 PM</div>
              </div>
            </div>
            <div class="track-step">
              <div class="track-dot" style="font-size:14px">🏠</div>
              <div class="track-info">
                <div class="track-name">Entregado</div>
                <div class="track-time">—</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DELIVERY INFO -->
      <div class="status-card">
        <div class="card-head">
          <div class="card-title">🚚 Información de Entrega</div>
        </div>
        <div class="card-body" style="padding:16px 20px">
          <div class="pay-detail-card" style="margin-top:0">
            <div class="pd-row">
              <div class="pd-icon">👤</div>
              <div>
                <div class="pd-label">Destinatario</div>
                <div class="pd-value">María Alejandra Pérez</div>
              </div>
            </div>
            <div class="pd-row">
              <div class="pd-icon">📍</div>
              <div>
                <div class="pd-label">Dirección</div>
                <div class="pd-value" style="font-size:13px">Av. Francisco de Miranda, Torre Centro, Piso 4, Chacao, Caracas</div>
              </div>
            </div>
            <div class="pd-row">
              <div class="pd-icon">📱</div>
              <div>
                <div class="pd-label">Teléfono</div>
                <div class="pd-value">+58 414-555-0199</div>
              </div>
              <div class="copy-btn" onclick="copyText(this,'04145550199')">Copiar</div>
            </div>
            <div class="pd-row">
              <div class="pd-icon">⏰</div>
              <div>
                <div class="pd-label">Método</div>
                <div class="pd-value">Delivery propio · Hoy mismo</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN -->
    <div style="display:flex;flex-direction:column;gap:20px;animation:fadeUp .4s ease .2s both">

      <!-- ORDER ITEMS -->
      <div class="status-card">
        <div class="card-head">
          <div class="card-title">🛍️ Resumen del Pedido</div>
          <div style="font-size:12px;color:var(--accent);font-weight:700">#1044</div>
        </div>
        <div class="card-body">
          <div class="order-item">
            <div class="item-img">👕</div>
            <div>
              <div class="item-name">Polo Classic Premium</div>
              <div class="item-meta">Talla M · Azul · x2</div>
            </div>
            <div class="item-price">$24.00<div class="item-qty">2 unidades</div></div>
          </div>
          <div class="order-item">
            <div class="item-img">👜</div>
            <div>
              <div class="item-name">Bolso Elegante Dama</div>
              <div class="item-meta">Rosa · x1</div>
            </div>
            <div class="item-price">$22.00<div class="item-qty">1 unidad</div></div>
          </div>
          <div class="summary-totals">
            <div class="tot-row"><span>Subtotal</span><span>$46.00</span></div>
            <div class="tot-row"><span>Envío (Chacao)</span><span style="color:var(--green)">Gratis</span></div>
            <div class="tot-row"><span>Tasa BCV</span><span>Bs. 36,500/$</span></div>
            <div class="tot-final">
              <span>Total</span>
              <span>$46.00</span>
            </div>
            <div style="text-align:right;font-size:12px;color:var(--text2);margin-top:4px">
              = Bs. 1,679,000
            </div>
          </div>

          <!-- PAYMENT METHOD USED -->
          <div class="pay-detail-card">
            <div class="pd-row">
              <div class="pd-icon">💸</div>
              <div>
                <div class="pd-label">Método de pago</div>
                <div class="pd-value">Zelle · juan@gmail.com</div>
              </div>
              <div style="margin-left:auto">
                <span style="font-size:10px;padding:3px 9px;background:rgba(34,197,94,.12);color:var(--green);border-radius:5px;font-weight:700">VERIFICADO</span>
              </div>
            </div>
            <div class="pd-row">
              <div class="pd-icon">🧾</div>
              <div>
                <div class="pd-label">Referencia</div>
                <div class="pd-value" style="font-size:13px">Conf#ZL-293847-VE</div>
              </div>
              <div class="copy-btn" onclick="copyText(this,'ZL-293847-VE')">Copiar</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ACTIONS -->
      <div style="display:flex;flex-direction:column;gap:10px">
        <div class="action-btn ab-wa" style="width:100%;justify-content:center" onclick="alert('Abriendo WhatsApp con el vendedor...')">
          📲 Chatear con el vendedor
        </div>
        <div style="display:flex;gap:10px">
          <div class="action-btn ab-track" style="flex:1;justify-content:center">
            📍 Rastrear pedido
          </div>
          <div class="action-btn ab-new" style="flex:1;justify-content:center" onclick="showScreen(2,document.querySelectorAll('.ntab')[1])">
            🛍️ Nuevo pedido
          </div>
        </div>
        <div style="text-align:center;font-size:12px;color:var(--muted);padding:4px">
          ¿Problema con tu pedido? <span style="color:var(--accent);cursor:pointer">Contáctanos</span>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ════════════════════════════════════
  SCREEN 2: FLUJO DE PAGO
════════════════════════════════════ -->
<div class="screen" id="s2">
  <div class="s2-wrap">

    <!-- STEP INDICATOR -->
    <div class="step-indicator" id="stepIndicator">
      <div class="si-step active" id="si1">
        <div class="si-dot-wrap">
          <div class="si-dot">1</div>
          <div class="si-label">Resumen</div>
        </div>
      </div>
      <div class="si-line" id="sl1"></div>
      <div class="si-step" id="si2">
        <div class="si-dot-wrap">
          <div class="si-dot">2</div>
          <div class="si-label">Método</div>
        </div>
      </div>
      <div class="si-line" id="sl2"></div>
      <div class="si-step" id="si3">
        <div class="si-dot-wrap">
          <div class="si-dot">3</div>
          <div class="si-label">Instrucciones</div>
        </div>
      </div>
      <div class="si-line" id="sl3"></div>
      <div class="si-step" id="si4">
        <div class="si-dot-wrap">
          <div class="si-dot">4</div>
          <div class="si-label">Comprobante</div>
        </div>
      </div>
      <div class="si-line" id="sl4"></div>
      <div class="si-step" id="si5">
        <div class="si-dot-wrap">
          <div class="si-dot">✓</div>
          <div class="si-label">Confirmado</div>
        </div>
      </div>
    </div>

    <!-- STEP 1: RESUMEN -->
    <div class="pay-step active" id="step1">
      <div class="step-card">
        <div class="step-card-head">
          <div class="step-num-badge">1</div>
          <div>
            <div class="step-head-title">Revisa tu pedido</div>
            <div class="step-head-sub">Confirma los productos antes de proceder al pago</div>
          </div>
        </div>
        <div class="step-card-body">
          <div class="amount-display">
            <div class="amount-tag">TOTAL A PAGAR</div>
            <div class="amount-usd">$46.00</div>
            <div class="amount-bs">Bs. 1,679,000 · Tasa BCV 36,500</div>
            <div class="amount-items">
              <span class="amount-chip">👕 Polo Classic x2</span>
              <span class="amount-chip">👜 Bolso Elegante x1</span>
              <span class="amount-chip">🚚 Envío gratis</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
            <div class="order-item" style="background:var(--surface2);border-radius:12px;padding:14px;border:1px solid var(--border)">
              <div class="item-img">👕</div>
              <div><div class="item-name">Polo Classic Premium</div><div class="item-meta">Talla M · Azul · x2</div></div>
              <div class="item-price">$24.00</div>
            </div>
            <div class="order-item" style="background:var(--surface2);border-radius:12px;padding:14px;border:1px solid var(--border)">
              <div class="item-img">👜</div>
              <div><div class="item-name">Bolso Elegante Dama</div><div class="item-meta">Rosa · x1</div></div>
              <div class="item-price">$22.00</div>
            </div>
          </div>
          <div style="background:var(--surface2);border-radius:12px;padding:14px;border:1px solid var(--border);font-size:13px;display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <span style="font-size:20px">📍</span>
            <div>
              <div style="font-weight:600">Chacao, Caracas</div>
              <div style="font-size:11px;color:var(--text2)">Entrega hoy · Delivery propio</div>
            </div>
            <span style="margin-left:auto;font-size:13px;font-weight:700;color:var(--green)">Gratis</span>
          </div>
        </div>
        <div class="step-nav">
          <div class="btn-next" onclick="goStep(2)">Elegir método de pago →</div>
        </div>
      </div>
    </div>

    <!-- STEP 2: MÉTODO -->
    <div class="pay-step" id="step2">
      <div class="step-card">
        <div class="step-card-head">
          <div class="step-num-badge">2</div>
          <div>
            <div class="step-head-title">¿Cómo vas a pagar?</div>
            <div class="step-head-sub">Elige el método que prefieres · Total: <strong style="color:var(--accent)">$46.00</strong></div>
          </div>
        </div>
        <div class="step-card-body">
          <div class="method-grid" id="methodGrid">
            <div class="method-opt selected" onclick="selectMethod(this,'zelle')">
              <div class="m-icon">💸</div>
              <div><div class="m-name">Zelle</div><div class="m-detail">Envío instantáneo USD</div></div>
              <div class="m-radio"></div>
            </div>
            <div class="method-opt" onclick="selectMethod(this,'movil')">
              <div class="m-icon">📱</div>
              <div><div class="m-name">Pago Móvil</div><div class="m-detail">Banesco · Bs. 1,679,000</div></div>
              <div class="m-radio"></div>
            </div>
            <div class="method-opt" onclick="selectMethod(this,'binance')">
              <div class="m-icon">⚡</div>
              <div><div class="m-name">Binance Pay</div><div class="m-detail">USDT / BNB</div></div>
              <div class="m-radio"></div>
            </div>
            <div class="method-opt" onclick="selectMethod(this,'efectivo')">
              <div class="m-icon">💵</div>
              <div><div class="m-name">Efectivo USD</div><div class="m-detail">Al recibir el pedido</div></div>
              <div class="m-radio"></div>
            </div>
            <div class="method-opt" onclick="selectMethod(this,'transferencia')">
              <div class="m-icon">🏦</div>
              <div><div class="m-name">Transferencia Bs.</div><div class="m-detail">Banco de Venezuela</div></div>
              <div class="m-radio"></div>
            </div>
            <div class="method-opt" onclick="selectMethod(this,'cripto')">
              <div class="m-icon">🔷</div>
              <div><div class="m-name">Cripto (USDT)</div><div class="m-detail">TRC20 / ERC20</div></div>
              <div class="m-radio"></div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--muted);text-align:center;padding:4px">
            🔒 Todos los pagos son procesados de forma segura
          </div>
        </div>
        <div class="step-nav">
          <div class="btn-back" onclick="goStep(1)">← Volver</div>
          <div class="btn-next" onclick="goStep(3)">Ver instrucciones de pago →</div>
        </div>
      </div>
    </div>

    <!-- STEP 3: INSTRUCCIONES -->
    <div class="pay-step" id="step3">
      <div class="step-card">
        <div class="step-card-head">
          <div class="step-num-badge">3</div>
          <div>
            <div class="step-head-title">Realiza el pago</div>
            <div class="step-head-sub">Sigue las instrucciones y luego sube el comprobante</div>
          </div>
        </div>
        <div class="step-card-body">
          <div class="amount-display" style="padding:20px;margin-bottom:20px">
            <div class="amount-tag">MONTO EXACTO A ENVIAR</div>
            <div class="amount-usd" id="payAmount">$46.00</div>
            <div class="amount-bs" id="payAmountBs">Bs. 1,679,000</div>
          </div>

          <div class="pay-instruction" id="payInstructionBox">
            <div class="pi-head">
              <span id="piIcon">💸</span> <span id="piTitle">Instrucciones — Zelle</span>
            </div>
            <div class="pi-body" id="piBody">
              <div class="pi-row">
                <span class="pi-label">Enviar a</span>
                <span class="pi-value">juan@gmail.com</span>
                <div class="pi-copy" onclick="copyAndMark(this,'juan@gmail.com')">Copiar</div>
              </div>
              <div class="pi-row">
                <span class="pi-label">Titular</span>
                <span class="pi-value">Juan Martínez</span>
              </div>
              <div class="pi-row">
                <span class="pi-label">Monto</span>
                <span class="pi-value" style="color:var(--accent);font-family:'Syne',sans-serif">$46.00 USD</span>
                <div class="pi-copy" onclick="copyAndMark(this,'46.00')">Copiar</div>
              </div>
              <div class="pi-row">
                <span class="pi-label">Memo</span>
                <span class="pi-value">Pedido #1044</span>
                <div class="pi-copy" onclick="copyAndMark(this,'Pedido #1044')">Copiar</div>
              </div>
            </div>
          </div>

          <div style="background:rgba(245,200,66,.07);border:1px solid rgba(245,200,66,.2);border-radius:12px;padding:14px;font-size:13px;color:var(--text2);line-height:1.6">
            <strong style="color:var(--accent)">⚠️ Importante:</strong> Incluye el número de pedido <strong style="color:var(--text)">#1044</strong> en el memo/nota del pago. Después de pagar, sube el comprobante en el siguiente paso para confirmar tu pedido automáticamente.
          </div>
        </div>
        <div class="step-nav">
          <div class="btn-back" onclick="goStep(2)">← Cambiar método</div>
          <div class="btn-next" onclick="goStep(4)">Ya pagué, subir comprobante →</div>
        </div>
      </div>
    </div>

    <!-- STEP 4: COMPROBANTE -->
    <div class="pay-step" id="step4">
      <div class="step-card">
        <div class="step-card-head">
          <div class="step-num-badge">4</div>
          <div>
            <div class="step-head-title">Sube el comprobante</div>
            <div class="step-head-sub">Foto del pago para confirmar tu pedido automáticamente</div>
          </div>
        </div>
        <div class="step-card-body">
          <div class="upload-area" id="uploadArea" onclick="simulateUpload()">
            <div class="upload-default">
              <div class="upload-icon">📸</div>
              <div class="upload-title">Toca para subir la foto del comprobante</div>
              <div class="upload-sub">JPG, PNG o PDF · Máx 10MB</div>
              <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                <div style="padding:7px 16px;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">📱 Desde galería</div>
                <div style="padding:7px 16px;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">📷 Tomar foto</div>
              </div>
            </div>
            <div class="upload-preview">
              <div class="preview-thumb">🖼️</div>
              <div>
                <div class="preview-name" style="color:var(--green)">✓ comprobante_zelle.jpg</div>
                <div class="preview-size">248 KB · Listo para enviar</div>
              </div>
            </div>
          </div>

          <div class="checklist">
            <div class="check-item">
              <div class="ci-box" onclick="this.classList.toggle('checked')"></div>
              <div class="ci-text">Envié exactamente <strong>$46.00 USD</strong> a la cuenta indicada</div>
            </div>
            <div class="check-item">
              <div class="ci-box" onclick="this.classList.toggle('checked')"></div>
              <div class="ci-text">El memo del pago dice <strong>"Pedido #1044"</strong></div>
            </div>
            <div class="check-item">
              <div class="ci-box" onclick="this.classList.toggle('checked')"></div>
              <div class="ci-text">El comprobante muestra claramente el monto y la fecha de hoy</div>
            </div>
          </div>
        </div>
        <div class="step-nav">
          <div class="btn-back" onclick="goStep(3)">← Volver</div>
          <div class="btn-next green" onclick="goStep(5)" id="confirmPayBtn">
            ✅ Confirmar pago y finalizar
          </div>
        </div>
      </div>
    </div>

    <!-- STEP 5: SUCCESS -->
    <div class="pay-step" id="step5">
      <div class="step-card">
        <div class="payment-success">
          <div class="big-check">✅</div>
          <div class="ps-title">¡Pago enviado!</div>
          <div class="ps-sub">
            Tu comprobante fue recibido. El vendedor lo está verificando.<br>
            Recibirás una confirmación por WhatsApp en los próximos <strong>15 minutos</strong>.
          </div>
          <div class="ps-id">#1044</div>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <div class="action-btn ab-wa" onclick="alert('Abriendo WhatsApp...')">📲 Ver en WhatsApp</div>
            <div class="action-btn ab-track" onclick="showScreen(1,document.querySelectorAll('.ntab')[0])">📍 Ver estado del pedido</div>
          </div>
          <div style="margin-top:20px;padding:14px;background:var(--surface2);border-radius:12px;font-size:12px;color:var(--text2);max-width:400px;margin-inline:auto">
            ⏱️ Tiempo promedio de verificación: <strong style="color:var(--accent)">8–15 minutos</strong><br>
            El bot de WhatsApp te confirmará automáticamente cuando se verifique el pago.
          </div>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ════════════════════════════════════
  SCREEN 3: PANEL CHATBOT
════════════════════════════════════ -->
<div class="screen" id="s3">

  <!-- SIDEBAR -->
  <div class="chat-sidebar">
    <div class="cs-head">
      <div class="cs-title">
        <div class="bot-live"></div>
        Inbox Unificado
      </div>
      <div class="cs-sub">Bot activo · 7 conversaciones hoy</div>
    </div>
    <div class="cs-filter">
      <div class="cf-pill active" onclick="filterPill(this)">Todos</div>
      <div class="cf-pill" onclick="filterPill(this)">🤖 Bot</div>
      <div class="cf-pill" onclick="filterPill(this)">👤 Humano</div>
      <div class="cf-pill" onclick="filterPill(this)">✅ Cerrados</div>
    </div>
    <div class="chat-list">

      <div class="cl-item active" onclick="setActiveChat(this)">
        <div class="cl-avatar">👩<div class="cl-src src-wa">💬</div></div>
        <div class="cl-info">
          <div class="cl-name">María Alejandra</div>
          <div class="cl-preview">¿Tienen el polo en azul talla M?</div>
          <span class="cl-bot-tag bt-auto">🤖 Bot respondiendo</span>
        </div>
        <div class="cl-meta">
          <div class="cl-time">10:42</div>
          <div class="cl-badge bot">Bot</div>
        </div>
      </div>

      <div class="cl-item" onclick="setActiveChat(this)">
        <div class="cl-avatar">👨<div class="cl-src src-ig">📸</div></div>
        <div class="cl-info">
          <div class="cl-name">Carlos IG</div>
          <div class="cl-preview">Quiero hacer un pedido grande</div>
          <span class="cl-bot-tag bt-human">👤 Requiere humano</span>
        </div>
        <div class="cl-meta">
          <div class="cl-time">10:28</div>
          <div class="cl-badge">2</div>
        </div>
      </div>

      <div class="cl-item" onclick="setActiveChat(this)">
        <div class="cl-avatar">👩‍💼<div class="cl-src src-wa">💬</div></div>
        <div class="cl-info">
          <div class="cl-name">Luisa Fernández</div>
          <div class="cl-preview">Ya hice el pago móvil 🙏</div>
          <span class="cl-bot-tag bt-auto">🤖 Bot procesando</span>
        </div>
        <div class="cl-meta">
          <div class="cl-time">10:18</div>
          <div class="cl-badge bot">Bot</div>
        </div>
      </div>

      <div class="cl-item" onclick="setActiveChat(this)">
        <div class="cl-avatar">👦<div class="cl-src src-web">🌐</div></div>
        <div class="cl-info">
          <div class="cl-name">Visitante Web</div>
          <div class="cl-preview">¿Hacen envíos a Maracaibo?</div>
          <span class="cl-bot-tag bt-auto">🤖 Bot respondiendo</span>
        </div>
        <div class="cl-meta">
          <div class="cl-time">09:55</div>
          <div class="cl-badge">1</div>
        </div>
      </div>

      <div class="cl-item" onclick="setActiveChat(this)">
        <div class="cl-avatar">👨‍🦳<div class="cl-src src-wa">💬</div></div>
        <div class="cl-info">
          <div class="cl-name">Pedro Lanz</div>
          <div class="cl-preview">Gracias, recibí el pedido ✅</div>
          <span class="cl-bot-tag bt-done">✅ Resuelto</span>
        </div>
        <div class="cl-meta">
          <div class="cl-time">09:30</div>
          <div class="cl-badge ok">✓</div>
        </div>
      </div>

    </div>

    <!-- BOT STATS -->
    <div class="bot-stats-panel">
      <div class="bsp-title">ESTADÍSTICAS DEL BOT — HOY</div>
      <div class="bsp-grid">
        <div class="bsp-stat">
          <div class="bsp-num" style="color:var(--purple)">43</div>
          <div class="bsp-label">Respuestas</div>
        </div>
        <div class="bsp-stat">
          <div class="bsp-num" style="color:var(--green)">8</div>
          <div class="bsp-label">Pedidos</div>
        </div>
        <div class="bsp-stat">
          <div class="bsp-num" style="color:var(--accent)">94%</div>
          <div class="bsp-label">Auto</div>
        </div>
      </div>
    </div>
  </div>

  <!-- CHAT MAIN -->
  <div class="chat-main">

    <!-- TOPBAR -->
    <div class="chat-topbar">
      <div class="ct-avatar">👩</div>
      <div>
        <div class="ct-name">María Alejandra Pérez</div>
        <div class="ct-status">
          <div class="bot-live"></div> En línea · WhatsApp
        </div>
      </div>
      <div class="ct-actions">
        <div class="ct-btn" title="Historial">📋</div>
        <div class="ct-btn" title="Perfil del cliente">👤</div>
        <div class="ct-btn" title="Ver pedidos">📦</div>
        <div class="ct-btn" title="Más opciones">⋯</div>
      </div>
    </div>

    <!-- BOT STATUS BAR -->
    <div class="bot-bar">
      <div class="bb-dot"></div>
      🤖 <strong>Valeria (Bot IA)</strong> está respondiendo esta conversación automáticamente
      <div class="bb-toggle" onclick="toggleBot(this)">Tomar control</div>
    </div>

    <!-- MESSAGES -->
    <div class="messages-area" id="messagesArea">

      <div class="msg-date">Hoy · 10:38 AM</div>

      <!-- CLIENT STARTS -->
      <div class="msg in">
        <div class="msg-avatar">👩</div>
        <div>
          <div class="msg-bubble">Hola buenas! Quería preguntar si tienen el polo classic en azul talla M disponible?</div>
          <div class="msg-time">10:38</div>
        </div>
      </div>

      <!-- BOT RESPONDS -->
      <div class="msg bot">
        <div class="msg-avatar" style="background:rgba(155,109,255,.15);border-color:rgba(155,109,255,.3);font-size:13px">🤖</div>
        <div>
          <div class="msg-bubble">¡Hola María! Soy Valeria de <strong>Mis Modas 2025</strong> 👋<br><br>¡Claro que sí! Tenemos el <strong>Polo Classic Premium</strong> disponible en azul talla M. Precio: <strong style="color:var(--accent)">$12.00</strong> (Bs. 438,000)<br><br>¿Cuántas unidades te interesan?</div>
          <div class="msg-time">10:38 · 🤖 Valeria</div>
        </div>
      </div>

      <div class="msg in">
        <div class="msg-avatar">👩</div>
        <div>
          <div class="msg-bubble">Me interesan 2 unidades y también vi un bolso rosa en el catálogo, el elegante dama, ¿lo tienen disponible?</div>
          <div class="msg-time">10:40</div>
        </div>
      </div>

      <div class="msg bot">
        <div class="msg-avatar" style="background:rgba(155,109,255,.15);border-color:rgba(155,109,255,.3);font-size:13px">🤖</div>
        <div>
          <div class="msg-bubble">¡Perfecto! Déjame confirmarte:<br><br>✅ <strong>2x Polo Classic Premium</strong> Azul M = $24.00<br>✅ <strong>1x Bolso Elegante Rosa</strong> disponible = $22.00<br><br>🛒 <strong>Total: $46.00</strong> (Bs. 1,679,000)</div>
          <div class="msg-time">10:40 · 🤖 Valeria</div>
        </div>
      </div>

      <!-- ORDER CARD IN CHAT -->
      <div class="order-bubble">
        <div class="ob-head">📦 Resumen del pedido</div>
        <div class="ob-body">
          <div class="ob-item"><span>👕 Polo Classic x2</span><span style="color:var(--accent)">$24.00</span></div>
          <div class="ob-item"><span>👜 Bolso Elegante x1</span><span style="color:var(--accent)">$22.00</span></div>
          <div class="ob-item"><span>🚚 Envío Chacao</span><span style="color:var(--green)">Gratis</span></div>
          <div class="ob-total"><span>Total</span><span>$46.00</span></div>
        </div>
      </div>

      <div class="msg bot">
        <div class="msg-avatar" style="background:rgba(155,109,255,.15);border-color:rgba(155,109,255,.3);font-size:13px">🤖</div>
        <div>
          <div class="msg-bubble">¿Confirmas este pedido? ¿Cómo prefieres pagar? 💳</div>
          <div class="msg-time">10:40 · 🤖 Valeria</div>
        </div>
      </div>

      <!-- QUICK REPLIES -->
      <div class="quick-replies">
        <div class="qr" onclick="selectQR(this,'💸 Zelle')">💸 Zelle</div>
        <div class="qr" onclick="selectQR(this,'📱 Pago Móvil')">📱 Pago Móvil</div>
        <div class="qr" onclick="selectQR(this,'⚡ Binance')">⚡ Binance</div>
        <div class="qr" onclick="selectQR(this,'💵 Efectivo')">💵 Efectivo</div>
      </div>

      <div class="msg in">
        <div class="msg-avatar">👩</div>
        <div>
          <div class="msg-bubble">Voy a pagar por Zelle 💸</div>
          <div class="msg-time">10:41</div>
        </div>
      </div>

      <div class="msg bot">
        <div class="msg-avatar" style="background:rgba(155,109,255,.15);border-color:rgba(155,109,255,.3);font-size:13px">🤖</div>
        <div>
          <div class="msg-bubble">¡Excelente! Estos son los datos para el pago:</div>
          <div class="msg-time">10:41 · 🤖 Valeria</div>
        </div>
      </div>

      <!-- PAYMENT CARD IN CHAT -->
      <div class="pay-bubble">
        <div class="pb-head">💸 Datos de pago — Zelle</div>
        <div class="pb-body">
          <div style="color:var(--text2)">Enviar a:</div>
          <div class="pb-ref">juan@gmail.com <span style="font-size:16px;cursor:pointer" onclick="copyText(this,'juan@gmail.com')">📋</span></div>
          <div style="color:var(--text2);margin-top:8px">Monto exacto:</div>
          <div class="pb-ref"><strong style="color:var(--accent)">$46.00 USD</strong></div>
          <div style="color:var(--text2);margin-top:8px">Memo:</div>
          <div class="pb-ref">Pedido #1044</div>
        </div>
      </div>

      <div class="msg bot">
        <div class="msg-avatar" style="background:rgba(155,109,255,.15);border-color:rgba(155,109,255,.3);font-size:13px">🤖</div>
        <div>
          <div class="msg-bubble">Una vez que hagas el pago, envíame la captura del comprobante 📸 y confirmo tu pedido en segundos ⚡</div>
          <div class="msg-time">10:41 · 🤖 Valeria</div>
        </div>
      </div>

      <div class="msg in">
        <div class="msg-avatar">👩</div>
        <div>
          <div class="msg-bubble">Listo! Ya hice el pago, te mando la foto</div>
          <div class="msg-time">10:42</div>
        </div>
      </div>

      <div class="msg in">
        <div class="msg-avatar">👩</div>
        <div>
          <div class="msg-bubble" style="padding:8px">
            <div style="background:var(--surface3);border-radius:8px;padding:16px;font-size:24px;text-align:center;margin-bottom:4px">📸</div>
            <div style="font-size:11px;color:var(--text2)">comprobante_zelle.jpg · 248 KB</div>
          </div>
          <div class="msg-time">10:42</div>
        </div>
      </div>

      <!-- TYPING -->
      <div class="msg bot" id="typingMsg">
        <div class="msg-avatar" style="background:rgba(155,109,255,.15);border-color:rgba(155,109,255,.3);font-size:13px">🤖</div>
        <div>
          <div class="msg-bubble" style="padding:12px 16px">
            <div class="typing-indicator">
              <div class="typing-dots">
                <div class="td"></div><div class="td"></div><div class="td"></div>
              </div>
              <span class="typing-label">Valeria está verificando el pago...</span>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /messages-area -->

    <!-- INPUT -->
    <div class="chat-input-area">
      <div style="margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap">
        <div style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px">
          <span>Respuestas rápidas:</span>
        </div>
        <span style="padding:4px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;font-size:11px;cursor:pointer;color:var(--text2)" onclick="insertReply(this)">✅ Pago confirmado</span>
        <span style="padding:4px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;font-size:11px;cursor:pointer;color:var(--text2)" onclick="insertReply(this)">🚴 En camino</span>
        <span style="padding:4px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;font-size:11px;cursor:pointer;color:var(--text2)" onclick="insertReply(this)">📦 Pedido listo</span>
        <span style="padding:4px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;font-size:11px;cursor:pointer;color:var(--text2)" onclick="insertReply(this)">🏠 Entregado</span>
      </div>
      <div class="chat-input-row">
        <textarea class="chat-input" id="chatInput" placeholder="Escribe un mensaje (el humano habla ahora)..." rows="1"></textarea>
        <div class="input-actions">
          <div class="ia-btn">😊</div>
          <div class="ia-btn">📎</div>
          <div class="ia-btn">📸</div>
          <div class="send-btn" onclick="sendMessage()">➤</div>
        </div>
      </div>
    </div>

  </div><!-- /chat-main -->

</div><!-- /s3 -->

<script>
/* ─── SCREEN SWITCHING ─────────────── */
function showScreen(n, tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t => t.classList.remove('active'));
  document.getElementById('s'+n).classList.add('active');
  tab.classList.add('active');
}

/* ─── COPY HELPER ──────────────────── */
function copyText(el, text) {
  navigator.clipboard?.writeText(text).catch(()=>{});
  const orig = el.textContent;
  el.textContent = '✓';
  setTimeout(()=>el.textContent=orig, 1500);
}
function copyAndMark(el, text) {
  navigator.clipboard?.writeText(text).catch(()=>{});
  el.classList.add('copied');
  el.textContent = '✓ Copiado';
  setTimeout(()=>{el.classList.remove('copied');el.textContent='Copiar';}, 1800);
}

/* ─── STEP FLOW ────────────────────── */
let currentStep = 1;
const payInstructions = {
  zelle:{icon:'💸',title:'Instrucciones — Zelle',rows:[
    {l:'Enviar a',v:'juan@gmail.com',copy:true},
    {l:'Titular',v:'Juan Martínez',copy:false},
    {l:'Monto',v:'$46.00 USD',copy:true,accent:true},
    {l:'Memo',v:'Pedido #1044',copy:true}
  ]},
  movil:{icon:'📱',title:'Instrucciones — Pago Móvil',rows:[
    {l:'Teléfono',v:'0414-555-0123',copy:true},
    {l:'Banco',v:'Banesco',copy:false},
    {l:'Cédula',v:'V-12.345.678',copy:true},
    {l:'Monto',v:'Bs. 1,679,000',copy:true,accent:true},
    {l:'Concepto',v:'Pedido #1044',copy:true}
  ]},
  binance:{icon:'⚡',title:'Instrucciones — Binance Pay',rows:[
    {l:'Pay ID',v:'123456789',copy:true},
    {l:'Email',v:'juan@binance.com',copy:true},
    {l:'Monto',v:'$46.00 USDT',copy:true,accent:true},
    {l:'Nota',v:'Pedido #1044',copy:true}
  ]},
  efectivo:{icon:'💵',title:'Pago en Efectivo al Recibir',rows:[
    {l:'Monto',v:'$46.00 USD',copy:false,accent:true},
    {l:'Billetes',v:'Se aceptan de $1, $5, $10, $20',copy:false},
    {l:'Dónde',v:'Al momento de la entrega',copy:false}
  ]},
  transferencia:{icon:'🏦',title:'Transferencia — Banco Venezuela',rows:[
    {l:'Cuenta',v:'0102-0000-0000000000',copy:true},
    {l:'Titular',v:'Juan José Martínez',copy:false},
    {l:'Cédula',v:'V-12.345.678',copy:true},
    {l:'Monto',v:'Bs. 1,679,000',copy:true,accent:true}
  ]},
  cripto:{icon:'🔷',title:'Pago Cripto — USDT TRC20',rows:[
    {l:'Wallet',v:'TXxxxxxxxxxxxxxxxxxxxxxx',copy:true},
    {l:'Red',v:'TRON (TRC20)',copy:false},
    {l:'Monto',v:'$46.00 USDT',copy:true,accent:true},
    {l:'Nota',v:'Enviar exacto, sin redondear',copy:false}
  ]}
};
let selectedMethod = 'zelle';

function selectMethod(el, method) {
  document.querySelectorAll('.method-opt').forEach(m=>m.classList.remove('selected'));
  el.classList.add('selected');
  selectedMethod = method;
}

function goStep(n) {
  const prev = document.getElementById('step'+currentStep);
  const next = document.getElementById('step'+n);
  const isForward = n > currentStep;

  prev.classList.remove('active');
  next.classList.remove('back');
  if (!isForward) next.classList.add('back');
  next.classList.add('active');

  // Update indicators
  for(let i=1;i<=5;i++){
    const si = document.getElementById('si'+i);
    si.classList.remove('active','done');
    if(i < n) si.classList.add('done');
    if(i === n) si.classList.add('active');
    // Update dot text
    si.querySelector('.si-dot').textContent = i < n ? '✓' : (i===5?'✓':i);
  }
  for(let i=1;i<=4;i++){
    const sl = document.getElementById('sl'+i);
    sl.classList.toggle('filled', i < n);
  }

  // Update instructions if going to step 3
  if(n===3) updateInstructions();
  currentStep = n;
}

function updateInstructions() {
  const inst = payInstructions[selectedMethod];
  document.getElementById('piIcon').textContent = inst.icon;
  document.getElementById('piTitle').textContent = inst.title;
  const body = document.getElementById('piBody');
  body.innerHTML = inst.rows.map(r=>`
    <div class="pi-row">
      <span class="pi-label">${r.l}</span>
      <span class="pi-value" ${r.accent?'style="color:var(--accent);font-family:Syne,sans-serif"':''}>${r.v}</span>
      ${r.copy?`<div class="pi-copy" onclick="copyAndMark(this,'${r.v}')">Copiar</div>`:''}
    </div>
  `).join('');

  // Update amounts for bs methods
  const bsMethods = ['movil','transferencia'];
  document.getElementById('payAmount').textContent = bsMethods.includes(selectedMethod) ? 'Bs. 1,679,000' : '$46.00';
  document.getElementById('payAmountBs').textContent = bsMethods.includes(selectedMethod) ? 'Equivale a $46.00 USD' : 'Bs. 1,679,000';
}

/* UPLOAD SIMULATION */
function simulateUpload() {
  const area = document.getElementById('uploadArea');
  if(area.classList.contains('has-file')) return;
  setTimeout(()=>{
    area.classList.add('has-file');
  }, 600);
}

/* ─── CHATBOT PANEL ────────────────── */
let botActive = true;

function setActiveChat(el) {
  document.querySelectorAll('.cl-item').forEach(i=>i.classList.remove('active'));
  el.classList.add('active');
}

function filterPill(el) {
  document.querySelectorAll('.cf-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
}

function selectQR(el, text) {
  const input = document.getElementById('chatInput');
  input.value = text;
  input.focus();
}

function insertReply(el) {
  const input = document.getElementById('chatInput');
  input.value = el.textContent.trim();
  input.focus();
}

function toggleBot(el) {
  botActive = !botActive;
  const bar = el.closest('.bot-bar');
  if(!botActive) {
    bar.style.background = 'rgba(245,200,66,.06)';
    bar.style.borderColor = 'rgba(245,200,66,.2)';
    bar.style.color = 'var(--accent)';
    bar.querySelector('strong').textContent = 'Modo manual activo';
    el.textContent = 'Activar bot';
    el.style.background = 'rgba(245,200,66,.15)';
    el.style.borderColor = 'rgba(245,200,66,.3)';
    el.style.color = 'var(--accent)';
  } else {
    bar.style.background = 'rgba(155,109,255,.06)';
    bar.style.borderColor = 'rgba(155,109,255,.15)';
    bar.style.color = 'var(--purple)';
    bar.querySelector('strong').textContent = 'Valeria (Bot IA)';
    el.textContent = 'Tomar control';
    el.style.background = '';
    el.style.borderColor = '';
    el.style.color = '';
  }
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if(!text) return;

  const area = document.getElementById('messagesArea');
  const typing = document.getElementById('typingMsg');

  // Remove typing indicator
  typing.remove();

  // Add human message
  const msgEl = document.createElement('div');
  msgEl.className = 'msg out';
  msgEl.innerHTML = `
    <div style="width:28px"></div>
    <div>
      <div class="msg-bubble">${text}</div>
      <div class="msg-time" style="justify-content:flex-end">
        Ahora <span class="msg-check">✓✓</span>
      </div>
    </div>
  `;
  area.appendChild(msgEl);
  input.value = '';
  area.scrollTop = area.scrollHeight;

  // Bot auto-response after delay
  if(botActive) {
    setTimeout(()=>{
      const botMsg = document.createElement('div');
      botMsg.className = 'msg bot';
      botMsg.innerHTML = `
        <div class="msg-avatar" style="background:rgba(155,109,255,.15);border-color:rgba(155,109,255,.3);font-size:13px">🤖</div>
        <div>
          <div class="msg-bubble">✅ <strong>${text}</strong> registrado y confirmado.<br>Tu pedido #1044 ha sido actualizado. Se notificó al cliente automáticamente por WhatsApp. 📱</div>
          <div class="msg-time">Ahora · 🤖 Valeria</div>
        </div>
      `;
      area.appendChild(botMsg);
      area.scrollTop = area.scrollHeight;
    }, 1200);
  }
}

// Auto-resolve typing indicator after 4s
setTimeout(()=>{
  const typing = document.getElementById('typingMsg');
  if(!typing) return;
  const area = document.getElementById('messagesArea');
  typing.remove();
  const botConfirm = document.createElement('div');
  botConfirm.className = 'msg bot';
  botConfirm.style.animation = 'fadeUp .3s ease both';
  botConfirm.innerHTML = `
    <div class="msg-avatar" style="background:rgba(155,109,255,.15);border-color:rgba(155,109,255,.3);font-size:13px">🤖</div>
    <div>
      <div class="msg-bubble" style="background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.25)">
        ✅ <strong>¡Pago verificado!</strong> Tu pedido <strong>#1044</strong> está confirmado.<br><br>
        🚴 Nuestro delivery saldrá en <strong>30–45 minutos</strong>.<br>
        📍 Te notificaremos cuando esté en camino.<br><br>
        ¡Gracias por tu compra, María! 🛍️
      </div>
      <div class="msg-time">10:43 · 🤖 Valeria</div>
    </div>
  `;
  area.appendChild(botConfirm);
  area.scrollTop = area.scrollHeight;
}, 4000);

// Scroll to bottom on load
window.addEventListener('load', ()=>{
  const area = document.getElementById('messagesArea');
  if(area) area.scrollTop = area.scrollHeight;
});

// Enter to send
document.getElementById('chatInput')?.addEventListener('keydown', e=>{
  if(e.key==='Enter' && !e.shiftKey){e.preventDefault();sendMessage();}
});
</script>
</body>
</html>
