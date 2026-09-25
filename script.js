/* Точка переходу — Painted Fox Studio */
(function () {
  'use strict';
  var QUICK_EXIT_URL = 'https://sinoptik.ua/';
  function quickExit(e) { if (e) e.preventDefault(); window.location.replace(QUICK_EXIT_URL); }

  var FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;uniform float uTime,uS,uTx,uTy,uScale,uDive,uDust,uRise,uDripT,uRiseDur,uHasTex,uCols;
uniform sampler2D uTex;
uniform vec4 uB[6];uniform float uWaterRef;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
float gs(float x,float c,float w){float d=(x-c)/w;return exp(-d*d);}
vec3 dc(float t){vec3 g=vec3(1.,.93,.78),pe=vec3(1.,.72,.55),pk=vec3(.95,.55,.67),lv=vec3(.64,.57,.93);
vec3 c=mix(g,pe,smoothstep(0.,.4,t));c=mix(c,vec3(.97,.8,.78),smoothstep(.35,.75,t));return mix(c,vec3(.93,.88,.9),smoothstep(.7,1.,t));}
vec3 scene(vec2 p,float zoom){
p/=zoom;
float br=1.+.03*sin(uTime*.35);
float r=length(p);
vec2 lp=p+normalize(p+1e-5)*.12/max(r,.12);
float lr=log(max(length(lp),.02));
float an=atan(lp.y,lp.x)+uTime*.004;
vec2 u=vec2(an/6.2832*56.,lr*9.);
vec2 ce=floor(u),fr=fract(u);
vec2 pt=vec2(h(ce),h(ce+3.1))*.8+.1;
float d=length(fr-pt);
float on=step(.8,h(ce+7.7));
float tw=.6+.4*sin(uTime*1.3+h(ce)*40.);
float star=(1.-smoothstep(0.,.12,d))*on*tw*smoothstep(.8,1.8,r)*(1.-smoothstep(6.,11.,r));
vec3 col=vec3(0.,0.,.004);
col+=mix(vec3(.16,.15,.17),vec3(.13,.14,.2),h(ce+1.))*star;
float roll=uTx*.012;
vec2 q=mat2(cos(roll),-sin(roll),sin(roll),cos(roll))*p;
q.y-=uTy*.01*q.x;
float cr=1.*br;
float ax=abs(q.x),ay=abs(q.y);
float e=max(ax-cr*.75,0.);
float th=.16*exp(-e*.3)+.008;
float v=ay/th;
float vm=exp(-v*v*1.4);
float xf=exp(-e*.34);
float dop=1.+.12*clamp(-q.x*.5,-1.,1.);
vec3 disk=vec3(1.,.985,.96)*vm*xf*dop*1.05;
vec2 nq=q/max(r,1e-4);
float rr=cr*1.1;
float a1=(r-rr)/.08;float a2=(r-rr*.97)/.05;float arc=exp(-a1*a1)*smoothstep(.05,.9,nq.y)+.7*exp(-a2*a2)*smoothstep(.05,.9,-nq.y);
vec3 ac=vec3(1.,.97,.93)*arc*.45;
float core=1.-smoothstep(cr*.86,cr*1.01,r);
float bloom=exp(-max(r-cr,0.)*3.6);
float halo=exp(-r*1.1);
float st=exp(-abs(p.y)*46.)*exp(-abs(p.x)*.2)+.22*exp(-abs(p.y)*16.)*exp(-abs(p.x)*.4);
col+=disk+ac;
col+=vec3(1.,.93,.84)*bloom*.55+vec3(.85,.8,.9)*halo*.04;
col+=mix(vec3(1.,.9,.8),vec3(.84,.89,1.),smoothstep(1.2,5.,abs(p.x)))*st*.9;
col=mix(col,vec3(1.,.985,.955),clamp(vm*xf,0.,1.)*(1.-smoothstep(cr*.98,cr*1.35,r)));
col=mix(col,vec3(1.,.985,.955),core);
return col;}

vec3 warmLayer(vec2 frag,float of){
vec3 col=vec3(.985,.93,.87);
if(of<=0.)return col;
vec2 g=frag/min(uRes.x,uRes.y)*4.2+vec2(uTime*.02,-uTime*.015);
vec2 ce=floor(g),fr=fract(g);
vec2 pt=vec2(.5)+.3*vec2(sin(uTime*.2+h(ce)*6.28),cos(uTime*.17+h(ce+2.)*6.28));
vec2 dv=fr-pt;
float d=length(dv);
float sz=.06+.06*h(ce+5.);
float fz=(n(vec2(atan(dv.y,dv.x)*2.5+h(ce)*10.,uTime*.25+d*18.))-.5)*sz*.55;
float dd=max(d+fz,0.)/sz;
float on=step(.45,h(ce+9.));
float dt=exp(-dd*dd*2.2)*on;
float hc=h(ce+4.);
vec3 dcol=hc<.36?vec3(.56,.8,.96):(hc<.72?vec3(.94,.7,.84):vec3(1.,1.,1.));
float a=of*(.7+.2*sin(uTime*.5+h(ce)*20.));
return mix(col,dcol,dt*a);}
vec3 portal(vec2 frag){
vec2 uv=(frag-.5*uRes)/(min(uRes.x,uRes.y)*uScale);
float s=clamp(uS,0.,1.);
float mid=sin(3.14159*s);
float zoom=mix(1.,16.,pow(s,2.3));
uv+=sin(uv.yx*5.+uTime*.6)*.012*mid;
float ab=.022*mid*length(uv)*.35;
float wf=smoothstep(.5,.9,s);
vec3 col=vec3(0.);
if(wf<1.){if(ab>.0005){col=vec3(scene(uv*(1.+ab),zoom).r,scene(uv,zoom).g,scene(uv*(1.-ab),zoom).b);}else{col=scene(uv,zoom);}}
col=mix(col,warmLayer(frag,smoothstep(.82,1.,s)),wf);
vec2 vv=frag/uRes-.5;
return col*mix(1.-dot(vv,vv)*.8,1.,wf);}
vec3 water(vec2 frag){
vec2 uv=frag/uRes;float asp=uRes.x/uRes.y;
vec3 col=mix(vec3(.17,.5,.58),vec3(.35,.71,.79),smoothstep(0.,.55,uv.y));
col=mix(col,vec3(.66,.89,.92),smoothstep(.55,1.05,uv.y));
col+=vec3(.09,.07,0.)*(1.-smoothstep(0.,.4,uv.y));
vec2 pos=vec2(uv.x*asp,uv.y);
float u=dot(pos,vec2(.935,.355));
float r=.9*gs(u,.42+.03*sin(uTime*.21),.1)+.6*gs(u,.98+.04*sin(uTime*.17+1.),.15)+.45*gs(u,1.5+.03*sin(uTime*.13+2.),.09);
r*=(.45+.55*smoothstep(0.,1.,uv.y))*(.85+.15*sin(uTime*.35+u*2.));
col+=vec3(1.,.97,.86)*r*.2;
vec2 gp=pos*18.+vec2(sin(uTime*.1)*.5,-uTime*.12);
vec2 gc=floor(gp),gf=fract(gp);
float sp=(1.-smoothstep(0.,.06,length(gf-(vec2(h(gc),h(gc+1.3))*.8+.1))))*step(.86,h(gc+6.));
col+=vec3(1.,1.,.95)*sp*.22;
vec2 vv=uv-.5;
return col*(1.-dot(vv,vv)*.35);}
vec3 dawn(vec2 frag){
vec2 uv=frag/uRes;float asp=uRes.x/uRes.y;
vec3 col=mix(vec3(1.,.86,.74),vec3(.97,.76,.8),smoothstep(0.,.42,uv.y));
col=mix(col,vec3(.72,.72,.9),smoothstep(.45,1.15,uv.y));
col+=vec3(1.,.9,.76)*exp(-length(vec2((uv.x-.5)*asp,uv.y+.06))*3.2)*.45;
float cl=fbm(vec2(uv.x*2.2*asp+uTime*.012,uv.y*8.));
cl=smoothstep(.55,.8,cl)*smoothstep(.08,.3,uv.y)*(1.-smoothstep(.55,.8,uv.y));
return mix(col,vec3(1.,.85,.87),cl*.4);}
vec3 drip1(vec2 frag,float sy,float ci,float fade,float k){
float r1=h(vec2(ci,3.1)),r2=h(vec2(ci,5.7)),r3=h(vec2(ci,8.3)),r4=h(vec2(ci,1.9));
if(r1<.25)return vec3(0.);
float t=uDripT-r4*.45;
if(t<0.)return vec3(0.);
float cx=(ci+.2+.6*r2)*uRes.x/uCols;
float wx=frag.x-cx+sin(frag.y*.018/k+r2*6.)*5.*k;
float wd=(11.+14.*r3)*k;
float head=uRes.y-t*(.3+.4*r1)*uRes.y;
float sc=smoothstep(sy-90.*k,sy+90.*k,frag.y);
float tr=smoothstep(head-8.*k,head+8.*k,frag.y)*sc*exp(-(frag.y-head)/(uRes.y*.2))*exp(-wx*wx/(wd*wd*.45));
float dy=frag.y-head;
float drop=exp(-(wx*wx+dy*dy*.55)/(wd*wd*1.2))*smoothstep(sy-90.*k,sy+90.*k,head);
float a=max(tr*.85,drop)*fade;
float gx=wx/wd*exp(-wx*wx/(wd*wd*.9));
return vec3(gx*a*16.*k,a*8.*k,a);}
vec3 drips(vec2 frag,float sy){
if(uDripT<0.)return vec3(0.);
float fade=1.-smoothstep(uRiseDur,uRiseDur+1.2,uDripT);
if(fade<=0.)return vec3(0.);
float k=uRes.y/900.;
float c0=floor(frag.x/uRes.x*uCols);
vec3 r=vec3(0.);
for(int i=-1;i<=1;i++){vec3 q=drip1(frag,sy,c0+float(i),fade,k);if(q.z>r.z)r=q;}
return r;}
float swp(vec2 o){float k=uRes.y/900.;return n(o*.02/k)*.55+h(floor(o/(1.5*k)))*.45;}
float gPart;
vec4 dissolve(vec2 frag){
gPart=0.;
if(uHasTex<.5)return vec4(0.);
float k=uRes.y/900.;
vec2 fp=frag+vec2(0.,uRise*uRes.y*.9);
float th=uDust*1.25;
vec4 acc=vec4(0.);
float s0=swp(fp);
if(s0>th){vec4 t=texture2D(uTex,vec2(fp.x/uRes.x,1.-fp.y/uRes.y));float wh=(1.-smoothstep(0.,.14,s0-th))*step(.001,uDust);acc=vec4(mix(t.rgb,vec3(1.),wh),t.a);}
if(uDust<=0.)return acc;
float pa=0.;
for(int i=0;i<4;i++){
float fi=float(i);
float sp=(55.+45.*fi)*k;
vec2 o=fp;
for(int j=0;j<3;j++){float a=max(th-swp(o),0.);float an=n(o*.006/k+fi*13.7)*12.566;o=fp-vec2(cos(an),sin(an))*sp*a-vec2(0.,22.*k)*a;}
float a=th-swp(o);
if(a>0.&&a<1.){
float m=step(.5,h(floor(o/(1.6*k))+fi*7.));
float ta=texture2D(uTex,vec2(o.x/uRes.x,1.-o.y/uRes.y)).a;
pa=max(pa,ta*m*pow(1.-a,1.5));
}}
gPart=pa;
return acc;}
vec3 bubble(vec3 col,vec2 frag,vec4 B,float seed){
if(B.w<=0.||B.z<=0.)return col;
vec2 p=frag-B.xy;float R=B.z;float r=length(p);
if(r>R*1.12)return col;
float t=uTime;
float th=atan(p.y,p.x);
float wob=1.+.035*sin(3.*th+t*.9+seed)+.025*sin(5.*th-t*1.3+seed*2.)+.02*sin(2.*th+t*.6+seed*3.);
float d=r/(R*wob);
float inside=1.-smoothstep(.985,1.004,d);
if(uWaterRef>.5){vec3 rc=water(frag-p*(.16*d*d));col=mix(col,rc,inside*B.w);}
float rd=(d-1.)/.012;
float rim=exp(-rd*rd);
float film=pow(clamp(d,0.,1.),5.)*inside*.8+rim*.9;
float fv=fbm(p/R*1.8+vec2(t*.12+seed,-t*.09));
vec3 ir=mix(vec3(.62,.86,1.),vec3(1.),smoothstep(.3,.75,fv));
col+=ir*film*.5*B.w;
vec2 hp=p/(R*wob);
vec2 q1=(hp-vec2(-.4,.44))*vec2(1.,1.7);
float s1=exp(-dot(q1,q1)/.03);
vec2 q2=hp-vec2(.4,-.46);
float s2=exp(-dot(q2,q2)/.006)*.7;
col+=vec3(1.)*(s1*.7+s2)*inside*B.w;
return col;}
void main(){
vec2 frag=gl_FragCoord.xy;
float W=uRes.x,H=uRes.y,k=H/900.;
vec3 col;
if(uRise>0.){
 float B=H*.2;
 float sy=mix(1.35,-.35,uRise)*H;
 float fn=fbm(vec2(frag.x*.004/k,frag.y*.003/k+uTime*1.3));
 float dy=frag.y-sy+(fn-.5)*B*.9;
 float bell=exp(-(dy/B)*(dy/B)*2.);
 vec2 off=vec2((n(vec2(frag.x*.02/k,frag.y*.008/k+uTime*2.))-.5)*40.*k,(fn-.5)*60.*k)*bell;
 float m=smoothstep(-B*.8,B*.8,dy);
 vec3 dr=drips(frag,sy-(fn-.5)*B*.9);
 vec3 dc2=m>0.?dawn(frag+off+dr.xy+vec2(0.,(1.-uRise)*H*.35)):vec3(0.);
 vec3 wc=m<1.?water(frag+off+vec2(0.,uRise*H*.3)):vec3(0.);
 col=mix(wc,dc2,m);
 col=col*(1.-dr.z*.07)+vec3(1.)*dr.z*.2;
 col+=vec3(1.)*smoothstep(.62,.9,fbm(vec2(frag.x*.02/k,frag.y*.003/k+uTime*1.6)))*bell*.22;
 col=mix(col,col*1.06+vec3(.03,.05,.06),bell*.4);
}else if(uDive>=1.){col=water(frag);}
else if(uDive<=0.){col=portal(frag);}
else{
 float B=W*.16;
 float ex=mix(-.35,1.35,uDive)*W;
 float fn=fbm(vec2(frag.x*.003/k,frag.y*.004/k+uTime*1.5));
 float dx=frag.x-ex+(fn-.5)*B*.9;
 float bell=exp(-(dx/B)*(dx/B)*2.);
 vec2 off=vec2((fn-.5)*70.*k,(n(vec2(frag.x*.02/k,frag.y*.01/k+uTime*2.))-.5)*30.*k)*bell;
 float m=smoothstep(-B*.8,B*.8,dx);
 vec3 wc=m<1.?water(frag+off+vec2((1.-uDive)*W*.3,0.)):vec3(0.);
 vec3 pc=m>0.?portal(frag+off-vec2(uDive*W*.35,0.)):vec3(0.);
 col=mix(wc,pc,m);
 col+=vec3(1.)*smoothstep(.62,.9,fbm(vec2(frag.x*.02/k,frag.y*.003/k+uTime*1.6)))*bell*.22;
 col=mix(col,col*1.06+vec3(.03,.05,.06),bell*.4);
}
for(int i=0;i<6;i++){col=bubble(col,frag,uB[i],float(i)*1.7);}
vec4 d=dissolve(frag);
col=mix(col,d.rgb,d.a);
col=mix(col,vec3(1.),gPart);
col+=(h(frag+fract(uTime)*100.)-.5)*.016;
gl_FragColor=vec4(clamp(col,0.,1.),1.);}
`;

  function App() {
    this.cv = document.getElementById('gl');
    this.exitEl = document.getElementById('exit');
    this.stage = 0; this.tw = { from: 0, to: 0, t0: 0, dur: 1 }; this.acc = 0; this.tx = 0; this.ty = 0; this.cx = 0; this.cy = 0;
    this.A = {}; this.phase = null; this.view = 'info'; this.infoVis = true; this.faqVis = false; this.dripStart = null; this.texOn = false;
    this.reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.mq = window.matchMedia('(max-width: 700px)');
    this.pickStage();
    this.initGL();
    this.bind();
    this.t0 = performance.now();
    var self = this;
    requestAnimationFrame(function () { self.loop(); });
  }
  var P = App.prototype;

  P.pickStage = function () {
    this.mobile = this.mq.matches;
    this.st = document.querySelector(this.mobile ? '.stage-m' : '.stage-d');
    this.SW = this.mobile ? 390 : 1040; this.SH = this.mobile ? 844 : 650;
    var q = (n) => this.st.querySelector('[data-ref="' + n + '"]');
    this.titleEl = q('Title'); this.introEl = q('Intro'); this.finalEl = q('Final'); this.faqEl = q('Faq'); this.faqInner = q('FaqInner');
    this.infoEl = q('Info'); this.faqBox = q('FaqBox'); this.dawnEl = q('Dawn'); this.backArr = q('BackArr');
    this.B = [q('B0'), q('B1'), q('B2'), q('B3'), q('B4'), q('B5')];
    if (this.phase === 'water' && this.infoVis) this.replay(this.infoEl);
    if (this.faqVis) this.replay(this.faqBox);
  };

  P.layout = function () {
    this.VW = window.innerWidth; this.VH = window.innerHeight;
    this.sc = Math.min(this.VW / this.SW, this.VH / this.SH);
    var t = 'translate(-50%,-50%) scale(' + this.sc.toFixed(4) + ')';
    document.querySelectorAll('.stage').forEach(function (el) { el.style.transform = t; el.style.marginLeft = '0'; });
    if (this.gl) {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.cv.width = Math.round(this.VW * dpr); this.cv.height = Math.round(this.VH * dpr);
      this.gl.viewport(0, 0, this.cv.width, this.cv.height);
      this.gl.uniform2f(this.u.uRes, this.cv.width, this.cv.height);
      this.gl.uniform1f(this.u.uCols, this.mobile ? 7 : 16);
    }
  };

  P.initGL = function () {
    var c = this.cv;
    var gl = c.getContext('webgl', { antialias: false }) || c.getContext('experimental-webgl');
    if (!gl) { c.style.background = 'radial-gradient(circle at 50% 50%, #FFFFFF 0, #FFF8EE 22%, #000000 40%)'; this.gl = null; this.layout(); return; }
    this.gl = gl;
    var vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    var mk = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    var pr = gl.createProgram();
    gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    var self = this;
    ['uRes', 'uTime', 'uS', 'uTx', 'uTy', 'uScale', 'uDive', 'uDust', 'uRise', 'uDripT', 'uRiseDur', 'uHasTex', 'uCols', 'uTex', 'uB', 'uWaterRef'].forEach(function (k) { self.u[k] = gl.getUniformLocation(pr, k); });
    gl.uniform1f(this.u.uScale, 0.25);
    this.tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.u.uTex, 0);
    this.layout();
  };

  P.bind = function () {
    var self = this;
    var acts = {
      enter: function () { self.go(2); }, wantJoin: function () { self.wantJoin(); }, join: function () { self.doJoin(); },
      openFaq: function () { self.openFaq(); }, closeFaq: function () { self.closeFaq(); },
      backWarm: function () { self.backWarm(); }, backWater: function () { self.backWater(); }
    };
    document.querySelectorAll('[data-act]').forEach(function (el) {
      el.addEventListener('click', function (e) { var f = acts[el.getAttribute('data-act')]; if (f) { e.preventDefault(); f(); } });
    });
    this.exitEl.addEventListener('click', quickExit);
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { quickExit(e); return; }
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); self.input(200); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); self.input(-200); }
    });
    window.addEventListener('wheel', function (e) { e.preventDefault(); self.input(e.deltaY); }, { passive: false });
    window.addEventListener('touchstart', function (e) { self.ty0 = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchmove', function (e) { if (self.ty0 == null) return; e.preventDefault(); var y = e.touches[0].clientY; self.input((self.ty0 - y) * 2.2); self.ty0 = y; }, { passive: false });
    window.addEventListener('touchend', function () { self.ty0 = null; });
    window.addEventListener('pointermove', function (e) { self.tx = (e.clientX / window.innerWidth - 0.5) * 2; self.ty = (e.clientY / window.innerHeight - 0.5) * 2; });
    window.addEventListener('resize', function () { self.layout(); });
    var onMq = function () { self.pickStage(); self.layout(); };
    if (this.mq.addEventListener) this.mq.addEventListener('change', onMq); else this.mq.addListener(onMq);
  };

  P.anim = function (name, from, to, dur, delay) { this.A[name] = { from: from, to: to, t0: performance.now() + (delay || 0) * 1000, dur: this.reduce ? Math.min(dur, 0.7) : dur }; };
  P.av = function (name, now, ease) {
    var a = this.A[name]; if (!a) return 0;
    var k = Math.min(1, Math.max(0, (now - a.t0) / (a.dur * 1000)));
    var e = !ease ? k : (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    return a.from + (a.to - a.from) * e;
  };
  P.done = function (name, now) { var a = this.A[name]; return !a || now >= a.t0 + a.dur * 1000; };
  P.busy = function (now) { return !(this.done('dive', now) && this.done('dust', now) && this.done('rise', now) && this.done('grow', now) && this.done('qa', now)); };

  P.buildTex = function (src) {
    if (!this.gl || !src) return;
    var VW = this.VW, VH = this.VH, s = this.sc;
    var td = Math.min(window.devicePixelRatio || 1, 1.5);
    var cv = document.createElement('canvas');
    cv.width = Math.round(VW * td); cv.height = Math.round(VH * td);
    var g = cv.getContext('2d');
    g.scale(td, td);
    var rrect = function (x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); };
    src.querySelectorAll('.glass').forEach(function (el) {
      var r = el.getBoundingClientRect();
      var br = getComputedStyle(el).borderTopLeftRadius;
      var rad = br.indexOf('%') >= 0 ? Math.min(r.width, r.height) / 2 : Math.min((parseFloat(br) || 0) * s, r.height / 2, r.width / 2);
      rrect(r.left, r.top, r.width, r.height, rad);
      g.fillStyle = 'rgba(255,255,255,0.36)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.stroke();
    });
    var walker = document.createTreeWalker(src, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var txt = node.nodeValue;
      if (!txt || !txt.trim()) continue;
      var cs = getComputedStyle(node.parentElement);
      g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      g.fillStyle = cs.color;
      if ('letterSpacing' in g) g.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      g.textBaseline = 'alphabetic';
      var up = cs.textTransform === 'uppercase';
      var re = /\S+/g, m;
      while ((m = re.exec(txt))) {
        var range = document.createRange();
        range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
        var rs = range.getClientRects(); if (!rs.length) continue;
        var r = rs[0];
        var word = up ? m[0].toUpperCase() : m[0];
        var tm = g.measureText(word);
        var asc = tm.fontBoundingBoxAscent || tm.actualBoundingBoxAscent || parseFloat(cs.fontSize) * 0.8;
        var desc = tm.fontBoundingBoxDescent || tm.actualBoundingBoxDescent || parseFloat(cs.fontSize) * 0.2;
        var hh = r.height / s;
        g.save(); g.translate(r.left, r.top); g.scale(s, s);
        g.fillText(word, 0, (hh - (asc + desc)) / 2 + asc);
        g.restore();
      }
    }
    var gl = this.gl;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    this.texOn = true;
  };
  P.replay = function (el) { if (!el) return; el.setAttribute('data-on', '0'); void el.offsetWidth; el.setAttribute('data-on', '1'); };
  P.later = function (ms, fn) { setTimeout(fn, this.reduce ? Math.min(ms, 400) : ms); };
  P.endDust = function () { delete this.A.dust; this.texOn = false; };

  P.wantJoin = function () {
    var now = performance.now(); if (this.phase || this.busy(now)) return;
    this.phase = 'water'; this.view = 'info'; this.infoVis = true; this.faqVis = false; this.infoPlayed = false;
    this.anim('dive', 0, 1, 2.6, 0);
  };
  P.backWarm = function () {
    var now = performance.now(); if (this.phase !== 'water' || this.busy(now) || this.swapping || this.view !== 'info') return;
    this.phase = null; this.anim('dive', 1, 0, 2.2, 0); this.lock = now + 2400;
  };
  P.openFaq = function () {
    var self = this, now = performance.now(); if (this.phase !== 'water' || this.busy(now) || this.swapping || this.view !== 'info') return;
    this.swapping = true;
    this.buildTex(this.infoEl); this.infoVis = false;
    this.anim('dust', 0, 1, 1.6, 0);
    this.anim('grow', 0, 1, 2.0, 0.15);
    this.later(1500, function () { self.view = 'faq'; self.faqVis = true; self.replay(self.faqBox); self.anim('qa', 0, 1, 1.2, 0); });
    this.later(2300, function () { self.endDust(); self.swapping = false; });
  };
  P.closeFaq = function () {
    var self = this, now = performance.now(); if (this.phase !== 'water' || this.busy(now) || this.swapping || this.view !== 'faq') return;
    this.swapping = true;
    this.buildTex(this.faqBox); this.faqVis = false;
    this.anim('dust', 0, 1, 1.5, 0);
    this.anim('qa', 1, 0, 1.0, 0.25);
    this.anim('grow', 1, 0, 1.9, 0.8);
    this.later(2400, function () { self.view = 'info'; self.infoVis = true; self.replay(self.infoEl); });
    this.later(2800, function () { self.endDust(); self.swapping = false; });
  };
  P.doJoin = function () {
    var now = performance.now(); if (this.phase !== 'water' || this.busy(now) || this.swapping || this.view !== 'info') return;
    this.buildTex(this.infoEl); this.infoVis = false;
    this.phase = 'dawn';
    this.anim('dust', 0, 1, 2.2, 0);
    this.anim('rise', 0, 1, 2.6, 0.5);
    this.dripStart = now + 500; this.riseDur = this.reduce ? 0.7 : 2.6;
  };
  P.backWater = function () {
    var self = this, now = performance.now(); if (this.phase !== 'dawn' || this.busy(now)) return;
    this.phase = 'water'; this.dripStart = null; this.swapping = true;
    this.anim('rise', 1, 0, 2.2, 0);
    this.anim('dust', 1, 0, 1.8, 0.7);
    this.later(2550, function () { self.infoVis = true; self.endDust(); self.swapping = false; });
  };

  P.progress = function (now) {
    var w = this.tw;
    var k = Math.min(1, Math.max(0, (now - w.t0) / (w.dur * 1000)));
    var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    return w.from + (w.to - w.from) * e;
  };
  P.go = function (stage) {
    if (stage === this.stage) return;
    var now = performance.now();
    var from = this.progress(now);
    var to = stage === 2 ? 1 : (stage === 1 ? 0.13 : 0);
    var dur = stage === 2 ? 2.8 : (stage === 1 ? 1.1 : 1.8);
    var wasIn = this.stage === 2;
    this.tw = { from: from, to: to, t0: now, dur: this.reduce ? 0.6 : dur };
    this.stage = stage; this.acc = 0;
    this.lock = now + (stage === 2 || wasIn ? 1200 : 450);
  };
  P.input = function (dy) {
    var now = performance.now();
    if (this.busy(now) || this.swapping) { this.acc = 0; this.quiet = now + 450; return; }
    if (this.quiet && now < this.quiet) { this.quiet = now + 250; return; }
    if (this.lock && now < this.lock) return;
    if (!this.lastIn || now - this.lastIn > 350) this.acc = 0;
    this.lastIn = now;
    this.acc += dy;
    var T = 140;
    if (this.phase === 'dawn') { if (this.acc < -T) { this.acc = 0; this.backWater(); } return; }
    if (this.phase === 'water') {
      if (this.view !== 'info') return;
      if (this.acc > T) { this.acc = 0; this.doJoin(); } else if (this.acc < -T) { this.acc = 0; this.backWarm(); }
      return;
    }
    if (this.stage === 0 && this.acc > 8) this.go(1);
    else if (this.stage === 1 && this.acc > T) this.go(2);
    else if (this.stage === 1 && this.acc < -40) this.go(0);
    else if (this.stage === 2 && this.acc > T && this.progress(now) >= 1) { this.acc = 0; this.wantJoin(); }
    else if (this.stage === 2 && this.acc < -160) this.go(0);
  };

  P.loop = function () {
    var self = this;
    var now = performance.now();
    var time = this.reduce ? 20 : (now - this.t0) / 1000;
    var auto = this.mobile;
    var txT = auto ? Math.sin(time * 0.15) * 0.6 : this.tx;
    var tyT = auto ? Math.cos(time * 0.11) * 0.6 : this.ty;
    this.cx += (txT - this.cx) * 0.03; this.cy += (tyT - this.cy) * 0.03;
    var s = this.progress(now);
    var dive = this.av('dive', now, true), dust = this.av('dust', now, false), rise = this.av('rise', now, true);
    var dripT = this.dripStart ? (now - this.dripStart) / 1000 : -1;
    var VW = this.VW, VH = this.VH, sc = this.sc;
    if (this.gl) {
      var gl = this.gl, u = this.u;
      gl.uniform1f(u.uTime, time); gl.uniform1f(u.uS, s);
      gl.uniform1f(u.uTx, this.cx); gl.uniform1f(u.uTy, this.cy);
      gl.uniform1f(u.uDive, dive); gl.uniform1f(u.uDust, dust); gl.uniform1f(u.uRise, rise);
      gl.uniform1f(u.uDripT, dripT); gl.uniform1f(u.uRiseDur, this.riseDur || 2.6);
      gl.uniform1f(u.uHasTex, this.texOn ? 1 : 0);
      var grow = this.av('grow', now, true), qa = this.av('qa', now, true);
      var bw = (dive > 0 && rise < 1) ? 1 : 0;
      gl.uniform1f(u.uWaterRef, (dive >= 1 && rise <= 0) ? 1 : 0);
      var arr = new Float32Array(24);
      var pr = this.cv.width / VW;
      for (var i = 0; i < 6; i++) {
        var el = this.B[i]; if (!el || !bw) continue;
        var r = el.getBoundingClientRect(); if (!r.width) continue;
        var x = r.left + r.width / 2, y = r.top + r.height / 2, R0 = r.width / 2, al = 1;
        if (i === 0) { var full = Math.hypot(VW, VH) * 0.62; x += (VW / 2 - x) * grow; y += (VH / 2 - y) * grow; R0 += (full - R0) * grow; }
        else { al = qa; R0 *= 0.35 + 0.65 * qa; }
        arr[i * 4] = x * pr; arr[i * 4 + 1] = (VH - y) * pr; arr[i * 4 + 2] = R0 * pr; arr[i * 4 + 3] = al;
      }
      gl.uniform4fv(u.uB, arr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    var cl = function (a, b, x) { return Math.min(1, Math.max(0, (x - a) / (b - a))); };
    var EW = VW / sc, EH = VH / sc;
    if (this.titleEl) { var k0 = cl(0, 0.22, s); this.titleEl.style.opacity = String(1 - k0); this.titleEl.style.filter = 'blur(' + (k0 * 10).toFixed(1) + 'px)'; this.titleEl.style.transform = 'scale(' + (1 + k0 * 0.6).toFixed(3) + ')'; }
    if (this.introEl) this.introEl.style.opacity = String(1 - cl(0, 0.12, s));
    if (this.finalEl) {
      var k = cl(0.86, 1, s);
      var on = s > 0.93 ? '1' : '0';
      if (this.finalEl.getAttribute('data-on') !== on) this.finalEl.setAttribute('data-on', on);
      this.finalEl.style.opacity = String(dive >= 1 ? 0 : k);
      this.finalEl.style.transform = 'translateX(' + (dive * EW * 1.1).toFixed(1) + 'px)';
      this.finalEl.style.pointerEvents = (k > 0.9 && !this.phase && dive === 0) ? 'auto' : 'none';
    }
    if (this.faqEl) {
      var ox = (-0.35 + 1.7 * dive - 1.35) * EW;
      this.faqEl.style.opacity = dive > 0 && rise < 1 ? '1' : '0';
      this.faqEl.style.transform = 'translate(' + ox.toFixed(1) + 'px,' + (rise * EH * 0.9).toFixed(1) + 'px)';
      this.faqEl.style.pointerEvents = (this.phase === 'water' && !this.busy(now) && !this.swapping) ? 'auto' : 'none';
    }
    if (this.phase === 'water' && !this.infoPlayed && dive > 0.55 && this.infoEl) { this.infoPlayed = true; this.replay(this.infoEl); }
    if (this.infoEl) { this.infoEl.style.opacity = this.infoVis ? '1' : '0'; this.infoEl.style.pointerEvents = this.infoVis ? 'auto' : 'none'; }
    if (this.backArr) { var v = this.phase === 'water' && this.view === 'info' && !this.swapping; this.backArr.style.opacity = v ? '1' : '0'; this.backArr.style.pointerEvents = v ? 'auto' : 'none'; }
    if (this.faqBox) { this.faqBox.style.opacity = this.faqVis ? '1' : '0'; this.faqBox.style.pointerEvents = this.faqVis ? 'auto' : 'none'; }
    if (this.dawnEl) {
      var kd = cl(0.45, 0.9, rise);
      var dr = dripT > 0 ? cl(0, (this.riseDur || 2.6) + 1.2, dripT) : 1;
      this.dawnEl.style.opacity = String(kd);
      this.dawnEl.style.transform = 'translateY(' + (-(1 - rise) * EH * 0.6).toFixed(1) + 'px)';
      this.dawnEl.style.filter = dr < 1 ? 'blur(' + ((1 - dr) * 2.5).toFixed(2) + 'px)' : 'none';
      this.dawnEl.style.pointerEvents = (this.phase === 'dawn' && rise >= 1) ? 'auto' : 'none';
    }
    if (this.exitEl) this.exitEl.style.color = rise > 0.5 ? '#3A2A38' : (dive > 0.5 ? '#0E3344' : (s > 0.62 ? '#2E2330' : '#EFE6F2'));
    requestAnimationFrame(function () { self.loop(); });
  };

  function start() { new App(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start); else window.addEventListener('load', start);
})();
