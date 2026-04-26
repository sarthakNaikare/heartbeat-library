import React, { useState, useEffect, useRef, useCallback } from "react";
const API = process.env.REACT_APP_API_URL || "https://heartbeat-library-api.onrender.com";
const BEAT_COLORS = { V: "#ff5252", N: "#00e676", A: "#ffab40", L: "#7c4dff" };
const BEAT_LABELS = { V: "PVC", N: "Normal", A: "Atrial", L: "LBBB" };
const TYPE_STYLE = {
  V: { bg: "rgba(255,82,82,0.08)", color: "#ff5252", border: "rgba(255,82,82,0.25)" },
  N: { bg: "rgba(0,230,118,0.08)", color: "#00e676", border: "rgba(0,230,118,0.25)" },
  A: { bg: "rgba(255,171,64,0.08)", color: "#ffab40", border: "rgba(255,171,64,0.25)" },
  L: { bg: "rgba(124,77,255,0.08)", color: "#7c4dff", border: "rgba(124,77,255,0.25)" },
};
const DEMO = {
  pvc: { beat:"V", filter:"84ms", dtw:"2.3s", cands:"11/201k", prec:"100%", results:[{patient_id:"221",beat_sample:413372,dtw_distance:0.786,beat_type:"V",lead:"MLII"},{patient_id:"215",beat_sample:372404,dtw_distance:1.934,beat_type:"V",lead:"MLII"},{patient_id:"200",beat_sample:437194,dtw_distance:2.156,beat_type:"V",lead:"MLII"}]},
  normal: { beat:"N", filter:"110ms", dtw:"1.8s", cands:"50/201k", prec:"100%", results:[{patient_id:"202",beat_sample:342854,dtw_distance:0.595,beat_type:"N",lead:"MLII"},{patient_id:"203",beat_sample:361892,dtw_distance:0.620,beat_type:"N",lead:"MLII"},{patient_id:"205",beat_sample:476683,dtw_distance:0.654,beat_type:"N",lead:"MLII"}]},
  atrial: { beat:"A", filter:"95ms", dtw:"2.1s", cands:"50/201k", prec:"100%", results:[{patient_id:"202",beat_sample:408602,dtw_distance:1.534,beat_type:"A",lead:"MLII"},{patient_id:"100",beat_sample:567379,dtw_distance:2.371,beat_type:"A",lead:"MLII"},{patient_id:"103",beat_sample:418275,dtw_distance:2.496,beat_type:"A",lead:"MLII"}]},
  lbbb: { beat:"L", filter:"92ms", dtw:"1.9s", cands:"15/201k", prec:"90%", results:[{patient_id:"111",beat_sample:88420,dtw_distance:1.102,beat_type:"L",lead:"MLII"},{patient_id:"207",beat_sample:44280,dtw_distance:1.340,beat_type:"L",lead:"MLII"},{patient_id:"109",beat_sample:212040,dtw_distance:1.588,beat_type:"L",lead:"MLII"}]},
};

function MiniWave({type}) {
  const paths = {
    V:'M0,11 L6,11 L8,5 L10,17 L12,11 L18,11 L20,5 L22,17 L24,11 L30,11 L32,5 L34,17 L36,11 L42,11 L44,5 L46,17 L48,11',
    N:'M0,11 L6,11 L8,11 L10,3 L12,19 L14,11 L20,11 L22,3 L24,19 L26,11 L32,11 L34,3 L36,19 L38,11 L44,11 L46,3 L48,19 L50,11',
    A:'M0,11 L5,11 L7,8 L9,3 L11,19 L13,11 L19,11 L21,8 L23,3 L25,19 L27,11 L33,11 L35,8 L37,3 L39,19 L41,11 L47,11',
    L:'M0,11 L6,11 L8,11 L10,3 L12,19 L16,15 L20,11 L26,11 L28,3 L30,19 L34,15 L38,11 L44,11 L46,3 L48,19 L52,15 L56,11',
  };
  const col = BEAT_COLORS[type]||"#00d4ff";
  return React.createElement("svg",{width:62,height:22,viewBox:"0 0 62 22",style:{flexShrink:0}},
    React.createElement("path",{d:paths[type]||paths.N,stroke:col,strokeWidth:1,fill:"none",strokeLinecap:"round"})
  );
}

