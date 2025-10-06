// ===== Storage helpers =====
const LS_KEYS = { products: "bw_products", invoices: "bw_invoices" };

const getProducts = () => JSON.parse(localStorage.getItem(LS_KEYS.products) || "[]");
const saveProducts = (arr) => localStorage.setItem(LS_KEYS.products, JSON.stringify(arr));

const getInvoices = () => JSON.parse(localStorage.getItem(LS_KEYS.invoices) || "[]");
const saveInvoices = (arr) => localStorage.setItem(LS_KEYS.invoices, JSON.stringify(arr));

// ===== ID + date helpers =====
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const nowStr = () => new Date().toLocaleString();

// ===== CSV helpers =====
function productsToCSV(products) {
  const header = "Serial No,UID,Name,Brand,Group,Cost Price,Selling Price,Stock,Modified\n";
  const rows = products.map((p, i) =>
    [i + 1, p.uid, csvSafe(p.name), csvSafe(p.brand), csvSafe(p.group),
     p.cost, p.sell, p.stock, csvSafe(p.modified)].join(",")
  );
  return header + rows.join("\n");
}
function csvSafe(v){ if(v==null) return ""; v=String(v); return /[,"\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v; }

function download(filename, text, mime="text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function importCSV(text){
  const lines = text.split(/\r?\n/).filter(Boolean);
  if(lines.length<=1) return [];
  const out = [];
  for(let i=1;i<lines.length;i++){
    // naive CSV split (supports quoted values)
    const cols = []; let s=lines[i], cur="", inQ=false;
    for(let j=0;j<s.length;j++){
      const ch=s[j];
      if(inQ){
        if(ch==='"' && s[j+1]==='"'){ cur+='"'; j++; }
        else if(ch==='"'){ inQ=false; }
        else cur+=ch;
      }else{
        if(ch===','){ cols.push(cur); cur=""; }
        else if(ch==='"'){ inQ=true; }
        else cur+=ch;
      }
    }
    cols.push(cur);
    if(cols.length<9) continue;
    const p = {
      uid: cols[1] || uid(),
      name: cols[2] || "",
      brand: cols[3] || "",
      group: cols[4] || "",
      cost: Number(cols[5] || 0),
      sell: Number(cols[6] || 0),
      stock: parseInt(cols[7] || "0", 10),
      modified: cols[8] || nowStr()
    };
    out.push(p);
  }
  return out;
}

// ===== Product CRUD by UID (stable with filtering) =====
function addProduct({name,brand,group,cost,sell,stock}){
  const products = getProducts();
  products.push({ uid: uid(), name, brand, group, cost, sell, stock, modified: nowStr() });
  saveProducts(products);
}
function updateProduct(uidToUpdate, patch){
  const products = getProducts();
  const idx = products.findIndex(p=>p.uid===uidToUpdate);
  if(idx>=0){
    products[idx] = { ...products[idx], ...patch, modified: nowStr() };
    saveProducts(products);
  }
}
function deleteProduct(uidToDelete){
  const products = getProducts().filter(p=>p.uid!==uidToDelete);
  saveProducts(products);
}
function changeStock(uidToChange, delta){
  const products = getProducts();
  const idx = products.findIndex(p=>p.uid===uidToChange);
  if(idx>=0){
    products[idx].stock = Math.max(0, (products[idx].stock||0) + delta);
    products[idx].modified = nowStr();
    saveProducts(products);
  }
}

// ===== Invoice helpers =====
function addInvoice({customerName, customerMobile, items}) {
  const invoices = getInvoices();
  const id = (invoices.at(-1)?.id || 0) + 1;
  const total = items.reduce((s,i)=>s + i.qty * i.price, 0);
  const invoice = { id, date: nowStr(), customerName, customerMobile, items, total };
  invoices.push(invoice);
  saveInvoices(invoices);
  return invoice;
}