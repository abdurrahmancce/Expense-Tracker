// ===========================
// Initialization
// ===========================
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let salamis = JSON.parse(localStorage.getItem("salamis")) || [];
let monthlyChart, yearlyChart;

// For editing
let editingExpenseIndex = -1;
let editingEidIndex = -1;

// ===========================
// Dark Mode
// ===========================
const toggleBtn = document.getElementById("toggleDarkMode");
let isDark = JSON.parse(localStorage.getItem("darkMode")) || false;

function applyDarkMode() {
  if (isDark) {
    document.body.classList.add("dark-mode");
    toggleBtn.textContent = "☀️ Light Mode";
  } else {
    document.body.classList.remove("dark-mode");
    toggleBtn.textContent = "🌙 Dark Mode";
  }
  localStorage.setItem("darkMode", JSON.stringify(isDark));
}

toggleBtn.addEventListener("click", () => {
  isDark = !isDark;
  applyDarkMode();
});

// ===========================
// Expense Functions
// ===========================
function addExpense(){
  const item=document.getElementById("item").value;
  const amount=parseFloat(document.getElementById("amount").value);
  const date=document.getElementById("date").value;
  if(!item || !amount || !date){ alert("Fill all fields!"); return; }

  if(editingExpenseIndex === -1){
    expenses.push({item,amount,date});
  } else {
    expenses[editingExpenseIndex] = {item,amount,date};
    editingExpenseIndex = -1;
  }

  localStorage.setItem("expenses",JSON.stringify(expenses));
  document.getElementById("item").value="";
  document.getElementById("amount").value="";
  document.getElementById("date").value="";
  renderExpenses();
  renderMonthlyYearlyTables();
  renderCharts();
}

function editExpense(i){
  const e = expenses[i];
  document.getElementById("item").value = e.item;
  document.getElementById("amount").value = e.amount;
  document.getElementById("date").value = e.date;
  editingExpenseIndex = i;
}

function deleteExpense(i){
  expenses.splice(i,1);
  localStorage.setItem("expenses",JSON.stringify(expenses));
  renderExpenses();
  renderMonthlyYearlyTables();
  renderCharts();
}

function renderExpenses(){
  const tbody=document.querySelector("#expenseTable tbody");
  tbody.innerHTML="";
  expenses.forEach((e,i)=>{
    tbody.innerHTML+=`<tr>
      <td>${e.item}</td><td>${e.amount}</td><td>${e.date}</td>
      <td>
        <button onclick="editExpense(${i})">Edit</button>
        <button onclick="deleteExpense(${i})">Delete</button>
      </td>
    </tr>`;
  });
}

// ===========================
// Monthly & Yearly Tables
// ===========================
function renderMonthlyYearlyTables(){
  const monthlyTables=document.getElementById("monthlyTables");
  const yearlyTables=document.getElementById("yearlyTables");
  monthlyTables.innerHTML=""; yearlyTables.innerHTML="";
  const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthlyData={}, yearlyData={};
  
  expenses.forEach(e=>{
    const dt=new Date(e.date);
    const y=dt.getFullYear();
    const m=dt.getMonth();
    if(!monthlyData[y]) monthlyData[y]={};
    if(!monthlyData[y][m]) monthlyData[y][m]=[];
    monthlyData[y][m].push(e);
    yearlyData[y]=(yearlyData[y]||0)+e.amount;
  });

  for(let y in monthlyData){
    const div=document.createElement("div");
    div.innerHTML=`<h3>Year: ${y}</h3>`;
    for(let m=0; m<12; m++){
      const data = monthlyData[y][m] || [];
      if(data.length===0) continue;
      const total = data.reduce((sum,d)=>sum+d.amount,0);
      let t=`<h4>${months[m]} - Total: ${total}</h4>
        <div class="table-wrapper">
        <table><tr><th>Item</th><th>Amount</th><th>Date</th></tr>`;
      data.forEach(d=>{ t+=`<tr><td>${d.item}</td><td>${d.amount}</td><td>${d.date}</td></tr>`; });
      t+="</table></div>";
      div.innerHTML+=t;
    }
    monthlyTables.appendChild(div);
  }

  for(let y in yearlyData){
    yearlyTables.innerHTML+=`<h3>Year: ${y} - Total: ${yearlyData[y]}</h3>`;
  }
}