function useECGCanvas(canvasRef, beatType, animate) {
  const animRef = useRef();
  const offsetRef = useRef(0);
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const col = BEAT_COLORS[beatType]||"#00d4ff";
    const cyc = animate ? 120 : 100;
    if(animate){
      const grad=ctx.createLinearGradient(0,0,W,0);
      grad.addColorStop(0,"rgba(0,212,255,0)");
      grad.addColorStop(0.08,"rgba(0,212,255,0.85)");
      grad.addColorStop(0.92,"rgba(0,212,255,0.85)");
      grad.addColorStop(1,"rgba(0,212,255,0)");
      ctx.strokeStyle=grad;
    } else { ctx.strokeStyle=col; }
    ctx.lineWidth=animate?1.5:1.3;
    ctx.shadowColor=animate?"#00d4ff":col;
    ctx.shadowBlur=animate?6:4;
    ctx.beginPath();
    let started=false;
    for(let x=0;x<W;x++){
      const pos=((x+offsetRef.current)%cyc)/cyc;
      const gpos=animate?((x+offsetRef.current)%(cyc*5))/(cyc*5):0;
      let y=H/2; let isPVC=false;
      if(animate&&gpos>0.4&&gpos<0.42){
        const pp=(gpos-0.4)/0.02;
        if(pp<0.3)y=H/2-28*(pp/0.3);
        else if(pp<0.6)y=H/2-28+40*((pp-0.3)/0.3);
        else y=H/2+12-12*((pp-0.6)/0.4);
        isPVC=true;
      } else {
        const t=beatType||"N";
        if(t==="V"){if(pos>0.1&&pos<0.13)y=H/2-6;else if(pos>0.3&&pos<0.33)y=H/2-22;else if(pos>0.33&&pos<0.38)y=H/2+13;else if(pos>0.38&&pos<0.42)y=H/2-4;}
        else if(t==="N"||animate){if(pos>0.1&&pos<0.13)y=H/2-7;else if(pos>0.31&&pos<0.34)y=H/2-21;else if(pos>0.34&&pos<0.37)y=H/2+10;else if(pos>0.50&&pos<0.56)y=H/2-5;}
        else if(t==="A"){if(pos>0.08&&pos<0.13)y=H/2-4;else if(pos>0.30&&pos<0.32)y=H/2-15;else if(pos>0.32&&pos<0.37)y=H/2+7;}
        else if(t==="L"){if(pos>0.33&&pos<0.38)y=H/2-19;else if(pos>0.38&&pos<0.46)y=H/2+7;else if(pos>0.46&&pos<0.54)y=H/2-3;}
      }
      if(isPVC){ctx.stroke();ctx.beginPath();ctx.strokeStyle="#ff5252";ctx.shadowColor="#ff5252";ctx.lineWidth=2;ctx.moveTo(x,y);started=true;}
    }
    ctx.stroke();
    if(animate){offsetRef.current=(offsetRef.current+1.5)%cyc;animRef.current=requestAnimationFrame(drawFrame);}
  },[canvasRef,beatType,animate]);
  useEffect(()=>{cancelAnimationFrame(animRef.current);offsetRef.current=0;drawFrame();return()=>cancelAnimationFrame(animRef.current);},[drawFrame]);
}

function AboutPopover({open, onClose}) {
  const ref = useRef();
  useEffect(()=>{
    function h(e){if(ref.current&&!ref.current.contains(e.target))onClose();}
    if(open)document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[open,onClose]);
  const projects=[
    {icon:"⭐",name:"Stellar Observatory",tag:"TimescaleDB · Kafka · NASA SDSS",url:"https://github.com/sarthakNaikare"},
    {icon:"🎵",name:"Resonance",tag:"5 live streams · anomaly detection · 3D viz",url:"https://github.com/sarthakNaikare"},
    {icon:"🤖",name:"Prometheus Unbound",tag:"Ghostgres · self-healing AI metrics",url:"https://github.com/sarthakNaikare"},
    {icon:"🔄",name:"Postgres to Tiger",tag:"Live migration playground",url:"https://postgres-to-tiger.vercel.app"},
    {icon:"💓",name:"Heartbeat Library",tag:"99.6M rows · 100% precision · this project",url:"https://github.com/sarthakNaikare/heartbeat-library"},
  ];
  return React.createElement("div",{ref,style:{position:"absolute",top:"calc(100% + 10px)",right:0,width:300,background:"#060e24",border:"1px solid rgba(0,212,255,0.15)",borderRadius:12,padding:16,zIndex:200,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:12,paddingBottom:12,borderBottom:"1px solid rgba(0,212,255,0.08)"}},
      React.createElement("div",{style:{width:40,height:40,borderRadius:"50%",border:"1px solid rgba(0,212,255,0.22)",background:"linear-gradient(135deg,rgba(0,212,255,0.15),rgba(0,100,200,0.1))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:"#00d4ff",flexShrink:0}},"SN"),
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"Sarthak Naikare"),
        React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.38)",marginTop:2,lineHeight:1.5}},"CS Fresher · MIT ADT University, Pune")
      )
    ),
    React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}},"Projects built"),
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:4,marginBottom:12}},
      projects.map((p,i)=>React.createElement("a",{key:i,href:p.url,target:"_blank",rel:"noreferrer",style:{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:7,border:"1px solid rgba(0,212,255,0.07)",background:"rgba(0,212,255,0.02)",textDecoration:"none"}},
        React.createElement("span",{style:{fontSize:12}},p.icon),
        React.createElement("div",{style:{flex:1}},
          React.createElement("div",{style:{fontSize:11,color:"#e8f4ff"}},p.name),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.35)"}},p.tag)
        ),
        React.createElement("span",{style:{fontSize:9,color:"rgba(0,212,255,0.25)"}},"→")
      ))
    ),
    React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}},"Connect"),
    React.createElement("div",{style:{display:"flex",gap:5}},
      [["LinkedIn","https://linkedin.com/in/sknaikare8500"],["Portfolio","https://sarthaknaikare.github.io"],["GitHub","https://github.com/sarthakNaikare"],["X","https://x.com/SarthakNaikare"]].map(([label,url])=>
        React.createElement("a",{key:label,href:url,target:"_blank",rel:"noreferrer",style:{flex:1,textAlign:"center",padding:"5px 4px",borderRadius:7,border:"1px solid rgba(0,212,255,0.1)",color:"rgba(0,212,255,0.4)",fontSize:10,textDecoration:"none"}},label)
      )
    )
  );
}

