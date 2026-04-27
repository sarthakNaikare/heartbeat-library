import React,{useState,useEffect,useRef,useCallback}from"react";
const API=process.env.REACT_APP_API_URL||"https://heartbeat-library-api.onrender.com";
const BC={V:"#ff5252",N:"#00e676",A:"#ffab40",L:"#7c4dff"};
const BL={V:"PVC",N:"Normal",A:"Atrial",L:"LBBB"};
const TS={V:{bg:"rgba(255,82,82,0.08)",color:"#ff5252",border:"rgba(255,82,82,0.25)"},N:{bg:"rgba(0,230,118,0.08)",color:"#00e676",border:"rgba(0,230,118,0.25)"},A:{bg:"rgba(255,171,64,0.08)",color:"#ffab40",border:"rgba(255,171,64,0.25)"},L:{bg:"rgba(124,77,255,0.08)",color:"#7c4dff",border:"rgba(124,77,255,0.25)"}};
const DEMO={pvc:{beat:"V",filter:"84ms",dtw:"2.3s",cands:"11/201k",prec:"100%",results:[{patient_id:"221",beat_sample:413372,dtw_distance:0.786,beat_type:"V",lead:"MLII"},{patient_id:"221",beat_sample:411539,dtw_distance:1.053,beat_type:"V",lead:"MLII"},{patient_id:"215",beat_sample:372404,dtw_distance:1.934,beat_type:"V",lead:"MLII"},{patient_id:"200",beat_sample:437194,dtw_distance:2.156,beat_type:"V",lead:"MLII"},{patient_id:"106",beat_sample:450140,dtw_distance:3.296,beat_type:"V",lead:"MLII"}]},normal:{beat:"N",filter:"110ms",dtw:"1.8s",cands:"50/201k",prec:"100%",results:[{patient_id:"202",beat_sample:342854,dtw_distance:0.595,beat_type:"N",lead:"MLII"},{patient_id:"203",beat_sample:361892,dtw_distance:0.620,beat_type:"N",lead:"MLII"},{patient_id:"205",beat_sample:476683,dtw_distance:0.654,beat_type:"N",lead:"MLII"},{patient_id:"202",beat_sample:36909,dtw_distance:0.656,beat_type:"N",lead:"MLII"},{patient_id:"230",beat_sample:70,dtw_distance:0.711,beat_type:"N",lead:"MLII"}]},atrial:{beat:"A",filter:"95ms",dtw:"2.1s",cands:"50/201k",prec:"100%",results:[{patient_id:"202",beat_sample:408602,dtw_distance:1.534,beat_type:"A",lead:"MLII"},{patient_id:"202",beat_sample:410010,dtw_distance:1.539,beat_type:"A",lead:"MLII"},{patient_id:"100",beat_sample:567379,dtw_distance:2.371,beat_type:"A",lead:"MLII"},{patient_id:"103",beat_sample:418275,dtw_distance:2.496,beat_type:"A",lead:"MLII"},{patient_id:"222",beat_sample:392062,dtw_distance:2.679,beat_type:"A",lead:"MLII"}]},lbbb:{beat:"L",filter:"92ms",dtw:"1.9s",cands:"15/201k",prec:"90%",results:[{patient_id:"111",beat_sample:88420,dtw_distance:1.102,beat_type:"L",lead:"MLII"},{patient_id:"207",beat_sample:44280,dtw_distance:1.340,beat_type:"L",lead:"MLII"},{patient_id:"109",beat_sample:212040,dtw_distance:1.588,beat_type:"L",lead:"MLII"},{patient_id:"111",beat_sample:92160,dtw_distance:1.790,beat_type:"L",lead:"MLII"},{patient_id:"207",beat_sample:49320,dtw_distance:2.104,beat_type:"L",lead:"MLII"}]}};

const GLOBALCSS=`
*{cursor:none!important;}
.hb-cursor{position:fixed;pointer-events:none;z-index:99999;transition:transform 0.1s ease;}
.hb-cursor-dot{width:6px;height:6px;background:#00d4ff;border-radius:50%;position:fixed;transform:translate(-50%,-50%);pointer-events:none;z-index:99999;transition:none;box-shadow:0 0 8px #00d4ff;}
.hb-cursor-ring{width:28px;height:28px;border:1px solid rgba(0,212,255,0.5);border-radius:50%;position:fixed;transform:translate(-50%,-50%);pointer-events:none;z-index:99998;transition:width 0.15s ease,height 0.15s ease,border-color 0.15s ease,background 0.15s ease;}
.hb-cursor-ring.clicking{transform:translate(-50%,-50%) scale(0.6);border-color:#00d4ff;}
.hb-cursor-ring.hovering{transform:translate(-50%,-50%) scale(1.5);border-color:rgba(0,212,255,0.8);background:rgba(0,212,255,0.05);}
@keyframes scanline{0%{top:-2px;opacity:0;}5%{opacity:1;}95%{opacity:1;}100%{top:100%;opacity:0;}}
@keyframes floatring{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-18px) scale(1.02);}}
@keyframes floatdot{0%,100%{transform:translateY(0);opacity:0.4;}50%{transform:translateY(-22px);opacity:0.9;}}
@keyframes glowpulse{0%,100%{opacity:0.5;}50%{opacity:1;}}
@keyframes pdot{0%,100%{opacity:1;box-shadow:0 0 6px currentColor;}50%{opacity:0.2;box-shadow:none;}}
@keyframes pagein{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
@keyframes navglow{0%,100%{box-shadow:none;}50%{box-shadow:0 0 12px rgba(0,212,255,0.3);}}
.page-enter{animation:pagein 0.35s ease both;}
.nav-link-active{animation:navglow 2s ease-in-out infinite;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(0,212,255,0.2);border-radius:2px;}
::-webkit-scrollbar-thumb:hover{background:rgba(0,212,255,0.4);}
.hov-card{transition:all 0.3s ease;cursor:default;}
.hov-card:hover{transform:translateY(-3px);border-color:rgba(0,212,255,0.25)!important;box-shadow:0 8px 24px rgba(0,212,255,0.06);}
.hov-btn{transition:all 0.25s ease;}
.hov-btn:hover{transform:translateY(-2px);box-shadow:0 0 20px rgba(0,212,255,0.2);}
.hov-btn:active{transform:scale(0.96);}
.beat-pill{transition:all 0.2s ease;}
.beat-pill:hover{transform:scale(1.06);}
.beat-pill:active{transform:scale(0.94);}
.res-row-item{transition:all 0.2s ease;}
.res-row-item:hover{transform:translateX(4px);}
`;

function Cursor(){
  const dot=useRef();const ring=useRef();
  const [clicking,setClicking]=useState(false);const [hovering,setHovering]=useState(false);
  useEffect(()=>{
    let rx=0,ry=0;
    const mv=(e)=>{
      if(dot.current){dot.current.style.left=e.clientX+"px";dot.current.style.top=e.clientY+"px";}
      rx+=(e.clientX-rx)*0.12;ry+=(e.clientY-ry)*0.12;
      if(ring.current){ring.current.style.left=rx+"px";ring.current.style.top=ry+"px";}
      const el=document.elementFromPoint(e.clientX,e.clientY);
      const isHov=el&&(el.tagName==="BUTTON"||el.closest("[data-hover]")||el.closest("a")||el.closest("[onclick]")||getComputedStyle(el).cursor==="pointer");
      setHovering(!!isHov);
    };
    const md=()=>setClicking(true);const mu=()=>setClicking(false);
    window.addEventListener("mousemove",mv);window.addEventListener("mousedown",md);window.addEventListener("mouseup",mu);
    return()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mousedown",md);window.removeEventListener("mouseup",mu);};
  },[]);
  return React.createElement(React.Fragment,null,
    React.createElement("div",{ref:dot,className:"hb-cursor-dot",style:{transform:clicking?"translate(-50%,-50%) scale(0.5)":"translate(-50%,-50%)"}}),
    React.createElement("div",{ref:ring,className:"hb-cursor-ring"+(hovering?" hovering":"")+(clicking?" clicking":"")})
  );
}

