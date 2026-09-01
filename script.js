// Firebase Setup

const firebaseConfig = {
  apiKey: "AIzaSyCwOhzNXM0ia2BF9XYiweQ9hlzhl5H7-l4",
  authDomain: "expense-tracker-10592.firebaseapp.com",
  projectId: "expense-tracker-10592",
  storageBucket: "expense-tracker-10592.firebasestorage.app",
  messagingSenderId: "863211273020",
  appId: "1:863211273020:web:d79b5141274175012d3c39"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// Data (loaded from Firestore after login)

let expenses = [];
let salamis = [];
let monthlyChart, yearlyChart;

// For editing
let editingExpenseIndex = -1;
let editingEidIndex = -1;

// For the "All Expenses" dropdown month filter ("all" or "YYYY-M")
let currentExpenseFilter = "all";

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Auth Screen elements & tab switching

const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const authError = document.getElementById("authError");

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

loginTab.addEventListener("click", () => switchAuthTab("login"));
signupTab.addEventListener("click", () => switchAuthTab("signup"));

function switchAuthTab(tab){
  authError.textContent = "";
  if(tab === "login"){
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
  } else {
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  }
}

// Sign up / Login / Logout

document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = document.getElementById("signupEmail").value.trim();
  const pass = document.getElementById("signupPassword").value;
  authError.textContent = "";
  if(!email || !pass){ authError.textContent = "Email o password din."; return; }
  try {
    await auth.createUserWithEmailAndPassword(email, pass);
  } catch(err){
    authError.textContent = err.message;
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;
  authError.textContent = "";
  if(!email || !pass){ authError.textContent = "Email o password din."; return; }
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch(err){
    authError.textContent = err.message;
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  auth.signOut();
});

// Auth State Listener - drives the whole app

auth.onAuthStateChanged(async (user) => {
  if(user){
    currentUser = user;
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    await loadUserData();

    renderExpenseMonthNav();
    renderExpenses();
    renderMonthlyYearlyTables();
    renderCharts();
    renderEidTables();
    applyDarkMode();
    checkForOldLocalData();
  } else {
    currentUser = null;
    appScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
  }
});

// Firestore Load / Save

async function loadUserData(){
  const docRef = db.collection("users").doc(currentUser.uid);
  const docSnap = await docRef.get();

  if(docSnap.exists){
    const data = docSnap.data();
    expenses = data.expenses || [];
    salamis = data.salamis || [];
    isDark = data.darkMode || false;
  } else {
    expenses = [];
    salamis = [];
    isDark = false;
    await docRef.set({ expenses, salamis, darkMode: isDark });
  }
}

async function saveUserData(){
  if(!currentUser) return;
  await db.collection("users").doc(currentUser.uid).set({
    expenses,
    salamis,
    darkMode: isDark
  });
}

// Migrate old localStorage data (this device only, one-time)

function checkForOldLocalData(){
  const oldExpenses = JSON.parse(localStorage.getItem("expenses") || "null");
  const oldSalamis = JSON.parse(localStorage.getItem("salamis") || "null");
  const migrateBtn = document.getElementById("migrateBtn");

  if((oldExpenses && oldExpenses.length) || (oldSalamis && oldSalamis.length)){
    migrateBtn.classList.remove("hidden");
  } else {
    migrateBtn.classList.add("hidden");
  }
}

document.getElementById("migrateBtn").addEventListener("click", async () => {
  const oldExpenses = JSON.parse(localStorage.getItem("expenses") || "[]");
  const oldSalamis = JSON.parse(localStorage.getItem("salamis") || "[]");

  const confirmMsg = `Ei device-e ${oldExpenses.length}-ta expense ar ${oldSalamis.length}-ta bonus entry paoa gece.\nEigulo apnar account-e jog korte chan?`;
  if(!confirm(confirmMsg)) return;

  expenses = [...expenses, ...oldExpenses];
  salamis = [...salamis, ...oldSalamis];
  await saveUserData();

  localStorage.removeItem("expenses");
  localStorage.removeItem("salamis");
  document.getElementById("migrateBtn").classList.add("hidden");

  renderExpenseMonthNav();
  renderExpenses();
  renderMonthlyYearlyTables();
  renderCharts();
  renderEidTables();

  alert("Purono data safolvabe jog kora hoyeche!");
});

// Dark Mode

const toggleBtn = document.getElementById("toggleDarkMode");
let isDark = false;

function applyDarkMode() {
  if (isDark) {
    document.body.classList.add("dark-mode");
    toggleBtn.textContent = "☀️ Light Mode";
  } else {
    document.body.classList.remove("dark-mode");
    toggleBtn.textContent = "🌙 Dark Mode";
  }
}

toggleBtn.addEventListener("click", async () => {
  isDark = !isDark;
  applyDarkMode();
  await saveUserData();
});

// Dropdown Menus (All Expenses / Monthly & Yearly Summary)

function setupDropdown(btnId, contentId){
  const btn = document.getElementById(btnId);
  const content = document.getElementById(contentId);
  btn.addEventListener("click", () => {
    content.classList.toggle("open");
    btn.classList.toggle("active");
  });
}

setupDropdown("expenseDropdownBtn", "expenseDropdownContent");
setupDropdown("summaryDropdownBtn", "summaryDropdownContent");

// Expense Functions

async function addExpense(){
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

  await saveUserData();
  document.getElementById("item").value="";
  document.getElementById("amount").value="";
  document.getElementById("date").value="";
  renderExpenseMonthNav();
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

async function deleteExpense(i){
  expenses.splice(i,1);
  await saveUserData();
  renderExpenseMonthNav();
  renderExpenses();
  renderMonthlyYearlyTables();
  renderCharts();
}

// Builds the month-wise quick filter buttons inside the "All Expenses" dropdown
function renderExpenseMonthNav(){
  const nav = document.getElementById("expenseMonthNav");
  nav.innerHTML = "";

  const keysSet = new Set();
  expenses.forEach(e=>{
    const dt = new Date(e.date);
    keysSet.add(`${dt.getFullYear()}-${dt.getMonth()}`);
  });

  // Newest month first
  const keys = Array.from(keysSet).sort((a,b)=>{
    const [ay,am] = a.split("-").map(Number);
    const [by,bm] = b.split("-").map(Number);
    return (by*12+bm) - (ay*12+am);
  });

  // Reset filter if the currently selected month no longer has any expenses
  if(currentExpenseFilter !== "all" && !keys.includes(currentExpenseFilter)){
    currentExpenseFilter = "all";
  }

  const allBtn = document.createElement("button");
  allBtn.textContent = "All";
  allBtn.className = currentExpenseFilter === "all" ? "active" : "";
  allBtn.onclick = () => { currentExpenseFilter = "all"; renderExpenseMonthNav(); renderExpenses(); };
  nav.appendChild(allBtn);

  keys.forEach(key=>{
    const [y,m] = key.split("-").map(Number);
    const btn = document.createElement("button");
    btn.textContent = `${monthNames[m]} ${y}`;
    btn.className = currentExpenseFilter === key ? "active" : "";
    btn.onclick = () => { currentExpenseFilter = key; renderExpenseMonthNav(); renderExpenses(); };
    nav.appendChild(btn);
  });
}

// FIXED: builds all rows into an array first, then sets innerHTML ONCE.
// (Previously used repeated innerHTML += in a loop, which re-parses the
// whole table every iteration and becomes extremely slow / appears to
// "freeze" once there are hundreds of rows, e.g. when "All" is selected.)

function renderExpenses(){
  const tbody=document.querySelector("#expenseTable tbody");
  const totalEl = document.getElementById("expenseTotal");
  const rows = [];
  let total = 0;
  expenses.forEach((e,i)=>{
    if(currentExpenseFilter !== "all"){
      const dt = new Date(e.date);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      if(key !== currentExpenseFilter) return;
    }
    total += e.amount;
    rows.push(`<tr>
      <td>${e.item}</td><td>${e.amount}</td><td>${e.date}</td>
      <td>
        <button onclick="editExpense(${i})">Edit</button>
        <button onclick="deleteExpense(${i})">Delete</button>
      </td>
    </tr>`);
  });
  tbody.innerHTML = rows.join("");

  const label = currentExpenseFilter === "all"
    ? "All Time"
    : (() => {
        const [y,m] = currentExpenseFilter.split("-").map(Number);
        return `${monthNames[m]} ${y}`;
      })();
  totalEl.textContent = `${label} Total: ${total}`;
}

// Monthly & Yearly Tables

// FIXED: same issue as renderExpenses - build full HTML strings first,
// then assign innerHTML once per container instead of repeatedly
// appending inside nested loops.

function renderMonthlyYearlyTables(){
  const monthlyTables=document.getElementById("monthlyTables");
  const yearlyTables=document.getElementById("yearlyTables");
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

  const years = Object.keys(monthlyData).sort((a,b)=>a-b);

  let monthlyHtml = "";
  years.forEach(y=>{
    monthlyHtml += `<h3>Year: ${y}</h3>`;
    for(let m=0; m<12; m++){
      const data = monthlyData[y][m] || [];
      if(data.length===0) continue;
      const total = data.reduce((sum,d)=>sum+d.amount,0);
      let t=`<h4>${months[m]} - Total: ${total}</h4>
        <div class="table-wrapper">
        <table><tr><th>Item</th><th>Amount</th><th>Date</th></tr>`;
      data.forEach(d=>{ t+=`<tr><td>${d.item}</td><td>${d.amount}</td><td>${d.date}</td></tr>`; });
      t+="</table></div>";
      monthlyHtml += t;
    }
  });
  monthlyTables.innerHTML = monthlyHtml;

  let yearlyHtml = "";
  years.forEach(y=>{
    yearlyHtml += `<h3>Year: ${y} - Total: ${yearlyData[y]}</h3>`;
  });
  yearlyTables.innerHTML = yearlyHtml;
}

// Charts

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

// Export All Data to PDF

document.getElementById("exportPdfBtn").addEventListener("click", exportAllDataToPDF);

function exportAllDataToPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const generatedOn = new Date().toLocaleDateString();
  const totalExpenses = expenses.reduce((sum,e)=>sum+e.amount,0);
  const totalIncome = salamis.reduce((sum,s)=>sum+s.amount,0);

  // Cover / summary 
  doc.setFontSize(18);
  doc.text("Expense Tracker - Full Report", 14, 18);
  doc.setFontSize(10);
  doc.text(`Generated on: ${generatedOn}`, 14, 25);
  doc.setFontSize(12);
  doc.text(`Total Expenses: ${totalExpenses}`, 14, 34);
  doc.text(`Total Bonus/Income: ${totalIncome}`, 14, 41);
  doc.text(`Net (Income - Expenses): ${totalIncome - totalExpenses}`, 14, 48);

  //  All Expenses table (sorted oldest to newest)
  const expenseRows = expenses
    .slice()
    .sort((a,b)=> new Date(a.date) - new Date(b.date))
    .map(e => [e.item, e.amount, e.date]);

  doc.autoTable({
    startY: 56,
    head: [["Item", "Amount", "Date"]],
    body: expenseRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 123, 255] },
    margin: { top: 20 }
  });

  //  Bonus/Income table on a fresh page 
  doc.addPage();
  doc.setFontSize(14);
  doc.text("Bonus / Income Tracker", 14, 15);

  const salamiRows = salamis
    .slice()
    .sort((a,b)=>{
      const da = new Date(Number(a.year), monthNames.indexOf(a.month), Number(a.date) || 1);
      const db = new Date(Number(b.year), monthNames.indexOf(b.month), Number(b.date) || 1);
      return da - db;
    })
    .map(s => [s.year, s.month, s.date, s.giver, s.amount]);

  doc.autoTable({
    startY: 22,
    head: [["Year", "Month", "Date", "Giver", "Amount"]],
    body: salamiRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 167, 69] }
  });

  const fileDate = generatedOn.replace(/\//g, "-");
  doc.save(`expense_tracker_report_${fileDate}.pdf`);
}