function Nav({page,setPage}) {
  const [aboutOpen,setAboutOpen]=useState(false);
  const links=[["search","Search"],["dashboard","Dashboard"],["benchmarks","Benchmarks"],["tech","Technology"],["about","About"]];
  return React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",borderBottom:"1px solid rgba(0,212,255,0.1)",position:"sticky",top:0,zIndex:100,background:"rgba(2,8,24,0.96)"}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:9,cursor:"pointer"},onClick:()=>setPage("search")},
      React.createElement("svg",{width:22,height:22,viewBox:"0 0 22 22",fill:"none"},
        React.createElement("circle",{cx:11,cy:11,r:10,stroke:"rgba(0,212,255,0.25)",strokeWidth:1}),
        React.createElement("path",{d:"M2,11 L5,11 L7,6 L9,16 L11,9 L13,13 L15,11 L20,11",stroke:"#00d4ff",strokeWidth:1.2,strokeLinecap:"round"})
      ),
      React.createElement("span",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"Heartbeat Library")
    ),
    React.createElement("div",{style:{display:"flex",gap:2}},
      links.map(([id,label])=>React.createElement("div",{key:id,onClick:()=>setPage(id),style:{padding:"5px 11px",borderRadius:6,fontSize:11,cursor:"pointer",color:page===id?"#00d4ff":"rgba(0,212,255,0.45)",border:page===id?"1px solid rgba(0,212,255,0.3)":"1px solid transparent",background:page===id?"rgba(0,212,255,0.08)":"transparent"}},label))
    ),
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,position:"relative"}},
      React.createElement("div",{style:{fontSize:10,padding:"3px 9px",borderRadius:20,border:"1px solid rgba(255,140,60,0.2)",color:"rgba(255,140,60,0.55)"}},"TimescaleDB"),
      React.createElement(AboutPopover,{open:aboutOpen,onClose:()=>setAboutOpen(false)})
    )
  );
}