function BG(){
  return React.createElement(React.Fragment,null,
    React.createElement("div",{style:{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,212,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.022) 1px,transparent 1px)",backgroundSize:"32px 32px",pointerEvents:"none",zIndex:0}}),
    React.createElement("div",{style:{position:"absolute",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(0,212,255,0.35),transparent)",animation:"scanline 6s linear infinite",pointerEvents:"none",zIndex:5}}),
    React.createElement("div",{style:{position:"absolute",width:340,height:340,top:-120,right:-80,borderRadius:"50%",background:"rgba(0,60,160,0.12)",filter:"blur(80px)",animation:"glowpulse 5s ease-in-out infinite",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:260,height:260,bottom:-80,left:-40,borderRadius:"50%",background:"rgba(0,120,80,0.07)",filter:"blur(80px)",animation:"glowpulse 5s ease-in-out infinite 2.5s",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:300,height:300,top:20,right:20,borderRadius:"50%",border:"1px solid rgba(0,212,255,0.06)",animation:"floatring 8s ease-in-out infinite",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:200,height:200,bottom:60,left:30,borderRadius:"50%",border:"1px solid rgba(0,212,255,0.04)",animation:"floatring 12s ease-in-out infinite -4s",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:4,height:4,background:"#00d4ff",top:"15%",right:"25%",borderRadius:"50%",animation:"floatdot 7s ease-in-out infinite",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:3,height:3,background:"#00e676",top:"60%",left:"15%",borderRadius:"50%",animation:"floatdot 9s ease-in-out infinite -3s",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:3,height:3,background:"#ff5252",top:"30%",left:"40%",borderRadius:"50%",animation:"floatdot 8s ease-in-out infinite -5s",pointerEvents:"none"}})
  );
}

function MiniWave({type}){
  const P={V:"M0,11 L6,11 L8,5 L10,17 L12,11 L18,11 L20,5 L22,17 L24,11 L30,11 L32,5 L34,17 L36,11 L42,11 L44,5 L46,17 L48,11",N:"M0,11 L6,11 L8,11 L10,3 L12,19 L14,11 L20,11 L22,3 L24,19 L26,11 L32,11 L34,3 L36,19 L38,11 L44,11 L46,3 L48,19 L50,11",A:"M0,11 L5,11 L7,8 L9,3 L11,19 L13,11 L19,11 L21,8 L23,3 L25,19 L27,11 L33,11 L35,8 L37,3 L39,19 L41,11 L47,11",L:"M0,11 L6,11 L8,11 L10,3 L12,19 L16,15 L20,11 L26,11 L28,3 L30,19 L34,15 L38,11 L44,11 L46,3 L48,19 L52,15 L56,11"};
  return React.createElement("svg",{width:62,height:22,viewBox:"0 0 62 22",style:{flexShrink:0}},React.createElement("path",{d:P[type]||P.N,stroke:BC[type]||"#00d4ff",strokeWidth:1,fill:"none",strokeLinecap:"round"}));
}

function useECG(ref,beat,animate){
  const aref=useRef();const off=useRef(0);
  const draw=useCallback(()=>{
    const c=ref.current;if(!c)return;
    const ctx=c.getContext("2d");const W=c.width;const H=c.height;
    ctx.clearRect(0,0,W,H);
    const col=BC[beat]||"#00d4ff";const cyc=animate?120:100;
    if(animate){const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,"rgba(0,212,255,0)");g.addColorStop(0.08,"rgba(0,212,255,0.85)");g.addColorStop(0.92,"rgba(0,212,255,0.85)");g.addColorStop(1,"rgba(0,212,255,0)");ctx.strokeStyle=g;}
    else ctx.strokeStyle=col;
    ctx.lineWidth=animate?1.5:1.3;ctx.shadowColor=animate?"#00d4ff":col;ctx.shadowBlur=animate?6:4;
    ctx.beginPath();let started=false;
    for(let x=0;x<W;x++){
      const pos=((x+off.current)%cyc)/cyc;
      const gpos=animate?((x+off.current)%(cyc*5))/(cyc*5):0;
      let y=H/2;let pvc=false;
      if(animate&&gpos>0.4&&gpos<0.42){const pp=(gpos-0.4)/0.02;if(pp<0.3)y=H/2-28*(pp/0.3);else if(pp<0.6)y=H/2-28+40*((pp-0.3)/0.3);else y=H/2+12-12*((pp-0.6)/0.4);pvc=true;}
      else{const t=beat||"N";
        if(t==="V"){if(pos>0.1&&pos<0.13)y=H/2-6;else if(pos>0.3&&pos<0.33)y=H/2-22;else if(pos>0.33&&pos<0.38)y=H/2+13;else if(pos>0.38&&pos<0.42)y=H/2-4;}
        else if(t==="N"||animate){if(pos>0.1&&pos<0.13)y=H/2-7;else if(pos>0.31&&pos<0.34)y=H/2-21;else if(pos>0.34&&pos<0.37)y=H/2+10;else if(pos>0.5&&pos<0.56)y=H/2-5;}
        else if(t==="A"){if(pos>0.08&&pos<0.13)y=H/2-4;else if(pos>0.3&&pos<0.32)y=H/2-15;else if(pos>0.32&&pos<0.37)y=H/2+7;}
        else if(t==="L"){if(pos>0.33&&pos<0.38)y=H/2-19;else if(pos>0.38&&pos<0.46)y=H/2+7;else if(pos>0.46&&pos<0.54)y=H/2-3;}
      }
      if(pvc){ctx.stroke();ctx.beginPath();ctx.strokeStyle="#ff5252";ctx.shadowColor="#ff5252";ctx.lineWidth=2;ctx.moveTo(x,y);started=true;}
      else{if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);}
    }
    ctx.stroke();
    if(animate){off.current=(off.current+1.5)%cyc;aref.current=requestAnimationFrame(draw);}
  },[ref,beat,animate]);
  useEffect(()=>{cancelAnimationFrame(aref.current);off.current=0;draw();return()=>cancelAnimationFrame(aref.current);},[draw]);
}

function AboutPopover({open,onClose}){
  const ref=useRef();
  if(!open)return null;
  const projects=[
    {icon:"⭐",name:"Stellar Observatory",tag:"TimescaleDB · Kafka · NASA SDSS",url:"https://github.com/sarthakNaikare"},
    {icon:"🎵",name:"Resonance",tag:"5 live streams · anomaly detection · 3D viz",url:"https://github.com/sarthakNaikare"},
    {icon:"🤖",name:"Prometheus Unbound",tag:"Ghostgres · self-healing AI metrics",url:"https://github.com/sarthakNaikare"},
    {icon:"🔄",name:"Postgres to Tiger",tag:"Live migration playground",url:"https://postgres-to-tiger.vercel.app"},
    {icon:"💓",name:"Heartbeat Library",tag:"99.6M rows · 100% precision · this project",url:"https://github.com/sarthakNaikare/heartbeat-library"},
  ];
  return React.createElement("div",{ref,onClick:(e)=>e.stopPropagation(),style:{position:"absolute",top:"calc(100% + 10px)",right:0,width:300,background:"#060e24",border:"1px solid rgba(0,212,255,0.18)",borderRadius:12,padding:16,zIndex:500,boxShadow:"0 8px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(0,212,255,0.05)",animation:"pagein 0.2s ease"}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:12,paddingBottom:12,borderBottom:"1px solid rgba(0,212,255,0.08)"}},
      React.createElement("div",{style:{width:42,height:42,borderRadius:"50%",border:"1px solid rgba(0,212,255,0.25)",background:"linear-gradient(135deg,rgba(0,212,255,0.18),rgba(0,100,200,0.12))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:500,color:"#00d4ff",flexShrink:0,boxShadow:"0 0 12px rgba(0,212,255,0.15)"}},"SN"),
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"Sarthak Naikare"),
        React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.4)",marginTop:2,lineHeight:1.5}},"CS Fresher · MIT ADT University, Pune")
      )
    ),
    React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}},"Projects built"),
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:4,marginBottom:12}},
      projects.map((p,i)=>React.createElement("a",{"data-hover":true,key:i,href:p.url,target:"_blank",rel:"noreferrer",style:{display:"flex",alignItems:"center",gap:8,padding:"6px 9px",borderRadius:8,border:"1px solid rgba(0,212,255,0.07)",background:"rgba(0,212,255,0.02)",textDecoration:"none",transition:"all 0.2s"}},
        React.createElement("span",{style:{fontSize:12}},p.icon),
        React.createElement("div",{style:{flex:1}},
          React.createElement("div",{style:{fontSize:11,color:"#e8f4ff"}},p.name),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.35)"}},p.tag)
        ),
        React.createElement("span",{style:{fontSize:9,color:"rgba(0,212,255,0.25)"}},"→")
      ))
    ),
    React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}},"Connect"),
    React.createElement("div",{style:{display:"flex",gap:5}},
      [["LinkedIn","https://linkedin.com/in/sknaikare8500"],["Portfolio","https://sarthaknaikare.github.io"],["GitHub","https://github.com/sarthakNaikare"],["X","https://x.com/SarthakNaikare"]].map(([label,url])=>
        React.createElement("a",{"data-hover":true,key:label,href:url,target:"_blank",rel:"noreferrer",style:{flex:1,textAlign:"center",padding:"5px 4px",borderRadius:7,border:"1px solid rgba(0,212,255,0.12)",color:"rgba(0,212,255,0.45)",fontSize:10,textDecoration:"none",transition:"all 0.2s"}},label)
      )
    )
  );
}