// ===========================
// Charts
// ===========================
function renderCharts(){
  const monthlyTotals={}, yearlyTotals={};
  expenses.forEach(e=>{
    const dt=new Date(e.date);
    const y=dt.getFullYear(), m=dt.getMonth();
    const key=`${y}-${m+1}`;
    monthlyTotals[key]=(monthlyTotals[key]||0)+e.amount;
    yearlyTotals[y]=(yearlyTotals[y]||0)+e.amount;
  });

  if(monthlyChart) monthlyChart.destroy();
  monthlyChart=new Chart(document.getElementById("monthlyChart"),{
    type:"bar",
    data:{labels:Object.keys(monthlyTotals), datasets:[{label:"Monthly Spending", data:Object.values(monthlyTotals), backgroundColor:"#36a2eb"}]},
    options:{scales:{y:{beginAtZero:true}}}
  });

  if(yearlyChart) yearlyChart.destroy();
  yearlyChart=new Chart(document.getElementById("yearlyChart"),{
    type:"pie",
    data:{labels:Object.keys(yearlyTotals), datasets:[{data:Object.values(yearlyTotals), backgroundColor:["#ff6384","#36a2eb","#ffce56","#4caf50","#9c27b0","#ff9f40","#4bc0c0","#9966ff","#c9cbcf","#ff6384","#36a2eb","#ffce56"]}]}
  });
}

// ===========================
// Bonus/Income Section
// ===========================
const eidForm=document.getElementById("eidForm");
const eidTables=document.getElementById("eidTables");

eidForm.addEventListener("submit", e=>{
  e.preventDefault();
  const year=document.getElementById("eidYear").value;
  const month=document.getElementById("eidMonth").value;
  const date=document.getElementById("eidDate").value;
  const giver=document.getElementById("eidGiver").value;
  const amount=parseFloat(document.getElementById("eidAmount").value);
  if(!year||!month||!date||!giver||!amount){alert("Fill all fields!"); return;}

  if(editingEidIndex === -1){
    salamis.push({year,month,date,giver,amount});
  } else {
    salamis[editingEidIndex] = {year,month,date,giver,amount};
    editingEidIndex = -1;
  }

  localStorage.setItem("salamis",JSON.stringify(salamis));
  eidForm.reset();
  renderEidTables();
});

function editEidEntry(i){
  const s = salamis[i];
  document.getElementById("eidYear").value = s.year;
  document.getElementById("eidMonth").value = s.month;
  document.getElementById("eidDate").value = s.date;
  document.getElementById("eidGiver").value = s.giver;
  document.getElementById("eidAmount").value = s.amount;
  editingEidIndex = i;
}

function deleteEidEntry(i){ 
  salamis.splice(i,1); 
  localStorage.setItem("salamis",JSON.stringify(salamis)); 
  renderEidTables(); 
}

function renderEidTables(){
  const grouped={};
  salamis.forEach((s,i)=>{
    if(!grouped[s.year]) grouped[s.year]={};
    if(!grouped[s.year][s.month]) grouped[s.year][s.month]=[];
    grouped[s.year][s.month].push({...s,index:i});
  });
  eidTables.innerHTML="";
  for(let y in grouped){
    const div=document.createElement("div");
    div.innerHTML=`<h3>Year: ${y}</h3>`;
    for(let m in grouped[y]){
      let t=`<h4>${m}</h4><div class="table-wrapper"><table>
        <tr><th>Date</th><th>Giver</th><th>Amount</th><th>Action</th></tr>`;
      grouped[y][m].forEach(s=>{
        t+=`<tr>
          <td>${s.date}</td><td>${s.giver}</td><td>${s.amount}</td>
          <td>
            <button onclick="editEidEntry(${s.index})">Edit</button>
            <button onclick="deleteEidEntry(${s.index})">Delete</button>
          </td>
        </tr>`;
      });
      t+="</table></div>";
      div.innerHTML+=t;
    }
    eidTables.appendChild(div);
  }
}

// ===========================
// On Load
// ===========================
window.onload=()=>{
  renderExpenses();
  renderMonthlyYearlyTables();
  renderCharts();
  renderEidTables();
  applyDarkMode();
};