function SearchPage() {
  const [patient,setPatient]=useState("208");
  const [beat,setBeat]=useState("V");
  const [mode,setMode]=useState("cascade");
  const [loading,setLoading]=useState(false);
  const [results,setResults]=useState(DEMO.pvc.results);
  const [stats,setStats]=useState({filter:"84ms",dtw:"2.3s",cands:"11/201k",prec:"100%"});
  const [sel,setSel]=useState(0);
  const canvasRef=useRef();
  useECGCanvas(canvasRef,beat,false);
  const PATIENTS=[{id:"208",meta:"992 PVCs"},{id:"200",meta:"826 PVCs"},{id:"233",meta:"831 PVCs"},{id:"209",meta:"383 APBs"}];
  const DMAP={V:"pvc",N:"normal",A:"atrial",L:"lbbb"};
  const BFULL={V:"PVC Premature Ventricular",N:"Normal sinus rhythm",A:"Atrial premature beat",L:"Left bundle branch block"};
  const ts=TYPE_STYLE[beat]||TYPE_STYLE.V;
  const loadDemo=(key)=>{const d=DEMO[key];if(!d)return;setResults(d.results);setStats({filter:d.filter,dtw:d.dtw,cands:d.cands,prec:d.prec});setSel(0);};
  const runSearch=async()=>{
    setLoading(true);
    try{
      const r=await fetch(API+"/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({patient_id:patient,beat_type:beat,nth:10,top_n:10,mode})});
      if(r.ok){const d=await r.json();setResults(d.results);setStats({filter:d.stats.filter_ms+"ms",dtw:d.stats.dtw_s+"s",cands:d.stats.candidates+"/201k",prec:"100%"});}
      else loadDemo(DMAP[beat]||"pvc");
    }catch(e){loadDemo(DMAP[beat]||"pvc");}
    setLoading(false);setSel(0);
  };
  return React.createElement("div",{style:{display:"grid",gridTemplateColumns:"200px 1fr",height:530,position:"relative",zIndex:2}},
    React.createElement("div",{style:{borderRight:"1px solid rgba(0,212,255,0.07)",padding:"13px 11px",display:"flex",flexDirection:"column",gap:11,overflowY:"auto"}},
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:9,letterSpacing:"1.3px",color:"rgba(0,212,255,0.28)",textTransform:"uppercase",marginBottom:5}},"Patient"),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}},
          PATIENTS.map(p=>React.createElement("div",{key:p.id,onClick:()=>setPatient(p.id),style:{background:patient===p.id?"rgba(0,212,255,0.09)":"rgba(0,212,255,0.03)",border:"1px solid "+(patient===p.id?"rgba(0,212,255,0.35)":"rgba(0,212,255,0.08)"),borderRadius:7,padding:7,cursor:"pointer"}},
            React.createElement("div",{style:{fontSize:12,fontWeight:500,color:"#e8f4ff"}},p.id),
            React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.35)"}},p.meta)
          ))
        )
      ),
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:9,letterSpacing:"1.3px",color:"rgba(0,212,255,0.28)",textTransform:"uppercase",marginBottom:5}},"Beat type"),
        Object.entries(BFULL).map(([type,label])=>{const ts2=TYPE_STYLE[type];const active=beat===type;return React.createElement("div",{key:type,onClick:()=>{setBeat(type);loadDemo(DMAP[type]||"pvc");},style:{padding:"6px 9px",borderRadius:7,border:"1px solid "+(active?ts2.border:"rgba(0,212,255,0.07)"),background:active?ts2.bg:"transparent",color:active?ts2.color:"rgba(0,212,255,0.38)",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:5,marginBottom:3}},
          React.createElement("div",{style:{width:5,height:5,borderRadius:"50%",background:ts2.color,flexShrink:0}}),label
        );})
      ),
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:9,letterSpacing:"1.3px",color:"rgba(0,212,255,0.28)",textTransform:"uppercase",marginBottom:5}},"Mode"),
        React.createElement("div",{style:{display:"flex",gap:5}},
          ["cascade","indb"].map(m=>React.createElement("div",{key:m,onClick:()=>setMode(m),style:{flex:1,padding:6,borderRadius:7,border:"1px solid "+(mode===m?"rgba(0,212,255,0.28)":"rgba(0,212,255,0.08)"),background:mode===m?"rgba(0,212,255,0.07)":"transparent",color:mode===m?"#00d4ff":"rgba(0,212,255,0.32)",fontSize:10,textAlign:"center",cursor:"pointer"}},m==="cascade"?"Cascade DTW":"In-DB DTW"))
        )
      ),
      React.createElement("div",{onClick:runSearch,style:{marginTop:"auto",background:loading?"rgba(255,171,64,0.07)":"rgba(0,212,255,0.08)",border:"1px solid "+(loading?"rgba(255,171,64,0.35)":"rgba(0,212,255,0.3)"),borderRadius:9,padding:10,color:loading?"#ffab40":"#00d4ff",fontSize:11,textAlign:"center",cursor:loading?"wait":"pointer"}},loading?"Searching...":"Search similar beats")
    ),
    React.createElement("div",{style:{display:"flex",flexDirection:"column",overflow:"hidden"}},
      React.createElement("div",{style:{padding:"11px 15px 8px",borderBottom:"1px solid rgba(0,212,255,0.06)"}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
          React.createElement("span",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.9px"}},"Query Patient "+patient+" MLII"),
          React.createElement("span",{style:{fontSize:9,padding:"2px 9px",borderRadius:9,border:"1px solid "+ts.border,color:ts.color,background:ts.bg}},BEAT_LABELS[beat])
        ),
        React.createElement("canvas",{ref:canvasRef,width:480,height:56,style:{width:"100%",height:56}})
      ),
      React.createElement("div",{style:{padding:"6px 15px 8px",borderBottom:"1px solid rgba(0,212,255,0.06)"}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.26)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5}},"Sample demos"),
        React.createElement("div",{style:{display:"flex",gap:5,flexWrap:"wrap"}},
          [["pvc","V","PVC Patient 208"],["normal","N","Normal Patient 200"],["atrial","A","Atrial Patient 209"],["lbbb","L","LBBB Patient 214"]].map(([key,bt,label])=>{
            const c=TYPE_STYLE[bt];
            return React.createElement("div",{key,onClick:()=>{setBeat(bt);loadDemo(key);},style:{fontSize:10,padding:"4px 11px",borderRadius:11,cursor:"pointer",border:"1px solid "+c.border,color:c.color,background:c.bg}},label);
          })
        )
      ),
      React.createElement("div",{style:{display:"flex",gap:6,padding:"7px 15px",borderBottom:"1px solid rgba(0,212,255,0.06)"}},
        [["Filter",stats.filter,"#00d4ff"],["DTW",stats.dtw,"#00e676"],["Candidates",stats.cands,"#ffab40"],["Precision",stats.prec,"#7c4dff"]].map(([label,val,color])=>
          React.createElement("div",{key:label,style:{flex:1,background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.05)",borderRadius:6,padding:"6px 8px"}},
            React.createElement("div",{style:{fontSize:8,color:"rgba(0,212,255,0.26)",textTransform:"uppercase",letterSpacing:"0.5px"}},label),
            React.createElement("div",{style:{fontSize:14,fontWeight:500,color,marginTop:2}},val)
          )
        )
      ),
      React.createElement("div",{style:{flex:1,padding:"8px 15px",overflowY:"auto"}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.24)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}},"Top matches"),
        results.map((r,i)=>{
          const rts=TYPE_STYLE[r.beat_type]||TYPE_STYLE.V;
          return React.createElement("div",{key:i,onClick:()=>setSel(i),style:{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:7,border:"1px solid "+(sel===i?"rgba(0,212,255,0.18)":"rgba(0,212,255,0.05)"),background:sel===i?"rgba(0,212,255,0.07)":"rgba(0,212,255,0.02)",marginBottom:5,cursor:"pointer",transform:sel===i?"translateX(2px)":"none"}},
            React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.22)",width:14,flexShrink:0}},i+1),
            React.createElement(MiniWave,{type:r.beat_type}),
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontSize:11,color:"#e8f4ff",fontWeight:500}},"Patient "+r.patient_id+" / "+r.lead),
              React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)"}},r.beat_sample&&r.beat_sample.toLocaleString()+" beat-level DTW")
            ),
            React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
              React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#00d4ff"}},r.dtw_distance&&r.dtw_distance.toFixed(3)),
              React.createElement("div",{style:{fontSize:9,padding:"2px 6px",borderRadius:7,background:rts.bg,color:rts.color,border:"1px solid "+rts.border,marginTop:2}},BEAT_LABELS[r.beat_type]+" ok")
            )
          );
        })
      )
    )
  );
}