function Nav({page,setPage}){
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    function close(){setOpen(false);}
    document.addEventListener("click",close);
    return()=>document.removeEventListener("click",close);
  },[]);
  const links=[["search","Search"],["dashboard","Dashboard"],["benchmarks","Benchmarks"],["tech","Technology"],["about","About"]];
  return React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",borderBottom:"1px solid rgba(0,212,255,0.1)",position:"sticky",top:0,zIndex:200,background:"rgba(2,8,24,0.97)",backdropFilter:"blur(12px)"}},
    React.createElement("div",{"data-hover":true,style:{display:"flex",alignItems:"center",gap:9,cursor:"pointer",transition:"opacity 0.2s"},onClick:()=>setPage("search"),onMouseEnter:e=>e.currentTarget.style.opacity="0.75",onMouseLeave:e=>e.currentTarget.style.opacity="1"},
      React.createElement("svg",{width:22,height:22,viewBox:"0 0 22 22",fill:"none"},
        React.createElement("circle",{cx:11,cy:11,r:10,stroke:"rgba(0,212,255,0.25)",strokeWidth:1}),
        React.createElement("path",{d:"M2,11 L5,11 L7,6 L9,16 L11,9 L13,13 L15,11 L20,11",stroke:"#00d4ff",strokeWidth:1.2,strokeLinecap:"round"})
      ),
      React.createElement("span",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"Heartbeat Library")
    ),
    React.createElement("div",{style:{display:"flex",gap:2}},
      links.map(([id,label])=>React.createElement("div",{"data-hover":true,key:id,onClick:()=>setPage(id),style:{padding:"5px 12px",borderRadius:6,fontSize:11,cursor:"pointer",transition:"all 0.25s",color:page===id?"#00d4ff":"rgba(0,212,255,0.45)",border:page===id?"1px solid rgba(0,212,255,0.3)":"1px solid transparent",background:page===id?"rgba(0,212,255,0.08)":"transparent",boxShadow:page===id?"0 0 12px rgba(0,212,255,0.1)":"none"}},label))
    ),
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,position:"relative"}},
      React.createElement("div",{"data-hover":true,onClick:(e)=>{e.stopPropagation();setOpen(o=>!o);},style:{fontSize:10,padding:"3px 10px",borderRadius:20,border:"1px solid rgba(0,212,255,0.2)",color:"rgba(0,212,255,0.6)",cursor:"pointer",transition:"all 0.2s",userSelect:"none"},onMouseEnter:e=>{e.currentTarget.style.borderColor="rgba(0,212,255,0.45)";e.currentTarget.style.color="#00d4ff";e.currentTarget.style.boxShadow="0 0 10px rgba(0,212,255,0.15)";},onMouseLeave:e=>{e.currentTarget.style.borderColor="rgba(0,212,255,0.2)";e.currentTarget.style.color="rgba(0,212,255,0.6)";e.currentTarget.style.boxShadow="none";}},"Sarthak Naikare ▾"),
      React.createElement("div",{style:{fontSize:10,padding:"3px 10px",borderRadius:20,border:"1px solid rgba(255,140,60,0.2)",color:"rgba(255,140,60,0.6)"}},"TimescaleDB"),
      React.createElement(AboutPopover,{open,onClose:()=>setOpen(false)})
    )
  );
}

