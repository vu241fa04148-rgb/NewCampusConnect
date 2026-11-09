import { useCallback, useEffect, useState } from "react";
import { Search, PackageSearch, LogIn, LogOut, PlusCircle, X, ShieldCheck, RefreshCw } from "lucide-react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const blankItem = { title: "", type: "found", category: "Electronics", description: "", location: "", date: new Date().toISOString().slice(0, 10), imageUrl: "", fullName: "", phone: "", email: "" };
const blankAuth = { name: "", email: "", password: "" };
const blankClaim = { fullName: "", phone: "", email: "", proofDescription: "" };

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("cc_token") || "");
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("cc_user") || "null"); } catch { return null; } });
  const [page, setPage] = useState("home");
  const [items, setItems] = useState([]);
  const [reports, setReports] = useState([]);
  const [claims, setClaims] = useState([]);
  const [adminClaims, setAdminClaims] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [adminItems, setAdminItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState(blankAuth);
  const [itemForm, setItemForm] = useState(blankItem);
  const [claimItem, setClaimItem] = useState(null);
  const [claimForm, setClaimForm] = useState(blankClaim);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }, [token]);

  const loadItems = useCallback(async () => {
    if (!token) { setItems([]); return; }
    try { const data = await request("/items"); setItems(data.items || []); }
    catch (e) { setNotice(e.message); }
  }, [request, token]);

  const loadClaims = useCallback(async () => {
    try { const data = await request("/claims/mine"); setClaims(data.claims || []); }
    catch (e) { setNotice(e.message); }
  }, [request]);

  const loadReports = useCallback(async () => {
    try { const data = await request("/items/mine"); setReports(data.items || []); }
    catch (e) { setNotice(e.message); }
  }, [request]);

  const loadAdmin = useCallback(async () => {
    try {
      const [claimData, statData, userData, itemData] = await Promise.all([request("/admin/claims"), request("/admin/stats"), request("/admin/users"), request("/admin/items")]);
      setAdminClaims(claimData.claims || []); setStats(statData); setUsers(userData.users || []); setAdminItems(itemData.items || []);
    } catch (e) { setNotice(e.message); }
  }, [request]);

  const loadNotifications = useCallback(async () => {
    try { const data = await request("/notifications"); setNotifications(data.notifications || []); }
    catch (e) { setNotice(e.message); }
  }, [request]);

  useEffect(() => { if (token) { loadItems(); if (user?.role === "admin") loadAdmin(); } }, [token, loadItems, loadAdmin, user?.role]);

  async function submitAuth(e) {
    e.preventDefault();
    try {
      const data = await request(authMode === "login" ? "/auth/login" : "/auth/register", { method: "POST", body: JSON.stringify(auth) });
      if (!data.token || !data.user) throw new Error("Login response is incomplete.");
      localStorage.setItem("cc_token", data.token); localStorage.setItem("cc_user", JSON.stringify(data.user));
      setToken(data.token); setUser(data.user); setPage(data.user.role === "admin" ? "admin" : "home"); setAuth(blankAuth); setNotice("Welcome to CampusConnect.");
    } catch (e) { setNotice(e.message); }
  }

  async function submitItem(e) {
    e.preventDefault();
    try {
      await request("/items", { method: "POST", body: JSON.stringify(itemForm) });
      setItemForm({ ...blankItem, date: new Date().toISOString().slice(0, 10) });
      setNotice("Your report was published."); setPage("reports"); await loadItems(); await loadReports(); try { const d = await request("/claims/received"); setClaims(old => [...old.filter(c => c._asFounder), ...(d.claims || []).map(c => ({ ...c, _asFounder: true }))]); } catch (e) { setNotice(e.message); }
    } catch (e) { setNotice(e.message); }
  }

  async function submitClaim(e) {
    e.preventDefault();
    try {
      await request("/claims", { method: "POST", body: JSON.stringify({ item: claimItem._id, ...claimForm }) });
      setClaimItem(null); setClaimForm(blankClaim); setNotice("Claim submitted for admin review."); await loadClaims();
    } catch (e) { setNotice(e.message); }
  }

  async function openPage(next) {
    setPage(next);
    if (next === "claims") await loadClaims();
    if (next === "reports") { await loadReports(); try { const d = await request("/claims/received"); setClaims(old => [...old.filter(c => c._asFounder), ...(d.claims || []).map(c => ({ ...c, _asFounder: true }))]); } catch (e) { setNotice(e.message); } }
    if (next === "admin") await loadAdmin();
    if (next === "notifications") await loadNotifications();
    if (next === "home") await loadItems();
  }

  async function reviewClaim(id, status) {
    try { await request(`/claims/${id}/review`, { method: "PUT", body: JSON.stringify({ status }) }); setNotice(`Claim ${status}.`); await loadAdmin(); }
    catch (e) { setNotice(e.message); }
  }

  async function deleteAdminRecord(kind, id) {
    if (!window.confirm(`Delete this ${kind === "users" ? "student account" : "item"}? This cannot be undone.`)) return;
    try {
      const data = await request(`/admin/${kind}/${id}`, { method: "DELETE" });
      setNotice(data.message || "Record deleted.");
      await loadAdmin();
      await loadItems();
    } catch (e) { setNotice(e.message); }
  }

  async function markNotificationRead(id) {
    try { await request(`/notifications/${id}/read`, { method: "PATCH" }); await loadNotifications(); }
    catch (e) { setNotice(e.message); }
  }

  async function confirmReturn(id) {
    try { const d = await request(`/claims/${id}/confirm-return`, { method: "POST" }); setNotice(d.message); await loadClaims(); await loadReports(); try { const received = await request("/claims/received"); setClaims(old => [...old.filter(c => !c._asFounder), ...(received.claims || []).map(c => ({ ...c, _asFounder: true }))]); } catch (e) { setNotice(e.message); } if (user?.role === "admin") await loadAdmin(); }
    catch (e) { setNotice(e.message); }
  }

  function logout() {
    localStorage.removeItem("cc_token"); localStorage.removeItem("cc_user");
    setToken(""); setUser(null); setPage("home"); setItems([]); setClaims([]); setReports([]); setNotifications([]); setAdminClaims([]); setAdminItems([]); setNotice("You have logged out.");
  }

  const filteredItems = items.filter(item => (filter === "all" || item.type === filter) && [item.title, item.description, item.category, item.location].join(" ").toLowerCase().includes(search.toLowerCase()));
  const statusPill = status => <span className={`status status-${status}`}>{status}</span>;
  const claimCard = (c, admin = false, founderView = false) => {
    const isFounder = founderView || String(c.item?.user?._id || c.item?.user) === String(user?.id || user?._id);
    return <article className="data-card" key={c._id}>
      <div className="card-top"><div><span className="eyebrow">{c.item?.category || "ITEM CLAIM"}</span><h3>{c.item?.title || "Item"}</h3></div>{statusPill(c.status)}</div>
      <p><b>Proof:</b> {c.proofDescription}</p>
      {admin && <p><b>Claimant contact (admin only):</b> {c.claimantContact?.fullName || c.claimant?.name || "Not available"} • {c.claimantContact?.phone || "No phone"} • {c.claimantContact?.email || c.claimant?.email || "No email"}</p>}
      {!admin && <p>Personal phone numbers and email addresses are kept private.</p>}
      {admin && <p><b>Founder contact:</b> {c.item?.founderContact?.fullName || c.item?.user?.name || "Not available"} • {c.item?.founderContact?.phone || "No phone"} • {c.item?.founderContact?.email || c.item?.user?.email || "No email"}</p>}
      {c.status === "approved" && <div className="confirm-box">
        <p>Founder: {c.founderReturned ? "Confirmed return ✓" : "Waiting for return confirmation"} | Claimant: {c.claimantReceived ? "Confirmed receipt ✓" : "Waiting for receipt confirmation"}</p>
        {isFounder && !c.founderReturned && <button className="secondary-btn" onClick={() => confirmReturn(c._id)}>I Returned This Item</button>}
        {!isFounder && String(c.claimant?._id || c.claimant) === String(user?.id || user?._id) && !c.claimantReceived && <button className="primary-btn" onClick={() => confirmReturn(c._id)}>I Received My Item</button>}
      </div>}
      {c.status === "successful" && <p className="success-text">Successful delivery {c.returnedAt ? `on ${new Date(c.returnedAt).toLocaleString()}` : "confirmed"}.</p>}
      {admin && c.status === "pending" && <div className="actions"><button className="primary-btn" onClick={() => reviewClaim(c._id, "approved")}>Approve</button><button className="danger-btn" onClick={() => reviewClaim(c._id, "rejected")}>Reject</button></div>}
      {admin && <small>Reported item founder: {c.item?.founderContact?.fullName || c.item?.user?.name || "Unknown"}</small>}
    </article>;
  };

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); openPage("home"); }}><span className="brand-mark"><PackageSearch size={23}/></span><span>Campus<span className="brand-light">Connect</span><small>SMART LOST & FOUND</small></span></a>
      <nav>
        {token && <><button className="nav-link" onClick={() => openPage("home")}>Student Dashboard</button><button className="nav-link" onClick={() => openPage("home")}>Browse Items</button><button className="nav-link" onClick={() => openPage("report")}>Report Item</button><button className="nav-link" onClick={() => openPage("reports")}>My Reports</button><button className="nav-link" onClick={() => openPage("claims")}>My Claims</button><button className="nav-link" onClick={() => openPage("notifications")}>Notifications{notifications.some(n => !n.read) ? " •" : ""}</button>{user?.role === "admin" && <button className="nav-link admin-link" onClick={() => openPage("admin")}><ShieldCheck size={15}/> Admin Dashboard</button>}</>}
        {token ? <button className="nav-cta" onClick={logout}><LogOut size={16}/> Logout</button> : <button className="nav-cta" onClick={() => { setAuthMode("login"); setPage("auth"); }}><LogIn size={16}/> Login</button>}
      </nav>
    </header>

    <main>
      {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}><X size={16}/></button></div>}
      {page === "home" && <>
        <section className="hero"><div className="hero-copy"><span className="eyebrow">YOUR CAMPUS. CONNECTED.</span><h1>Lost something?<br/><em>Find it here.</em></h1><p>A smarter way for students to report lost belongings, share found items, and reunite people with what matters.</p><div className="hero-actions"><button className="primary-btn" onClick={() => token ? openPage("report") : setPage("auth")}><PlusCircle size={18}/> Report an item</button><button className="secondary-btn" onClick={() => document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" })}>Explore listings</button></div><div className="hero-stats"><div><b>01</b><span>Report an item</span></div><div><b>02</b><span>Connect with students</span></div><div><b>03</b><span>Get it back</span></div></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-card"><PackageSearch size={70}/><span>FOUND IT?</span><strong>Let's reconnect.</strong><small>Campus lost & found hub</small></div><div className="float-tag tag-one">✓ Safe & simple</div><div className="float-tag tag-two">✦ Student community</div></div></section>
        <section className="listings" id="listings"><div className="section-heading"><div><span className="eyebrow">COMMUNITY BOARD</span><h2>Recent reports</h2><p>Browse items shared by your campus community.</p></div><div className="list-tools"><div className="search-box"><Search size={17}/><input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}/></div><div className="filters">{["all","lost","found"].map(x => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div></div></div>
          {!token ? <div className="empty-state"><PackageSearch size={42}/><h3>Sign in to view campus reports</h3><p>Create an account or log in to browse and report items.</p><button className="primary-btn" onClick={() => setPage("auth")}>Login / Register</button></div> : filteredItems.length === 0 ? <div className="empty-state"><PackageSearch size={42}/><h3>No reports found</h3><p>Be the first to add a lost or found item.</p></div> : <div className="item-grid">{filteredItems.map(item => <article className="item-card" key={item._id}><div className="item-visual">{item.imageUrl ? <img src={item.imageUrl} alt={item.title}/> : <PackageSearch size={44}/>}<span className={item.type}>{item.type}</span></div><div className="item-content"><div className="item-category">{item.category}</div><h3>{item.title}</h3><p>{item.description}</p><div className="item-meta"><span>{item.location}</span><span>{item.date}</span></div><div className="item-footer"><small>Reported by {item.user?.name || "Campus student"}</small>{item.type === "found" && item.status === "active" && String(item.user?._id) !== String(user?.id || user?._id) && <button onClick={() => { setClaimItem(item); setClaimForm({ ...blankClaim, fullName: user?.name || "", email: user?.email || "" }); }}>Claim item</button>}</div></div></article>)}</div>}
        </section>
      </>}

      {page === "auth" && <section className="panel narrow"><span className="eyebrow">WELCOME TO CAMPUSCONNECT</span><h2>{authMode === "login" ? "Sign in to continue" : "Create your student account"}</h2><form className="stack-form" onSubmit={submitAuth}>{authMode === "register" && <input placeholder="Full name" value={auth.name} onChange={e => setAuth({ ...auth, name: e.target.value })} required/>}<input type="email" placeholder="College email" value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })} required/><input type="password" placeholder="Password (minimum 6 characters)" minLength="6" value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} required/><button className="primary-btn full">{authMode === "login" ? "Login" : "Register"}</button></form><p className="switch-auth">{authMode === "login" ? "New here?" : "Already registered?"}<button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "Create account" : "Login"}</button></p></section>}

      {page === "report" && <section className="panel"><span className="eyebrow">HELP THE COMMUNITY</span><h2>Report an item</h2><p>Choose one action: I Lost This or I Found This. Your contact details are private and are not shown to students.</p><form className="report-form" onSubmit={submitItem}><label>What do you want to report?<select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value })}><option value="found">I Found This</option><option value="lost">I Lost This</option></select></label><label>Item name<input value={itemForm.title} onChange={e => setItemForm({ ...itemForm, title: e.target.value })} required placeholder="e.g. Scientific Calculator"/></label><label>Category<select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })}>{["Electronics","Books & Notes","ID Cards","Accessories","Clothing","Other"].map(x => <option key={x}>{x}</option>)}</select></label><label>Location<input value={itemForm.location} onChange={e => setItemForm({ ...itemForm, location: e.target.value })} required placeholder="Where was it lost/found?"/></label><label>Date<input type="date" value={itemForm.date} onChange={e => setItemForm({ ...itemForm, date: e.target.value })} required/></label><label className="wide">Description<textarea value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} required placeholder="Add identifying details..."/></label><label className="wide">Image URL (optional)<input value={itemForm.imageUrl} onChange={e => setItemForm({ ...itemForm, imageUrl: e.target.value })} placeholder="https://..."/></label><h3 className="wide">Your contact details (private)</h3><label>Full name<input value={itemForm.fullName} onChange={e => setItemForm({ ...itemForm, fullName: e.target.value })} required/></label><label>Phone number<input type="tel" value={itemForm.phone} onChange={e => setItemForm({ ...itemForm, phone: e.target.value })} required/></label><label>Email address<input type="email" value={itemForm.email} onChange={e => setItemForm({ ...itemForm, email: e.target.value })} required/></label><button className="primary-btn wide">Publish report</button></form></section>}

      {page === "claims" && <section className="panel"><span className="eyebrow">STUDENT DASHBOARD</span><h2>My Claims</h2><p>Claims you personally submitted. Your Successful Deliveries are shown here too.</p>{claims.filter(c => !c._asFounder).length ? claims.filter(c => !c._asFounder).map(c => claimCard(c)) : <div className="empty-state">You have not submitted any claims yet.</div>}<h2 className="subheading">Successful Deliveries</h2>{claims.filter(c => !c._asFounder && c.status === "successful").length ? claims.filter(c => !c._asFounder && c.status === "successful").map(c => <div key={`success-${c._id}`} className="success-row">{c.item?.title} — {new Date(c.returnedAt || c.updatedAt).toLocaleDateString()}</div>) : <p>No successful deliveries yet.</p>}</section>}

      {page === "reports" && <section className="panel"><span className="eyebrow">STUDENT DASHBOARD</span><h2>My Reports</h2>{reports.length ? reports.map(r => <article className="data-card" key={r._id}><div className="card-top"><div><span className="eyebrow">{r.type}</span><h3>{r.title}</h3></div>{statusPill(r.status)}</div><p>{r.description}</p><small>Location: {r.location} • Date: {r.date}</small><p className="private-line">Your contact details are stored privately.</p></article>) : <div className="empty-state">You have not reported any items yet.</div>}<h2 className="subheading">Claims on your found reports</h2>{claims.filter(c => c._asFounder).length ? claims.filter(c => c._asFounder).map(c => claimCard(c, false, true)) : <p>No claims received on your reports.</p>}</section>}

      {page === "notifications" && <section className="panel"><span className="eyebrow">UPDATES</span><h2>Notifications</h2>{notifications.length ? notifications.map(n => <article className="data-card" key={n._id}><div className="card-top"><p>{n.message}</p>{!n.read && <button className="secondary-btn" onClick={() => markNotificationRead(n._id)}>Mark as read</button>}</div><small>{new Date(n.createdAt).toLocaleString()}</small></article>) : <div className="empty-state">No notifications yet.</div>}</section>}

      {page === "admin" && user?.role === "admin" && <section className="panel admin-panel"><span className="eyebrow">CAMPUSCONNECT CONTROL CENTER</span><h2>Admin Dashboard</h2><div className="stats-grid">{stats && Object.entries({ "Users": stats.users, "Items": stats.items, "All Claims": stats.claims, "Pending": stats.pending, "Approved": stats.approved, "Rejected": stats.rejected, "Successful": stats.successful }).map(([k,v]) => <div className="stat-card" key={k}><strong>{v}</strong><span>{k}</span></div>)}</div><div className="section-heading admin-heading"><h2>All Claims</h2><button className="secondary-btn" onClick={loadAdmin}><RefreshCw size={15}/> Refresh</button></div>{adminClaims.length ? adminClaims.map(c => claimCard(c, true)) : <div className="empty-state">No claims have been submitted yet.</div>}<h2 className="subheading">All Reported Items</h2><div className="table-wrap"><table><thead><tr><th>Item</th><th>Type</th><th>Location</th><th>Status</th><th>Reported by</th><th>Action</th></tr></thead><tbody>{adminItems.map(item => <tr key={item._id}><td>{item.title}</td><td>{item.type}</td><td>{item.location}</td><td>{item.status}</td><td>{item.user?.name || "Unknown"}</td><td><button className="danger-btn" onClick={() => deleteAdminRecord("items", item._id)}>Delete</button></td></tr>)}</tbody></table></div><h2 className="subheading">Registered Users</h2><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead><tbody>{users.map(u => <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.role === "student" && <button className="danger-btn" onClick={() => deleteAdminRecord("users", u._id)}>Delete</button>}</td></tr>)}</tbody></table></div></section>}

      {claimItem && <div className="modal-backdrop"><section className="panel modal"><button className="modal-close" onClick={() => setClaimItem(null)}><X/></button><span className="eyebrow">OWNERSHIP VERIFICATION</span><h2>Claim {claimItem.title}</h2><form className="stack-form" onSubmit={submitClaim}><input placeholder="Full name" value={claimForm.fullName} onChange={e => setClaimForm({ ...claimForm, fullName: e.target.value })} required/><input type="tel" placeholder="Phone number" value={claimForm.phone} onChange={e => setClaimForm({ ...claimForm, phone: e.target.value })} required/><input type="email" placeholder="Email address" value={claimForm.email} onChange={e => setClaimForm({ ...claimForm, email: e.target.value })} required/><textarea placeholder="Proof of ownership (colour, marks, contents, etc.)" value={claimForm.proofDescription} onChange={e => setClaimForm({ ...claimForm, proofDescription: e.target.value })} required/><button className="primary-btn full">Submit claim</button></form></section></div>}
    </main>
    <footer><span>CampusConnect</span><span>Helping campus belongings find their way home.</span></footer>
  </div>;
}