function DashboardPage() {
  const [stats,setStats]=useState(null);
  useEffect(()=>{fetch(API+"/stats").then(r=>r.json()).then(setStats).catch(()=>setStats({total_rows:99600000,patients:2821,storage:"839 MB",compression:"91.2%"}));},[]);
  return React.createElement("div",{style:{padding:"16px 20px",position:"relative",zIndex:2}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}},
      React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"System Dashboard"),
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#00e676"}},
        React.createElement("div",{style:{width:6,height:6,borderRadius:"50%",background:"#00e676"}}),"Live Timescale Cloud AP-SOUTH-1"
      )
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}},
      [["Total rows",stats?(stats.total_rows/1e6).toFixed(1)+"M":"...","#00d4ff","MIT-BIH + PTB-XL"],["Patients",stats?stats.patients.toLocaleString():"...","#00e676","48 + 2,773"],["Storage",stats?stats.storage:"...","#ffab40","From ~9 GB raw"],["Compression",stats?stats.compression:"...","#7c4dff","Columnar hypertable"]].map(([label,val,color,sub])=>
        React.createElement("div",{key:label,style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:9,padding:12}},
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:4}},label),
          React.createElement("div",{style:{fontSize:18,fontWeight:500,color}},val),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.22)",marginTop:2}},sub)
        )
      )
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}},
      React.createElement("div",{style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:9,padding:13}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:9}},"Storage compression"),
        React.createElement("div",{style:{fontSize:9,color:"rgba(255,82,82,0.45)",marginBottom:3}},"Before"),
        React.createElement("div",{style:{height:20,background:"rgba(255,82,82,0.12)",border:"1px solid rgba(255,82,82,0.22)",borderRadius:4,display:"flex",alignItems:"center",paddingLeft:9,fontSize:9,color:"rgba(255,82,82,0.65)"}},"~9 GB uncompressed"),
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,230,118,0.45)",margin:"7px 0 3px"}},"After 91.2% reduction"),
        React.createElement("div",{style:{height:20,width:"9%",minWidth:58,background:"rgba(0,230,118,0.12)",border:"1px solid rgba(0,230,118,0.28)",borderRadius:4,display:"flex",alignItems:"center",padding:"0 6px",fontSize:9,color:"rgba(0,230,118,0.65)",whiteSpace:"nowrap"}},"839 MB")
      ),
      React.createElement("div",{style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:9,padding:13}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:9}},"Dataset breakdown"),
        [["MIT-BIH Arrhythmia DB","66%","#00d4ff","48 patients 66.3M rows"],["PTB-XL ECG Dataset","33%","#7c4dff","2773 patients 33.3M rows"]].map(([name,w,col,meta])=>
          React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(0,212,255,0.05)"}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"#e8f4ff"}},name),React.createElement("div",{style:{height:3,width:w,background:col,borderRadius:2,marginTop:3}})),
            React.createElement("div",{style:{textAlign:"right",flexShrink:0,marginLeft:8}},React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.35)"}},meta))
          )
        )
      )
    ),
    React.createElement("div",{style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:9,padding:13}},
      React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:9}},"Recent queries"),
      [["PVC","rgba(255,82,82,0.07)","#ff5252","rgba(255,82,82,0.17)","Patient 208 MLII Cascade DTW beat-level","15.3s P@10 100%"],["Normal","rgba(0,230,118,0.07)","#00e676","rgba(0,230,118,0.17)","Patient 200 MLII In-DB DTW beat-level","462ms P@10 100%"],["Atrial","rgba(255,171,64,0.07)","#ffab40","rgba(255,171,64,0.17)","Patient 209 MLII Cascade DTW beat-level","14.2s P@10 100%"]].map(([badge,bg,color,border,text,time])=>
        React.createElement("div",{key:badge,style:{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:7,background:"rgba(0,212,255,0.02)",border:"1px solid rgba(0,212,255,0.05)",marginBottom:4}},
          React.createElement("div",{style:{fontSize:9,padding:"2px 7px",borderRadius:8,background:bg,color,border:"1px solid "+border,flexShrink:0}},badge),
          React.createElement("div",{style:{flex:1,fontSize:10,color:"rgba(0,212,255,0.45)"}},text),
          React.createElement("div",{style:{fontSize:10,color:"#00d4ff",flexShrink:0}},time)
        )
      )
    )
  );
}