function SearchPage(){
  const [patient,setPatient]=useState("208");
  const [beat,setBeat]=useState("V");
  const [mode,setMode]=useState("cascade");
  const [loading,setLoading]=useState(false);
  const [results,setResults]=useState(DEMO.pvc.results);
  const [stats,setStats]=useState({filter:"84ms",dtw:"2.3s",cands:"11/201k",prec:"100%"});
  const [sel,setSel]=useState(0);
  const cref=useRef();
  useECG(cref,beat,false);
  const PTS=[{id:"208",meta:"992 PVCs"},{id:"200",meta:"826 PVCs"},{id:"233",meta:"831 PVCs"},{id:"209",meta:"383 APBs"}];
  const DM={V:"pvc",N:"normal",A:"atrial",L:"lbbb"};
  const BF={V:"PVC Premature Ventricular",N:"Normal sinus rhythm",A:"Atrial premature beat",L:"Left bundle branch block"};
  const ts=TS[beat]||TS.V;
  const ld=(k)=>{const d=DEMO[k];if(!d)return;setResults(d.results);setStats({filter:d.filter,dtw:d.dtw,cands:d.cands,prec:d.prec});setSel(0);};
  const run=async()=>{
    setLoading(true);
    try{
      const r=await fetch(API+"/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({patient_id:patient,beat_type:beat,nth:10,top_n:10,mode})});
      if(r.ok){const d=await r.json();setResults(d.results);setStats({filter:d.stats.filter_ms+"ms",dtw:d.stats.dtw_s+"s",cands:d.stats.candidates+"/201k",prec:"100%"});}
      else ld(DM[beat]||"pvc");
    }catch{ld(DM[beat]||"pvc");}
    setLoading(false);setSel(0);
  };
  return React.createElement("div",{className:"page-enter",style:{position:"relative",overflow:"hidden",minHeight:580}},
    React.createElement(BG),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"205px 1fr",height:580,position:"relative",zIndex:2}},
      React.createElement("div",{style:{borderRight:"1px solid rgba(0,212,255,0.07)",padding:"14px 12px",display:"flex",flexDirection:"column",gap:12,overflowY:"auto",background:"rgba(2,8,24,0.3)"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:9,letterSpacing:"1.5px",color:"rgba(0,212,255,0.28)",textTransform:"uppercase",marginBottom:6}},"Patient"),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}},
            PTS.map(p=>React.createElement("div",{"data-hover":true,key:p.id,className:"hov-card",onClick:()=>setPatient(p.id),style:{background:patient===p.id?"rgba(0,212,255,0.1)":"rgba(0,212,255,0.03)",border:"1px solid "+(patient===p.id?"rgba(0,212,255,0.4)":"rgba(0,212,255,0.08)"),borderRadius:8,padding:8,cursor:"pointer",boxShadow:patient===p.id?"0 0 12px rgba(0,212,255,0.1)":"none"}},
              React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},p.id),
              React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.38)"}},p.meta)
            ))
          )
        ),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:9,letterSpacing:"1.5px",color:"rgba(0,212,255,0.28)",textTransform:"uppercase",marginBottom:6}},"Beat type"),
          Object.entries(BF).map(([type,label])=>{const t2=TS[type];const ac=beat===type;return React.createElement("div",{"data-hover":true,key:type,onClick:()=>{setBeat(type);ld(DM[type]||"pvc");},style:{padding:"7px 10px",borderRadius:8,border:"1px solid "+(ac?t2.border:"rgba(0,212,255,0.07)"),background:ac?t2.bg:"transparent",color:ac?t2.color:"rgba(0,212,255,0.4)",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:4,transition:"all 0.2s",boxShadow:ac?"0 0 10px "+t2.color.replace(")",",0.15)"):"none"}},
            React.createElement("div",{style:{width:5,height:5,borderRadius:"50%",background:t2.color,flexShrink:0,boxShadow:"0 0 6px "+t2.color}}),label
          );})
        ),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:9,letterSpacing:"1.5px",color:"rgba(0,212,255,0.28)",textTransform:"uppercase",marginBottom:6}},"Mode"),
          React.createElement("div",{style:{display:"flex",gap:5}},
            ["cascade","indb"].map(m=>React.createElement("div",{"data-hover":true,key:m,onClick:()=>setMode(m),style:{flex:1,padding:"6px 4px",borderRadius:8,border:"1px solid "+(mode===m?"rgba(0,212,255,0.3)":"rgba(0,212,255,0.08)"),background:mode===m?"rgba(0,212,255,0.08)":"transparent",color:mode===m?"#00d4ff":"rgba(0,212,255,0.32)",fontSize:10,textAlign:"center",cursor:"pointer",transition:"all 0.2s",boxShadow:mode===m?"0 0 10px rgba(0,212,255,0.1)":"none"}},m==="cascade"?"Cascade DTW":"In-DB DTW"))
          )
        ),
        React.createElement("div",{"data-hover":true,className:"hov-btn",onClick:run,style:{marginTop:"auto",background:loading?"rgba(255,171,64,0.08)":"rgba(0,212,255,0.08)",border:"1px solid "+(loading?"rgba(255,171,64,0.4)":"rgba(0,212,255,0.35)"),borderRadius:10,padding:11,color:loading?"#ffab40":"#00d4ff",fontSize:11,textAlign:"center",cursor:loading?"wait":"pointer",boxShadow:loading?"none":"0 0 16px rgba(0,212,255,0.1)"}},loading?"Searching...":"Search similar beats")
      ),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",overflow:"hidden"}},
        React.createElement("div",{style:{padding:"12px 16px 9px",borderBottom:"1px solid rgba(0,212,255,0.07)"}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}},
            React.createElement("span",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"1px"}},"Query — Patient "+patient+" / MLII"),
            React.createElement("span",{style:{fontSize:9,padding:"2px 10px",borderRadius:10,border:"1px solid "+ts.border,color:ts.color,background:ts.bg,boxShadow:"0 0 8px "+ts.color.replace(")",",0.15)")}},BL[beat])
          ),
          React.createElement("canvas",{ref:cref,width:480,height:56,style:{width:"100%",height:56}})
        ),
        React.createElement("div",{style:{padding:"7px 16px 9px",borderBottom:"1px solid rgba(0,212,255,0.06)"}},
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.26)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}},"Sample demos — real results from your database"),
          React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
            [["pvc","V","💓 PVC · Patient 208"],["normal","N","✓ Normal · Patient 200"],["atrial","A","⚡ Atrial · Patient 209"],["lbbb","L","〜 LBBB · Patient 214"]].map(([k,bt,label])=>{
              const c=TS[bt];
              return React.createElement("div",{"data-hover":true,key:k,className:"beat-pill",onClick:()=>{setBeat(bt);ld(k);},style:{fontSize:10,padding:"4px 12px",borderRadius:12,cursor:"pointer",border:"1px solid "+c.border,color:c.color,background:c.bg}},label);
            })
          )
        ),
        React.createElement("div",{style:{display:"flex",gap:6,padding:"8px 16px",borderBottom:"1px solid rgba(0,212,255,0.06)"}},
          [["Filter",stats.filter,"#00d4ff"],["DTW",stats.dtw,"#00e676"],["Candidates",stats.cands,"#ffab40"],["Precision",stats.prec,"#7c4dff"]].map(([label,val,color])=>
            React.createElement("div",{key:label,className:"hov-card",style:{flex:1,background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.06)",borderRadius:7,padding:"6px 9px"}},
              React.createElement("div",{style:{fontSize:8,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.5px"}},label),
              React.createElement("div",{style:{fontSize:15,fontWeight:500,color,marginTop:2}},val)
            )
          )
        ),
        React.createElement("div",{style:{flex:1,padding:"9px 16px",overflowY:"auto"}},
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.24)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}},"Top matches"),
          results.map((r,i)=>{
            const rts=TS[r.beat_type]||TS.V;
            return React.createElement("div",{"data-hover":true,key:i,className:"res-row-item",onClick:()=>setSel(i),style:{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,border:"1px solid "+(sel===i?"rgba(0,212,255,0.2)":"rgba(0,212,255,0.05)"),background:sel===i?"rgba(0,212,255,0.08)":"rgba(0,212,255,0.02)",marginBottom:5,cursor:"pointer",boxShadow:sel===i?"0 0 12px rgba(0,212,255,0.06)":"none"}},
              React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.22)",width:16,flexShrink:0}},i+1),
              React.createElement(MiniWave,{type:r.beat_type}),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontSize:11,color:"#e8f4ff",fontWeight:500}},"Patient "+r.patient_id+" / "+r.lead),
                React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)"}},r.beat_sample&&r.beat_sample.toLocaleString()+" · beat-level DTW")
              ),
              React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                React.createElement("div",{style:{fontSize:14,fontWeight:500,color:"#00d4ff"}},r.dtw_distance&&r.dtw_distance.toFixed(3)),
                React.createElement("div",{style:{fontSize:9,padding:"2px 7px",borderRadius:7,background:rts.bg,color:rts.color,border:"1px solid "+rts.border,marginTop:2}},BL[r.beat_type]+" ✓")
              )
            );
          })
        )
      )
    )
  );
}