// Export All Data to Excel

document.getElementById("exportExcelBtn").addEventListener("click", exportAllDataToExcel);

function exportAllDataToExcel(){
  const wb = XLSX.utils.book_new();

  // Expenses sheet (sorted oldest to newest)

  const expenseData = expenses
    .slice()
    .sort((a,b)=> new Date(a.date) - new Date(b.date))
    .map(e => ({ Item: e.item, Amount: e.amount, Date: e.date }));
  const wsExpenses = XLSX.utils.json_to_sheet(expenseData);
  XLSX.utils.book_append_sheet(wb, wsExpenses, "Expenses");

  // Bonus/Income sheet 

  const salamiData = salamis
    .slice()
    .sort((a,b)=>{
      const da = new Date(Number(a.year), monthNames.indexOf(a.month), Number(a.date) || 1);
      const db = new Date(Number(b.year), monthNames.indexOf(b.month), Number(b.date) || 1);
      return da - db;
    })
    .map(s => ({ Year: s.year, Month: s.month, Date: s.date, Giver: s.giver, Amount: s.amount }));
  const wsSalamis = XLSX.utils.json_to_sheet(salamiData);
  XLSX.utils.book_append_sheet(wb, wsSalamis, "Bonus_Income");

  //  Monthly Summary sheet (expenses grouped by Year-Month) 

  const monthlyTotals = {};
  expenses.forEach(e=>{
    const dt = new Date(e.date);
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    monthlyTotals[key] = (monthlyTotals[key] || 0) + e.amount;
  });
  const summaryData = Object.keys(monthlyTotals)
    .sort()
    .map(key => ({ "Year-Month": key, "Total Expense": monthlyTotals[key] }));
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Monthly Summary");

  const fileDate = new Date().toLocaleDateString().replace(/\//g, "-");
  XLSX.writeFile(wb, `expense_tracker_report_${fileDate}.xlsx`);
}

// Bonus/Income Section

const eidForm=document.getElementById("eidForm");
const eidTables=document.getElementById("eidTables");

eidForm.addEventListener("submit", async e=>{
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

  await saveUserData();
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

async function deleteEidEntry(i){ 
  salamis.splice(i,1); 
  await saveUserData();
  renderEidTables(); 
}

// FIXED: same innerHTML += issue - build the full string first.
function renderEidTables(){
  const grouped={};
  salamis.forEach((s,i)=>{
    if(!grouped[s.year]) grouped[s.year]={};
    if(!grouped[s.year][s.month]) grouped[s.year][s.month]=[];
    grouped[s.year][s.month].push({...s,index:i});
  });

  let html = "";
  for(let y in grouped){
    const yearTotal = Object.values(grouped[y])
      .flat()
      .reduce((sum,s)=>sum+s.amount,0);
    html += `<h3>Year: ${y} - Total: ${yearTotal}</h3>`;
    for(let m in grouped[y]){
      const monthTotal = grouped[y][m].reduce((sum,s)=>sum+s.amount,0);
      let t=`<h4>${m} - Total: ${monthTotal}</h4><div class="table-wrapper"><table>
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
      html += t;
    }
  }
  eidTables.innerHTML = html;
}