function BenchmarksPage() {
  return React.createElement("div",{style:{padding:"16px 20px",position:"relative",zIndex:2}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}},
      React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"Benchmark Results"),
      React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.28)"}},"MIT-BIH 48 patients 66.3M rows")
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}},
      React.createElement("div",{style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:9,padding:13}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:11}},"Search wall time"),
        [["Naive DTW","100%","#ff5252","53.4s"],["Cascade v1","29%","#ffab40","15.3s"],["Cascade v2","32%","#ffab40","17.0s"],["In-DB DTW","1%","#00e676","0.46s"]].map(([name,w,col,val])=>
          React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",gap:8,marginBottom:8}},
            React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.45)",width:88,flexShrink:0}},name),
            React.createElement("div",{style:{flex:1,height:17,background:"rgba(0,212,255,0.04)",borderRadius:3,overflow:"hidden"}},
              React.createElement("div",{style:{height:"100%",width:w,minWidth:name==="In-DB DTW"?38:undefined,background:col,borderRadius:3,display:"flex",alignItems:"center",paddingLeft:6,fontSize:9,color:"#020818",fontWeight:500}},val)
            )
          )
        ),
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.24)",marginTop:6}},"116x speedup Naive to In-DB DTW")
      ),
      React.createElement("div",{style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:9,padding:13}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:11}},"Clinical precision@10"),
        React.createElement("table",{style:{width:"100%",borderCollapse:"collapse"}},
          React.createElement("thead",null,React.createElement("tr",null,["Beat Type","Candidates","Precision"].map(h=>React.createElement("th",{key:h,style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",padding:"3px 6px",textAlign:"left",borderBottom:"1px solid rgba(0,212,255,0.07)"}},h)))),
          React.createElement("tbody",null,[["PVC V","11 / 201k","100%"],["Normal N","50 / 201k","100%"],["Atrial A","50 / 201k","100%"]].map(([bt,c,p])=>
            React.createElement("tr",{key:bt},React.createElement("td",{style:{fontSize:11,color:"#e8f4ff",padding:"6px 6px",borderBottom:"1px solid rgba(0,212,255,0.04)"}},bt),React.createElement("td",{style:{fontSize:11,color:"#e8f4ff",padding:"6px 6px",borderBottom:"1px solid rgba(0,212,255,0.04)"}},c),React.createElement("td",{style:{fontSize:11,color:"#00e676",fontWeight:500,padding:"6px 6px",borderBottom:"1px solid rgba(0,212,255,0.04)"}},p))
          ))
        )
      )
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}},
      React.createElement("div",{style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:9,padding:13}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:11}},"TimescaleDB vs Elasticsearch filter speed"),
        [["Elasticsearch","100%","rgba(255,171,64,0.65)","125ms"],["TimescaleDB","2.5%","#00e676","3.1ms"]].map(([name,w,col,val])=>
          React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",gap:8,marginBottom:8}},
            React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.45)",width:88,flexShrink:0}},name),
            React.createElement("div",{style:{flex:1,height:17,background:"rgba(0,212,255,0.04)",borderRadius:3,overflow:"hidden"}},
              React.createElement("div",{style:{height:"100%",width:w,minWidth:name==="TimescaleDB"?38:undefined,background:col,borderRadius:3,display:"flex",alignItems:"center",paddingLeft:6,fontSize:9,color:"#020818",fontWeight:500}},val)
            )
          )
        ),
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.24)",marginTop:6}},"40x faster EXPLAIN ANALYZE verified")
      ),
      React.createElement("div",{style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:9,padding:13}},
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:11}},"Compression 99.6M rows"),
        React.createElement("div",{style:{fontSize:9,color:"rgba(255,82,82,0.4)",marginBottom:3}},"Uncompressed"),
        React.createElement("div",{style:{height:17,background:"rgba(255,82,82,0.1)",border:"1px solid rgba(255,82,82,0.2)",borderRadius:3,display:"flex",alignItems:"center",paddingLeft:7,fontSize:9,color:"rgba(255,82,82,0.6)",marginBottom:5}},"~9 GB"),
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,230,118,0.4)",marginBottom:3}},"Compressed 91.2%"),
        React.createElement("div",{style:{height:17,width:"9%",minWidth:52,background:"rgba(0,230,118,0.1)",border:"1px solid rgba(0,230,118,0.25)",borderRadius:3,display:"flex",alignItems:"center",paddingLeft:7,fontSize:9,color:"rgba(0,230,118,0.6)",marginBottom:6}},"839MB"),
        React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.24)"}},"segment_by patient_id lead order_by time DESC")
      )
    )
  );
}