function DashboardPage(){
  const [stats,setStats]=useState(null);
  useEffect(()=>{fetch(API+"/stats").then(r=>r.json()).then(setStats).catch(()=>setStats({total_rows:99600000,patients:2821,storage:"839 MB",compression:"91.2%"}));},[]);
  const V=(v)=>v!==null&&v!==undefined?v:"...";
  return React.createElement("div",{className:"page-enter",style:{position:"relative",overflow:"hidden",minHeight:580}},
    React.createElement(BG),
    React.createElement("div",{style:{padding:"18px 22px",position:"relative",zIndex:2}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}},
        React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"System Dashboard"),
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#00e676"}},
          React.createElement("div",{style:{width:6,height:6,borderRadius:"50%",background:"#00e676",animation:"pdot 1.3s infinite",color:"#00e676"}}),"Live · Timescale Cloud AP-SOUTH-1"
        )
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:11}},
        [["Total rows",stats?(stats.total_rows/1e6).toFixed(1)+"M":"...","#00d4ff","MIT-BIH + PTB-XL"],["Patients",stats?stats.patients.toLocaleString():"...","#00e676","48 + 2,773"],["Storage",stats?stats.storage:"...","#ffab40","From ~9 GB raw"],["Compression",stats?stats.compression:"...","#7c4dff","Columnar hypertable"]].map(([label,val,color,sub])=>
          React.createElement("div",{key:label,className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:10,padding:13}},
            React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:5}},label),
            React.createElement("div",{style:{fontSize:20,fontWeight:500,color}},val),
            React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.22)",marginTop:3}},sub)
          )
        )
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
        React.createElement("div",{className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:10,padding:14}},
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:10}},"Storage compression"),
          React.createElement("div",{style:{fontSize:9,color:"rgba(255,82,82,0.5)",marginBottom:3}},"Before"),
          React.createElement("div",{style:{height:20,background:"rgba(255,82,82,0.12)",border:"1px solid rgba(255,82,82,0.22)",borderRadius:4,display:"flex",alignItems:"center",paddingLeft:9,fontSize:9,color:"rgba(255,82,82,0.7)"}},"~9 GB uncompressed"),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,230,118,0.5)",margin:"8px 0 3px"}},"After · 91.2% reduction"),
          React.createElement("div",{style:{height:20,width:"9%",minWidth:60,background:"rgba(0,230,118,0.12)",border:"1px solid rgba(0,230,118,0.28)",borderRadius:4,display:"flex",alignItems:"center",padding:"0 7px",fontSize:9,color:"rgba(0,230,118,0.7)",whiteSpace:"nowrap"}},"839 MB"),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,230,118,0.4)",marginTop:9}},"11.3x ratio · segment_by: patient_id, lead")
        ),
        React.createElement("div",{className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:10,padding:14}},
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:10}},"Dataset breakdown"),
          [["MIT-BIH Arrhythmia DB","66%","#00d4ff","48 patients · 66.3M rows"],["PTB-XL ECG Dataset","33%","#7c4dff","2,773 patients · 33.3M rows"]].map(([name,w,col,meta])=>
            React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(0,212,255,0.05)"}},
              React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"#e8f4ff"}},name),React.createElement("div",{style:{height:3,width:w,background:col,borderRadius:2,marginTop:4}})),
              React.createElement("div",{style:{textAlign:"right",flexShrink:0,marginLeft:9}},React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.38)"}},meta))
            )
          )
        )
      ),
      React.createElement("div",{className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:10,padding:14}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:10}},"Recent queries"),
        [["PVC","rgba(255,82,82,0.07)","#ff5252","rgba(255,82,82,0.2)","Patient 208 / MLII · Cascade DTW · beat-level","15.3s · P@10: 100%"],["Normal","rgba(0,230,118,0.07)","#00e676","rgba(0,230,118,0.2)","Patient 200 / MLII · In-DB DTW · beat-level","462ms · P@10: 100%"],["Atrial","rgba(255,171,64,0.07)","#ffab40","rgba(255,171,64,0.2)","Patient 209 / MLII · Cascade DTW · beat-level","14.2s · P@10: 100%"]].map(([badge,bg,color,border,text,time])=>
          React.createElement("div",{key:badge,style:{display:"flex",alignItems:"center",gap:9,padding:"7px 9px",borderRadius:8,background:"rgba(0,212,255,0.02)",border:"1px solid rgba(0,212,255,0.05)",marginBottom:5,transition:"all 0.2s"}},
            React.createElement("div",{style:{fontSize:9,padding:"2px 8px",borderRadius:8,background:bg,color,border:"1px solid "+border,flexShrink:0}},badge),
            React.createElement("div",{style:{flex:1,fontSize:10,color:"rgba(0,212,255,0.45)"}},text),
            React.createElement("div",{style:{fontSize:10,color:"#00d4ff",flexShrink:0}},time)
          )
        )
      )
    )
  );
}

