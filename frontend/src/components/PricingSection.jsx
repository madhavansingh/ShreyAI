import React, { useState } from 'react';

const plans = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    desc: 'Perfect for exploring AI-powered learning',
    color: '#666',
    features: ['3 videos per month','AI chat (50 msgs/video)','Basic summaries','720p video support'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Student',
    price: { monthly: 299, yearly: 199 },
    desc: 'For serious learners who want unlimited access',
    color: '#FF6B00',
    badge: '🔥 Most Popular',
    features: ['Unlimited videos','Unlimited AI chat','Full & 5-min summaries','AI quiz generation','Chapter detection','Session memory','Priority processing'],
    cta: 'Get Student Plan',
    highlight: true,
  },
  {
    name: 'Instructor',
    price: { monthly: 799, yearly: 549 },
    desc: 'For educators creating structured courses',
    color: '#8b5cf6',
    features: ['Everything in Student','Course management','Student analytics','Bulk video upload','Custom quizzes','Progress tracking','Priority support','Early access features'],
    cta: 'Get Instructor Plan',
    highlight: false,
  },
];

export default function PricingSection({ onGetStarted }) {
  const [yearly, setYearly] = useState(false);
  const [hov, setHov] = useState(null);

  return (
    <section style={{ padding:'96px 40px', background:'#030303', borderTop:'1px solid #111' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#FF6B00', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>Pricing</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:800, color:'#fff', marginBottom:12 }}>Simple, transparent pricing</h2>
          <p style={{ fontSize:16, color:'#666', marginBottom:32 }}>Start free. Upgrade when you're ready to unlock everything.</p>

          {/* toggle */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, background:'#111', border:'1px solid #2a2a2a', borderRadius:99, padding:'6px 8px' }}>
            <span style={{ fontSize:13, color:!yearly?'#fff':'#555', fontWeight:!yearly?600:400, padding:'4px 12px', cursor:'pointer' }} onClick={() => setYearly(false)}>Monthly</span>
            <button onClick={() => setYearly(v => !v)} style={{ width:40, height:22, borderRadius:11, border:'none', background:yearly?'#FF6B00':'#333', position:'relative', cursor:'pointer', transition:'background .2s' }}>
              <div style={{ position:'absolute', top:2, left:yearly?20:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s' }} />
            </button>
            <span style={{ fontSize:13, color:yearly?'#fff':'#555', fontWeight:yearly?600:400, padding:'4px 12px', cursor:'pointer' }} onClick={() => setYearly(true)}>
              Yearly <span style={{ color:'#FF6B00', fontSize:11 }}>-33%</span>
            </span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24, alignItems:'start' }}>
          {plans.map(plan => {
            const price = yearly ? plan.price.yearly : plan.price.monthly;
            const isHov = hov === plan.name;
            return (
              <div key={plan.name}
                onMouseEnter={() => setHov(plan.name)}
                onMouseLeave={() => setHov(null)}
                style={{
                  padding:32, borderRadius:24,
                  background: plan.highlight ? '#0d0d0d' : '#0a0a0a',
                  border: `1px solid ${isHov || plan.highlight ? plan.color+'44' : '#1a1a1a'}`,
                  position:'relative', overflow:'hidden',
                  transform: plan.highlight || isHov ? 'translateY(-4px)' : 'none',
                  transition:'all .2s',
                  boxShadow: plan.highlight ? `0 0 60px ${plan.color}18` : 'none',
                }}>
                {plan.highlight && (
                  <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 80% 40% at 50% -10%,${plan.color}12,transparent)`, pointerEvents:'none' }} />
                )}
                {plan.badge && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 12px', borderRadius:99, background:`${plan.color}15`, border:`1px solid ${plan.color}33`, color:plan.color, fontSize:11, fontWeight:700, marginBottom:20 }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontSize:18, fontWeight:800, color:'#fff', marginBottom:4 }}>{plan.name}</div>
                <div style={{ fontSize:12, color:'#555', marginBottom:24, lineHeight:1.5 }}>{plan.desc}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:6 }}>
                  <span style={{ fontSize:13, color:'#555' }}>₹</span>
                  <span style={{ fontSize:48, fontWeight:900, color:price===0?'#fff':plan.color, lineHeight:1 }}>{price}</span>
                  {price > 0 && <span style={{ fontSize:13, color:'#555' }}>/mo</span>}
                </div>
                {yearly && price > 0 && (
                  <div style={{ fontSize:12, color:'#555', marginBottom:24 }}>Billed ₹{price * 12}/year · Save ₹{(plans.find(p=>p.name===plan.name)?.price.monthly - price) * 12}/yr</div>
                )}
                <button onClick={onGetStarted}
                  style={{ width:'100%', padding:'13px', borderRadius:12, border:`1px solid ${plan.color}44`, background:plan.highlight?plan.color:'transparent', color:plan.highlight?'#000':'#fff', fontWeight:700, fontSize:14, cursor:'pointer', marginBottom:28, marginTop: price===0?24:8, transition:'all .15s' }}
                  onMouseOver={e => { if(!plan.highlight) e.currentTarget.style.background=`${plan.color}15`; }}
                  onMouseOut={e => { if(!plan.highlight) e.currentTarget.style.background='transparent'; }}>
                  {plan.cta} →
                </button>
                <div style={{ borderTop:'1px solid #1a1a1a', paddingTop:24, display:'flex', flexDirection:'column', gap:10 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#aaa' }}>
                      <span style={{ color:'#22c55e', fontSize:14 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign:'center', marginTop:48, padding:32, borderRadius:20, background:'#0a0a0a', border:'1px solid #1a1a1a' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#fff', marginBottom:8 }}>🎓 Educational Institution?</div>
          <p style={{ fontSize:14, color:'#666', marginBottom:20 }}>Get custom pricing for schools and universities with 50+ students.</p>
          <button onClick={onGetStarted} style={{ padding:'12px 32px', borderRadius:12, border:'1px solid rgba(255,107,0,.3)', background:'rgba(255,107,0,.1)', color:'#FF6B00', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            Contact Us for Custom Plan →
          </button>
        </div>
      </div>
    </section>
  );
}