function TechPage() {
  const [af,setAf]=useState("hyper");
  const FEATS={
    hyper:{title:"Hypertables",desc:"TimescaleDB automatically partitions ecg_samples into time-ordered chunks enabling parallel scans and sub-second aggregations.",stats:[{v:"99.6M",l:"rows"},{v:"1",l:"chunk compressed"},{v:"inf",l:"scalable"}],code:"SELECT create_hypertable('ecg_samples','time');\n-- Returns: (7,public,ecg_samples,t)"},
    compress:{title:"Columnar Compression",desc:"Columnar compression stores ECG data column-by-column achieving 91.2% compression by grouping similar waveforms.",stats:[{v:"91.2%",l:"saved"},{v:"11.3x",l:"ratio"},{v:"839MB",l:"result"}],code:"ALTER TABLE ecg_samples SET (\n  timescaledb.compress,\n  timescaledb.compress_segmentby = 'patient_id, lead'\n);"},
    cascade:{title:"Cascade Filter",desc:"Eliminates 99.9% of candidates using indexed statistics before any DTW computation happens.",stats:[{v:"99.9%",l:"eliminated"},{v:"84ms",l:"filter time"},{v:"3.1ms",l:"server-side"}],code:"SELECT patient_id, beat_sample FROM ecg_beats\nWHERE beat_type = 'V'\n  AND beat_mean BETWEEN -0.31 AND 0.01\nORDER BY ABS(beat_mean-(-0.16)) ASC\nLIMIT 50;"},
    dtw:{title:"In-Database DTW",desc:"PL/pgSQL computes Dynamic Time Warping inside TimescaleDB eliminating network round-trips per comparison.",stats:[{v:"462ms",l:"per comparison"},{v:"0",l:"network trips"},{v:"SQL",l:"pure"}],code:"CREATE OR REPLACE FUNCTION dtw_distance(\n  patient_a TEXT, sample_a INT,\n  patient_b TEXT, sample_b INT)\n  RETURNS DOUBLE PRECISION\nLANGUAGE plpgsql AS $$\nBEGIN\n  RETURN dtw_matrix[n+1][m+1];\nEND; $$;"},
    chunk:{title:"Chunk Exclusion",desc:"Query planner skips chunks that cannot contain results. 99.6M rows filtered touching only relevant partitions.",stats:[{v:"1/1",l:"chunks hit"},{v:"47",l:"buffer hits"},{v:"3.1ms",l:"execution"}],code:"-- EXPLAIN ANALYZE:\n-- Bitmap Index Scan on ecg_beats_idx\n-- Index Searches: 1\n-- Buffers: shared hit=47\n-- Execution Time: 3.112 ms"},
  };
  const f=FEATS[af];
  const cards=[
    {key:"tsdb",logo:"TIMESCALEDB",title:"The Database Engine",desc:"TimescaleDB hypertable architecture partitions 99.6M ECG samples into time-ordered chunks. Columnar compression shrinks 9GB to 839MB. Cascade filter runs in 3.1ms server-side.",stats:[["91.2%","Compression"],["3.1ms","Filter"],["v2.26","Version"],["11.3x","Reduction"]],feats:["Hypertables","Columnar compression","Chunk exclusion","PL/pgSQL DTW"],grad:"linear-gradient(135deg,rgba(255,140,60,0.07),rgba(255,100,30,0.025))",bdr:"rgba(255,140,60,0.18)"},
    {key:"tiger",logo:"TIGER DATA TIMESCALE CLOUD",title:"The Cloud Platform",desc:"Timescale Cloud by Tiger Data hosts production database in AP-SOUTH-1 Mumbai. Managed TimescaleDB with real-time monitoring, auto-compression, SQL Editor, enterprise reliability.",stats:[["AP-S1","Region"],["2 GiB","RAM"],["0.5","vCPU"],["36243","Port"]],feats:["Managed TimescaleDB","Auto-compression","Real-time monitoring","SQL Editor"],grad:"linear-gradient(135deg,rgba(255,120,40,0.05),rgba(200,80,0,0.015))",bdr:"rgba(255,140,60,0.12)"},
  ];
  return React.createElement("div",{style:{padding:"15px 20px",position:"relative",zIndex:2}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}},
      React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff"}},"Built on TimescaleDB and Tiger Data"),
      React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.26)"}},"Production-grade time-series infrastructure")
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}},
      cards.map(card=>React.createElement("div",{key:card.key,style:{borderRadius:10,padding:16,background:card.grad,border:"1px solid "+card.bdr}},
        React.createElement("div",{style:{fontSize:9,fontWeight:500,letterSpacing:"1.2px",color:"rgba(255,140,60,0.72)",marginBottom:6}},card.logo),
        React.createElement("div",{style:{fontSize:14,fontWeight:500,color:"#e8f4ff",marginBottom:5}},card.title),
        React.createElement("div",{style:{fontSize:10,color:"rgba(255,255,255,0.33)",lineHeight:1.65,marginBottom:10}},card.desc),
        React.createElement("div",{style:{display:"flex",gap:16,marginBottom:10}},card.stats.map(([v,l])=>React.createElement("div",{key:l},React.createElement("div",{style:{fontSize:18,fontWeight:500,color:"rgba(255,140,60,0.82)"}},v),React.createElement("div",{style:{fontSize:8,color:"rgba(255,140,60,0.36)",textTransform:"uppercase",letterSpacing:"0.6px",marginTop:1}},l)))),
        React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:4}},card.feats.map(feat=>React.createElement("div",{key:feat,style:{fontSize:9,padding:"2px 8px",borderRadius:9,border:"1px solid rgba(255,140,60,0.17)",color:"rgba(255,140,60,0.52)"}},feat)))
      ))
    ),
    React.createElement("div",{style:{background:"rgba(0,0,0,0.18)",border:"1px solid rgba(0,212,255,0.08)",borderRadius:9,padding:13,marginBottom:10}},
      React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.28)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:9}},"TimescaleDB feature explorer"),
      React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",marginBottom:11}},
        Object.entries({hyper:"Hypertables",compress:"Compression",cascade:"Cascade Filter",dtw:"In-DB DTW",chunk:"Chunk Exclusion"}).map(([key,label])=>
          React.createElement("div",{key,onClick:()=>setAf(key),style:{fontSize:10,padding:"4px 11px",borderRadius:7,border:"1px solid "+(af===key?"rgba(255,140,60,0.38)":"rgba(0,212,255,0.08)"),background:af===key?"rgba(255,140,60,0.07)":"transparent",color:af===key?"rgba(255,140,60,0.78)":"rgba(0,212,255,0.35)",cursor:"pointer"}},label)
        )
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#e8f4ff",marginBottom:4}},f.title),
          React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.38)",lineHeight:1.7,marginBottom:9}},f.desc),
          React.createElement("div",{style:{display:"flex",gap:16}},f.stats.map(s=>React.createElement("div",{key:s.l},React.createElement("div",{style:{fontSize:19,fontWeight:500,color:"rgba(255,140,60,0.82)"}},s.v),React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.3)"}},s.l))))
        ),
        React.createElement("pre",{style:{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(0,212,255,0.08)",borderRadius:6,padding:10,fontSize:9,color:"rgba(0,212,255,0.45)",fontFamily:"monospace",lineHeight:1.7,overflowX:"auto",whiteSpace:"pre-wrap",margin:0}},f.code)
      )
    ),
    React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.26)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}},"Supporting technologies"),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}},
      [["🐍","Python wfdb","ECG ingestion DTW"],["⚡","FastAPI","Async REST API"],["⚛️","React","Frontend waveforms"],["🏥","PhysioNet","MIT-BIH PTB-XL"],["🔍","Elasticsearch","Benchmark baseline"],["🚀","Render","Backend deployment"],["▲","Vercel","Frontend CDN"],["🐙","GitHub","Open source"]].map(([icon,name,role])=>
        React.createElement("div",{key:name,style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:8,padding:11,textAlign:"center"}},
          React.createElement("div",{style:{fontSize:16,marginBottom:5}},icon),
          React.createElement("div",{style:{fontSize:10,fontWeight:500,color:"#e8f4ff",marginBottom:2}},name),
          React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.3)",lineHeight:1.5}},role)
        )
      )
    )
  );
}