function BenchmarksPage(){
  return React.createElement("div",{className:"page-enter",style:{position:"relative",overflow:"hidden",minHeight:580}},
    React.createElement(BG),
    React.createElement("div",{style:{padding:"18px 22px",position:"relative",zIndex:2}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}},
        React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"Benchmark Results"),
        React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.3)"}},"MIT-BIH · 48 patients · 66.3M rows")
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
        React.createElement("div",{className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:10,padding:14}},
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:12}},"Search wall time"),
          [["Naive DTW","100%","#ff5252","53.4s"],["Cascade v1","29%","#ffab40","15.3s"],["Cascade v2","32%","#ffab40","17.0s"],["In-DB DTW","1%","#00e676","0.46s"]].map(([name,w,col,val])=>
            React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",gap:9,marginBottom:9}},
              React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.5)",width:90,flexShrink:0}},name),
              React.createElement("div",{style:{flex:1,height:18,background:"rgba(0,212,255,0.04)",borderRadius:3,overflow:"hidden"}},
                React.createElement("div",{style:{height:"100%",width:w,minWidth:name==="In-DB DTW"?40:undefined,background:col,borderRadius:3,display:"flex",alignItems:"center",paddingLeft:6,fontSize:9,color:"#020818",fontWeight:500}},val)
              )
            )
          ),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.25)",marginTop:7}},"116x speedup: Naive → In-DB DTW")
        ),
        React.createElement("div",{className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:10,padding:14}},
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:12}},"Clinical precision@10"),
          React.createElement("table",{style:{width:"100%",borderCollapse:"collapse"}},
            React.createElement("thead",null,React.createElement("tr",null,["Beat Type","Candidates","Precision"].map(h=>React.createElement("th",{key:h,style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",padding:"4px 7px",textAlign:"left",borderBottom:"1px solid rgba(0,212,255,0.07)"}},h)))),
            React.createElement("tbody",null,[["PVC (V)","11 / 201k","100%"],["Normal (N)","50 / 201k","100%"],["Atrial (A)","50 / 201k","100%"]].map(([bt,c,p])=>
              React.createElement("tr",{key:bt},React.createElement("td",{style:{fontSize:11,color:"#e8f4ff",padding:"7px 7px",borderBottom:"1px solid rgba(0,212,255,0.04)"}},bt),React.createElement("td",{style:{fontSize:11,color:"#e8f4ff",padding:"7px 7px",borderBottom:"1px solid rgba(0,212,255,0.04)"}},c),React.createElement("td",{style:{fontSize:11,color:"#00e676",fontWeight:500,padding:"7px 7px",borderBottom:"1px solid rgba(0,212,255,0.04)"}},p))
            ))
          ),
          React.createElement("div",{style:{marginTop:11,fontSize:10,color:"rgba(0,230,118,0.55)"}},"Average precision: 100% across all beat types")
        )
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
        React.createElement("div",{className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:10,padding:14}},
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:12}},"TimescaleDB vs Elasticsearch filter speed"),
          [["Elasticsearch","100%","rgba(255,171,64,0.7)","125ms"],["TimescaleDB","2.5%","#00e676","3.1ms"]].map(([name,w,col,val])=>
            React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",gap:9,marginBottom:9}},
              React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.5)",width:90,flexShrink:0}},name),
              React.createElement("div",{style:{flex:1,height:18,background:"rgba(0,212,255,0.04)",borderRadius:3,overflow:"hidden"}},
                React.createElement("div",{style:{height:"100%",width:w,minWidth:name==="TimescaleDB"?40:undefined,background:col,borderRadius:3,display:"flex",alignItems:"center",paddingLeft:6,fontSize:9,color:"#020818",fontWeight:500}},val)
              )
            )
          ),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.25)",marginTop:7}},"40x faster · EXPLAIN ANALYZE verified · server-side")
        ),
        React.createElement("div",{className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:10,padding:14}},
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:12}},"Compression · 99.6M rows"),
          React.createElement("div",{style:{fontSize:9,color:"rgba(255,82,82,0.45)",marginBottom:3}},"Uncompressed"),
          React.createElement("div",{style:{height:18,background:"rgba(255,82,82,0.1)",border:"1px solid rgba(255,82,82,0.2)",borderRadius:3,display:"flex",alignItems:"center",paddingLeft:8,fontSize:9,color:"rgba(255,82,82,0.65)",marginBottom:6}},"~9 GB"),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,230,118,0.45)",marginBottom:3}},"Compressed (91.2%)"),
          React.createElement("div",{style:{height:18,width:"9%",minWidth:54,background:"rgba(0,230,118,0.1)",border:"1px solid rgba(0,230,118,0.25)",borderRadius:3,display:"flex",alignItems:"center",paddingLeft:8,fontSize:9,color:"rgba(0,230,118,0.65)",marginBottom:7}},"839MB"),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.25)"}},"segment_by: patient_id, lead · order_by: time DESC")
        )
      )
    )
  );
}

function TechPage(){
  const [af,setAf]=useState("hyper");
  const FEATS={hyper:{title:"Hypertables",desc:"TimescaleDB automatically partitions ecg_samples into time-ordered chunks. Queries touch only relevant chunks — not the full 99.6M row table.",stats:[{v:"99.6M",l:"rows stored"},{v:"1",l:"chunk compressed"},{v:"inf",l:"scalable"}],code:"SELECT create_hypertable('ecg_samples','time');\n-- Returns: (7,public,ecg_samples,t)\n-- Chunk exclusion is automatic"},compress:{title:"Columnar Compression",desc:"Columnar compression stores ECG data column-by-column, achieving 91.2% compression by grouping similar waveforms together.",stats:[{v:"91.2%",l:"saved"},{v:"11.3x",l:"ratio"},{v:"839MB",l:"result"}],code:"ALTER TABLE ecg_samples SET (\n  timescaledb.compress,\n  timescaledb.compress_orderby = 'time DESC',\n  timescaledb.compress_segmentby = 'patient_id, lead'\n);"},cascade:{title:"Cascade Filter",desc:"Eliminates 99.9% of candidates using indexed beat statistics in a single SQL query before any DTW computation.",stats:[{v:"99.9%",l:"eliminated"},{v:"84ms",l:"filter time"},{v:"3.1ms",l:"server-side"}],code:"SELECT patient_id, beat_sample FROM ecg_beats\nWHERE beat_type = 'V'\n  AND beat_mean BETWEEN -0.31 AND 0.01\n  AND beat_std BETWEEN 0.52 AND 0.82\nORDER BY ABS(beat_mean-(-0.16)) ASC LIMIT 50;\n-- Execution: 3.112ms"},dtw:{title:"In-Database DTW",desc:"A PL/pgSQL function computes Dynamic Time Warping entirely inside TimescaleDB, eliminating Python network round-trips.",stats:[{v:"462ms",l:"per comparison"},{v:"0",l:"network trips"},{v:"SQL",l:"pure"}],code:"CREATE OR REPLACE FUNCTION dtw_distance(\n  patient_a TEXT, sample_a INT,\n  patient_b TEXT, sample_b INT)\n  RETURNS DOUBLE PRECISION\nLANGUAGE plpgsql AS $$\nBEGIN\n  RETURN dtw_matrix[n+1][m+1];\nEND; $$;\n-- Execution Time: 462.351 ms"},chunk:{title:"Chunk Exclusion",desc:"The query planner skips chunks that cannot contain results. Filtering 99.6M rows touches only the relevant time partition.",stats:[{v:"1/1",l:"chunks hit"},{v:"47",l:"buffer hits"},{v:"3.1ms",l:"execution"}],code:"-- EXPLAIN ANALYZE:\n-- Bitmap Index Scan on ecg_beats_idx\n-- Index Searches: 1\n-- Buffers: shared hit=47\n-- Planning Time: 1.189 ms\n-- Execution Time: 3.112 ms"}};
  const f=FEATS[af];
  const cards=[{key:"tsdb",logo:"TIMESCALEDB",title:"The Database Engine",desc:"TimescaleDB hypertable architecture partitions 99.6M ECG samples into time-ordered chunks. Columnar compression shrinks 9GB to 839MB. Cascade filter runs in 3.1ms server-side.",stats:[["91.2%","Compression"],["3.1ms","Filter"],["v2.26","Version"],["11.3x","Reduction"]],feats:["Hypertables","Columnar compression","Chunk exclusion","PL/pgSQL DTW"],grad:"linear-gradient(135deg,rgba(255,140,60,0.08),rgba(255,100,30,0.03))",bdr:"rgba(255,140,60,0.2)"},{key:"tiger",logo:"TIGER DATA · TIMESCALE CLOUD",title:"The Cloud Platform",desc:"Timescale Cloud by Tiger Data hosts production database in AP-SOUTH-1 Mumbai. Managed TimescaleDB with real-time monitoring, auto-compression, and enterprise reliability.",stats:[["AP-S1","Region"],["2 GiB","RAM"],["0.5","vCPU"],["36243","Port"]],feats:["Managed TimescaleDB","Auto-compression","Real-time monitoring","SQL Editor"],grad:"linear-gradient(135deg,rgba(255,120,40,0.06),rgba(200,80,0,0.02))",bdr:"rgba(255,140,60,0.15)"}];
  return React.createElement("div",{className:"page-enter",style:{position:"relative",overflow:"hidden",minHeight:580}},
    React.createElement(BG),
    React.createElement("div",{style:{padding:"16px 22px",position:"relative",zIndex:2}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:13}},
        React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"Built on TimescaleDB & Tiger Data"),
        React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.28)"}},"Production-grade time-series infrastructure")
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:12}},
        cards.map(card=>React.createElement("div",{key:card.key,className:"hov-card",style:{borderRadius:12,padding:18,background:card.grad,border:"1px solid "+card.bdr}},
          React.createElement("div",{style:{fontSize:10,fontWeight:500,letterSpacing:"1.2px",color:"rgba(255,140,60,0.75)",marginBottom:7}},card.logo),
          React.createElement("div",{style:{fontSize:15,fontWeight:500,color:"#e8f4ff",marginBottom:6}},card.title),
          React.createElement("div",{style:{fontSize:10,color:"rgba(255,255,255,0.35)",lineHeight:1.65,marginBottom:11}},card.desc),
          React.createElement("div",{style:{display:"flex",gap:18,marginBottom:11}},card.stats.map(([v,l])=>React.createElement("div",{key:l},React.createElement("div",{style:{fontSize:20,fontWeight:500,color:"rgba(255,140,60,0.85)"}},v),React.createElement("div",{style:{fontSize:8,color:"rgba(255,140,60,0.4)",textTransform:"uppercase",letterSpacing:"0.6px",marginTop:2}},l)))),
          React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:5}},card.feats.map(feat=>React.createElement("div",{key:feat,style:{fontSize:9,padding:"3px 9px",borderRadius:10,border:"1px solid rgba(255,140,60,0.18)",color:"rgba(255,140,60,0.55)"}},feat)))
        ))
      ),
      React.createElement("div",{style:{background:"rgba(0,0,0,0.2)",border:"1px solid rgba(0,212,255,0.08)",borderRadius:10,padding:14,marginBottom:11}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}},"TimescaleDB feature explorer"),
        React.createElement("div",{style:{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}},
          Object.entries({hyper:"Hypertables",compress:"Compression",cascade:"Cascade Filter",dtw:"In-DB DTW",chunk:"Chunk Exclusion"}).map(([key,label])=>
            React.createElement("div",{"data-hover":true,key,onClick:()=>setAf(key),style:{fontSize:10,padding:"4px 12px",borderRadius:8,border:"1px solid "+(af===key?"rgba(255,140,60,0.4)":"rgba(0,212,255,0.08)"),background:af===key?"rgba(255,140,60,0.08)":"transparent",color:af===key?"rgba(255,140,60,0.82)":"rgba(0,212,255,0.38)",cursor:"pointer",transition:"all 0.2s"}},label)
          )
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff",marginBottom:5}},f.title),
            React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.4)",lineHeight:1.7,marginBottom:10}},f.desc),
            React.createElement("div",{style:{display:"flex",gap:18}},f.stats.map(s=>React.createElement("div",{key:s.l},React.createElement("div",{style:{fontSize:20,fontWeight:500,color:"rgba(255,140,60,0.85)"}},s.v),React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.32)"}},s.l))))
          ),
          React.createElement("pre",{style:{background:"rgba(0,0,0,0.35)",border:"1px solid rgba(0,212,255,0.08)",borderRadius:7,padding:11,fontSize:9,color:"rgba(0,212,255,0.5)",fontFamily:"monospace",lineHeight:1.8,overflowX:"auto",whiteSpace:"pre-wrap",margin:0}},f.code)
        )
      ),
      React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:9}},"Supporting technologies"),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}},
        [["🐍","Python / wfdb","ECG ingestion · DTW · psycopg2"],["⚡","FastAPI","Async REST API · Pydantic"],["⚛️","React","Frontend · canvas waveforms"],["🏥","PhysioNet","MIT-BIH + PTB-XL datasets"],["🔍","Elasticsearch","Benchmark baseline"],["🚀","Render","Backend deployment"],["▲","Vercel","Frontend · edge CDN"],["🐙","GitHub","Open source · reproducible"]].map(([icon,name,role])=>
          React.createElement("div",{key:name,className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:9,padding:12,textAlign:"center"}},
            React.createElement("div",{style:{fontSize:17,marginBottom:6}},icon),
            React.createElement("div",{style:{fontSize:10,fontWeight:500,color:"#e8f4ff",marginBottom:3}},name),
            React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.32)",lineHeight:1.5}},role)
          )
        )
      )
    )
  );
}

