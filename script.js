const DEFAULT_VALUES = {
  balance: 300000,
  rate: 10,
  years: 25,
  months: 0,
  system: "sac",
  monthlyExtra: 500,
  periodicExtra: 0,
  periodicFrequency: 12,
  oneTimeExtra: 0,
  oneTimeMonth: 12
};

const $ = id => document.getElementById(id);
const brl = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const compact = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",notation:"compact",maximumFractionDigits:1});
let chart;

function parseMoney(value){
  const clean=String(value).replace(/\s/g,"").replace(/R\$/g,"").replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,"");
  const n=Number(clean);
  return Number.isFinite(n)?n:0;
}
function formatMoneyInput(el){
  el.value=parseMoney(el.value).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
}
function monthlyRate(annual){ return Math.pow(1+annual/100,1/12)-1; }

function simulate(v, useExtras){
  let balance=v.balance, month=0, totalInterest=0;
  const rate=monthlyRate(v.rate);
  const sacAmort=v.balance/v.totalMonths;
  const pricePayment=rate===0?v.balance/v.totalMonths:v.balance*rate/(1-Math.pow(1+rate,-v.totalMonths));
  const rows=[{month:0,balance}];

  while(balance>0.005 && month<v.totalMonths+600){
    month++;
    const interest=balance*rate;
    let scheduled=v.system==="sac"?sacAmort:Math.max(pricePayment-interest,0);
    scheduled=Math.min(scheduled,balance);

    let extra=0;
    if(useExtras){
      extra+=v.monthlyExtra;
      if(v.periodicExtra>0 && month%v.periodicFrequency===0) extra+=v.periodicExtra;
      if(v.oneTimeExtra>0 && month===v.oneTimeMonth) extra+=v.oneTimeExtra;
    }

    const amort=Math.min(scheduled+extra,balance);
    totalInterest+=interest;
    balance=Math.max(0,balance-amort);
    rows.push({month,balance});
    if(amort<=0) break;
  }
  return {months:month,totalInterest,rows};
}

function duration(months){
  const y=Math.floor(months/12), m=months%12, parts=[];
  if(y) parts.push(`${y} ano${y===1?"":"s"}`);
  if(m) parts.push(`${m} ${m===1?"mês":"meses"}`);
  return parts.join(" e ")||"0 meses";
}

function getValues(){
  return {
    balance:parseMoney($("balance").value),
    rate:Number($("rate").value),
    totalMonths:Number($("years").value)*12+Number($("months").value),
    system:$("system").value,
    monthlyExtra:parseMoney($("monthly-extra").value),
    periodicExtra:parseMoney($("annual-extra").value),
    periodicFrequency:Number($("annual-extra-month").value),
    oneTimeExtra:parseMoney($("one-time-extra").value),
    oneTimeMonth:Number($("one-time-month").value)
  };
}

function validate(v){
  if(v.balance<=0) return "Informe um saldo devedor maior que zero.";
  if(v.rate<0||v.rate>100) return "Informe uma taxa válida.";
  if(v.totalMonths<1) return "Informe o prazo restante.";
  if(v.monthlyExtra<0||v.periodicExtra<0||v.oneTimeExtra<0) return "Valores extras não podem ser negativos.";
  return "";
}

function renderChart(base, extra){
  const max=Math.max(base.months,extra.months);
  const labels=[], a=[], b=[];
  for(let m=0;m<=max;m+=12){
    labels.push(`${Math.floor(m/12)}a`);
    a.push(base.rows[Math.min(m,base.rows.length-1)]?.balance||0);
    b.push(extra.rows[Math.min(m,extra.rows.length-1)]?.balance||0);
  }
  const data={labels,datasets:[
    {label:"Sem extras",data:a,borderColor:"#5d513d",borderWidth:3,pointRadius:0,tension:.18},
    {label:"Com extras",data:b,borderColor:"#d3a928",borderWidth:3,pointRadius:0,tension:.18}
  ]};
  if(chart){chart.data=data;chart.update();return;}
  chart=new Chart($("balance-chart"),{type:"line",data,options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${brl.format(c.raw)}`}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{callback:v=>compact.format(v)}}}}});
}

function calculate(){
  const v=getValues();
  const error=validate(v);
  $("error").textContent=error;
  if(error) return;

  const base=simulate(v,false);
  const extra=simulate(v,true);
  $("time-saved").textContent=duration(Math.max(0,base.months-extra.months));
  $("interest-saved").textContent=brl.format(Math.max(0,base.totalInterest-extra.totalInterest));
  $("new-term").textContent=duration(extra.months);
  $("base-interest").textContent=brl.format(base.totalInterest);
  $("extra-interest").textContent=brl.format(extra.totalInterest);
  renderChart(base,extra);
}

function restoreDefaults(){
  $("balance").value=DEFAULT_VALUES.balance.toLocaleString("pt-BR",{minimumFractionDigits:2});
  $("rate").value=DEFAULT_VALUES.rate;
  $("years").value=DEFAULT_VALUES.years;
  $("months").value=DEFAULT_VALUES.months;
  $("system").value=DEFAULT_VALUES.system;
  $("monthly-extra").value=DEFAULT_VALUES.monthlyExtra.toLocaleString("pt-BR",{minimumFractionDigits:2});
  $("annual-extra").value=DEFAULT_VALUES.periodicExtra.toLocaleString("pt-BR",{minimumFractionDigits:2});
  $("annual-extra-month").value=DEFAULT_VALUES.periodicFrequency;
  $("one-time-extra").value=DEFAULT_VALUES.oneTimeExtra.toLocaleString("pt-BR",{minimumFractionDigits:2});
  $("one-time-month").value=DEFAULT_VALUES.oneTimeMonth;
  calculate();
}

$("payoff-form").addEventListener("submit",e=>{
  e.preventDefault();
  ["balance","monthly-extra","annual-extra","one-time-extra"].forEach(id=>formatMoneyInput($(id)));
  calculate();
});
$("reset").addEventListener("click",restoreDefaults);
["balance","monthly-extra","annual-extra","one-time-extra"].forEach(id=>$(id).addEventListener("blur",()=>formatMoneyInput($(id))));
window.addEventListener("DOMContentLoaded",restoreDefaults);