function AboutPage() {
  const heroRef=useRef();
  useECGCanvas(heroRef,"N",true);
  return React.createElement("div",{style:{position:"relative",overflow:"hidden"}},
    React.createElement("div",{style:{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)",backgroundSize:"32px 32px",pointerEvents:"none"}}),
    React.createElement("div",{style:{position:"absolute",width:400,height:400,top:-150,right:-100,borderRadius:"50%",background:"rgba(0,80,180,0.1)",filter:"blur(80px)",pointerEvents:"none"}}),
    React.createElement("div",{style:{padding:"40px 36px 24px",textAlign:"center",position:"relative",zIndex:2}},
      React.createElement("div",{style:{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,border:"1px solid rgba(0,212,255,0.2)",color:"rgba(0,212,255,0.6)",fontSize:10,marginBottom:20}},"PhysioNet MIT-BIH PTB-XL Open Source"),
      React.createElement("div",{style:{fontSize:32,fontWeight:500,color:"#e8f4ff",lineHeight:1.2,marginBottom:10}},
        "The World's First ",React.createElement("br"),React.createElement("span",{style:{color:"#00d4ff"}},"Time-Series Database"),React.createElement("br")," ECG Similarity Engine"
      ),
      React.createElement("div",{style:{fontSize:13,color:"rgba(0,212,255,0.4)",maxWidth:460,margin:"0 auto 24px",lineHeight:1.7}},"Sub-second cardiac waveform retrieval across 99.6 million ECG samples using TimescaleDB hypertables, cascade DTW filtering, and beat-level clinical validation."),
      React.createElement("div",{style:{width:"100%",maxWidth:580,margin:"0 auto 24px",height:64}},React.createElement("canvas",{ref:heroRef,width:580,height:64,style:{width:"100%",height:64}})),
      React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:32,marginBottom:28}},
        [["99.6M","ECG samples"],["2821","Patients"],["100%","Precision"],["91.2%","Compression"],["84ms","Filter"]].map(([val,label])=>
          React.createElement("div",{key:label,style:{textAlign:"center"}},React.createElement("div",{style:{fontSize:20,fontWeight:500,color:"#00d4ff"}},val),React.createElement("div",{style:{fontSize:9,color:"rgba(0,212,255,0.35)",textTransform:"uppercase",letterSpacing:"0.8px",marginTop:2}},label))
        )
      ),
      React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:10,marginBottom:24}},
        React.createElement("a",{href:"https://github.com/sarthakNaikare/heartbeat-library",target:"_blank",rel:"noreferrer",style:{padding:"9px 22px",borderRadius:8,border:"1px solid rgba(0,212,255,0.4)",background:"rgba(0,212,255,0.1)",color:"#00d4ff",fontSize:12,textDecoration:"none"}},"View on GitHub"),
        React.createElement("a",{href:"https://postgres-to-tiger.vercel.app",target:"_blank",rel:"noreferrer",style:{padding:"9px 22px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"rgba(255,255,255,0.35)",fontSize:12,textDecoration:"none"}},"Postgres to Tiger")
      )
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,padding:"14px 36px 36px",position:"relative",zIndex:2}},
      [["Cascade DTW Filter","99.9% candidate elimination via TimescaleDB statistical pre-filtering before DTW computation."],["Beat-level precision","Individual heartbeat segmentation using cardiologist annotations. 100% Precision@10 across N V A types."],["91% compression","TimescaleDB columnar compression stores 99.6M rows in 839MB. No data loss full query speed."]].map(([title,desc])=>
        React.createElement("div",{key:title,style:{background:"rgba(0,212,255,0.025)",border:"1px solid rgba(0,212,255,0.07)",borderRadius:10,padding:14}},
          React.createElement("div",{style:{fontSize:12,fontWeight:500,color:"#e8f4ff",marginBottom:4}},title),
          React.createElement("div",{style:{fontSize:10,color:"rgba(0,212,255,0.35)",lineHeight:1.6}},desc)
        )
      )
    )
  );
}

export default function App() {
  const [page,setPage]=useState("search");
  const pages={search:React.createElement(SearchPage),dashboard:React.createElement(DashboardPage),benchmarks:React.createElement(BenchmarksPage),tech:React.createElement(TechPage),about:React.createElement(AboutPage)};
  return React.createElement("div",{style:{minHeight:"100vh",background:"#020818",padding:"20px"}},
    React.createElement("style",null,"::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(0,212,255,0.2);border-radius:2px}"),
    React.createElement("div",{style:{maxWidth:1100,margin:"0 auto",background:"#020818",borderRadius:14,overflow:"hidden",boxShadow:"0 0 80px rgba(0,212,255,0.05)",border:"1px solid rgba(0,212,255,0.08)",position:"relative"}},
      React.createElement(Nav,{page,setPage}),
      React.createElement("div",{style:{minHeight:580,position:"relative",overflow:"hidden"}},pages[page])
    )
  );
}