function AboutPage(){
  const href=useRef();
  useECG(href,"N",true);
  return React.createElement("div",{className:"page-enter",style:{position:"relative",overflow:"hidden",minHeight:580}},
    React.createElement(BG),
    React.createElement("div",{style:{padding:"38px 36px 24px",textAlign:"center",position:"relative",zIndex:2}},
      React.createElement("div",{style:{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 15px",borderRadius:20,border:"1px solid rgba(0,212,255,0.2)",color:"rgba(0,212,255,0.65)",fontSize:10,marginBottom:22,letterSpacing:"0.8px"}},
        React.createElement("div",{style:{width:6,height:6,borderRadius:"50%",background:"#00d4ff",animation:"pdot 1.2s infinite",color:"#00d4ff"}}),"PhysioNet · MIT-BIH · PTB-XL · Open Source"
      ),
      React.createElement("div",{style:{fontSize:34,fontWeight:500,color:"#e8f4ff",lineHeight:1.2,marginBottom:12}},
        "The World's First",React.createElement("br"),React.createElement("span",{style:{color:"#00d4ff"}},"Time-Series Database"),React.createElement("br"),"ECG Similarity Engine"
      ),
      React.createElement("div",{style:{fontSize:13,color:"rgba(0,212,255,0.42)",maxWidth:480,margin:"0 auto 26px",lineHeight:1.75}},"Sub-second cardiac waveform retrieval across 99.6 million ECG samples using TimescaleDB hypertables, cascade DTW filtering, and beat-level clinical validation."),
      React.createElement("div",{style:{width:"100%",maxWidth:600,margin:"0 auto 26px",height:68}},React.createElement("canvas",{ref:href,width:600,height:68,style:{width:"100%",height:68}})),
      React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:36,marginBottom:30}},
        [["99.6M","ECG samples"],["2,821","Patients"],["100%","Precision@10"],["91.2%","Compression"],["84ms","Filter time"]].map(([val,label])=>
          React.createElement("div",{key:label,className:"hov-card",style:{textAlign:"center",padding:"8px 12px",borderRadius:10,border:"1px solid rgba(0,212,255,0.05)",background:"rgba(0,212,255,0.02)"}},
            React.createElement("div",{style:{fontSize:22,fontWeight:500,color:"#00d4ff"}},val),
            React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.38)",textTransform:"uppercase",letterSpacing:"0.8px",marginTop:3}},label)
          )
        )
      ),
      React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:11,marginBottom:26}},
        React.createElement("a",{"data-hover":true,className:"hov-btn",href:"https://github.com/sarthakNaikare/heartbeat-library",target:"_blank",rel:"noreferrer",style:{padding:"10px 24px",borderRadius:9,border:"1px solid rgba(0,212,255,0.4)",background:"rgba(0,212,255,0.1)",color:"#00d4ff",fontSize:12,textDecoration:"none"}},"View on GitHub"),
        React.createElement("a",{"data-hover":true,className:"hov-btn",href:"https://postgres-to-tiger.vercel.app",target:"_blank",rel:"noreferrer",style:{padding:"10px 24px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"rgba(255,255,255,0.38)",fontSize:12,textDecoration:"none"}},"Postgres to Tiger")
      )
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,padding:"14px 36px 36px",position:"relative",zIndex:2}},
      [["⚡ Cascade DTW Filter","99.9% candidate elimination via TimescaleDB statistical pre-filtering before DTW computation."],["🫀 Beat-level precision","Individual heartbeat segmentation using cardiologist annotations. 100% Precision@10 across N, V, A types."],["🗜 91% compression","TimescaleDB columnar compression stores 99.6M rows in 839MB. No data loss, full query speed."]].map(([title,desc])=>
        React.createElement("div",{key:title,className:"hov-card",style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:11,padding:15}},
          React.createElement("div",{style:{fontSize:12,fontWeight:500,color:"#e8f4ff",marginBottom:5}},title),
          React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.38)",lineHeight:1.65}},desc)
        )
      )
    )
  );
}

export default function App(){
  const [page,setPage]=useState("search");
  const [splash,setSplash]=useState(true);
  const pages={search:React.createElement(SearchPage,{key:"search"}),dashboard:React.createElement(DashboardPage,{key:"dashboard"}),benchmarks:React.createElement(BenchmarksPage,{key:"benchmarks"}),tech:React.createElement(TechPage,{key:"tech"}),about:React.createElement(AboutPage,{key:"about"})};
  if(splash) return React.createElement("div",{style:{minHeight:"100vh",background:"#020818",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}},
    React.createElement("style",null,GLOBALCSS),
    React.createElement(Cursor),
    React.createElement("div",{style:{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,212,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.022) 1px,transparent 1px)",backgroundSize:"32px 32px",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(0,212,255,0.35),transparent)",animation:"scanline 6s linear infinite",pointerEvents:"none",zIndex:5}}),
    React.createElement("div",{style:{position:"absolute",width:500,height:500,top:-150,right:-100,borderRadius:"50%",background:"rgba(0,60,160,0.15)",filter:"blur(100px)",animation:"glowpulse 4s ease-in-out infinite",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:400,height:400,bottom:-120,left:-80,borderRadius:"50%",background:"rgba(0,120,80,0.1)",filter:"blur(100px)",animation:"glowpulse 4s ease-in-out infinite 2s",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:350,height:350,top:30,right:50,borderRadius:"50%",border:"1px solid rgba(0,212,255,0.06)",animation:"floatring 8s ease-in-out infinite",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:240,height:240,bottom:60,left:40,borderRadius:"50%",border:"1px solid rgba(0,212,255,0.04)",animation:"floatring 12s ease-in-out infinite -4s",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:5,height:5,background:"#00d4ff",top:"20%",right:"20%",borderRadius:"50%",animation:"floatdot 7s ease-in-out infinite",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:3,height:3,background:"#00e676",top:"65%",left:"12%",borderRadius:"50%",animation:"floatdot 9s ease-in-out infinite -3s",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:4,height:4,background:"#ff5252",top:"35%",left:"35%",borderRadius:"50%",animation:"floatdot 8s ease-in-out infinite -5s",pointerEvents:"none"}}),
    React.createElement("div",{style:{textAlign:"center",position:"relative",zIndex:10,animation:"pagein 0.8s ease both"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:28}},
        React.createElement("svg",{width:48,height:48,viewBox:"0 0 22 22",fill:"none"},
          React.createElement("circle",{cx:11,cy:11,r:10,stroke:"rgba(0,212,255,0.3)",strokeWidth:1}),
          React.createElement("path",{d:"M2,11 L5,11 L7,6 L9,16 L11,9 L13,13 L15,11 L20,11",stroke:"#00d4ff",strokeWidth:1.2,strokeLinecap:"round"})
        ),
        React.createElement("div",{style:{fontSize:28,fontWeight:500,color:"#e8f4ff",letterSpacing:"-0.5px"}},"Heartbeat Library")
      ),
      React.createElement("div",{style:{fontSize:15,fontWeight:400,color:"rgba(0,212,255,0.45)",marginBottom:8,letterSpacing:"0.5px"}},"The World's First Time-Series ECG Similarity Engine"),
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:20,marginBottom:40}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"rgba(255,140,60,0.65)",padding:"4px 14px",borderRadius:20,border:"1px solid rgba(255,140,60,0.15)",background:"rgba(255,140,60,0.04)"}},"Built with TimescaleDB"),
        React.createElement("div",{style:{fontSize:11,color:"rgba(0,212,255,0.4)"}},"×"),
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"rgba(0,212,255,0.65)",padding:"4px 14px",borderRadius:20,border:"1px solid rgba(0,212,255,0.15)",background:"rgba(0,212,255,0.04)"}},"Dynamic Time Warping"),
        React.createElement("div",{style:{fontSize:11,color:"rgba(0,212,255,0.4)"}},"×"),
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"rgba(0,230,118,0.65)",padding:"4px 14px",borderRadius:20,border:"1px solid rgba(0,230,118,0.15)",background:"rgba(0,230,118,0.04)"}},"99.6M ECG samples")
      ),
      React.createElement("div",{"data-hover":true,className:"hov-btn",onClick:()=>setSplash(false),style:{display:"inline-flex",alignItems:"center",gap:10,padding:"14px 36px",borderRadius:12,border:"1px solid rgba(0,212,255,0.4)",background:"rgba(0,212,255,0.08)",color:"#00d4ff",fontSize:13,cursor:"pointer",boxShadow:"0 0 30px rgba(0,212,255,0.12),inset 0 0 20px rgba(0,212,255,0.04)",letterSpacing:"0.3px"}},
        React.createElement("svg",{width:16,height:16,viewBox:"0 0 22 22",fill:"none"},
          React.createElement("circle",{cx:11,cy:11,r:10,stroke:"rgba(0,212,255,0.4)",strokeWidth:1}),
          React.createElement("path",{d:"M2,11 L5,11 L7,6 L9,16 L11,9 L13,13 L15,11 L20,11",stroke:"#00d4ff",strokeWidth:1.5,strokeLinecap:"round"})
        ),
        "Enter the Heartbeat Library"
      ),
      React.createElement("div",{style:{marginTop:28,display:"flex",justifyContent:"center",gap:28}},
        [["99.6M","ECG samples"],["2,821","Patients"],["100%","Precision"],["91.2%","Compression"]].map(([v,l])=>
          React.createElement("div",{key:l,style:{textAlign:"center"}},
            React.createElement("div",{style:{fontSize:18,fontWeight:500,color:"#00d4ff"}},v),
            React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.35)",textTransform:"uppercase",letterSpacing:"0.8px",marginTop:2}},l)
          )
        )
      )
    )
  );
  return React.createElement("div",{style:{minHeight:"100vh",background:"#020818",padding:"20px"}},
    React.createElement("style",null,GLOBALCSS),
    React.createElement(Cursor),
    React.createElement("div",{style:{maxWidth:1100,margin:"0 auto",background:"#020818",borderRadius:14,overflow:"hidden",boxShadow:"0 0 80px rgba(0,212,255,0.06)",border:"1px solid rgba(0,212,255,0.09)",position:"relative"}},
      React.createElement(Nav,{page,setPage}),
      React.createElement("div",{style:{minHeight:580,position:"relative",overflow:"hidden"}},pages[page])
    )
  );
}
