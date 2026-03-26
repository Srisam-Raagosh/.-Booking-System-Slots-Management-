import { useEffect, useState, useCallback } from "react";

const API = "http://127.0.0.1:5000";

// ─── AUTH STORAGE ─────────────────────────────────────────────────────────────
const getToken  = () => localStorage.getItem("medibook_token");
const getUser   = () => { try { return JSON.parse(localStorage.getItem("medibook_user")); } catch { return null; } };
const saveAuth  = (token, user) => { localStorage.setItem("medibook_token", token); localStorage.setItem("medibook_user", JSON.stringify(user)); };
const clearAuth = () => { localStorage.removeItem("medibook_token"); localStorage.removeItem("medibook_user"); };

const authHeaders = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  primary: "#0f766e", primaryDark: "#0d6460", primaryLight: "#ccfbf1",
  accent: "#f59e0b", danger: "#ef4444", success: "#10b981",
  warning: "#f59e0b", info: "#3b82f6",
  bg: "#f0fdf9", sidebar: "#134e4a", sidebarActive: "#0f766e",
  card: "#fff", border: "#d1fae5",
  text: "#111827", muted: "#6b7280",
};

const s = {
  input: {
    border: `1.5px solid #d1d5db`, borderRadius: 10, padding: "10px 14px",
    fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box",
    fontFamily: "inherit", background: "#fafafa", transition: "border .2s",
  },
  card: {
    background: C.card, borderRadius: 18,
    boxShadow: "0 2px 20px rgba(0,0,0,0.06)", padding: "24px 28px", marginBottom: 24,
  },
  btn: (v = "primary") => ({
    padding: "10px 22px", border: "none", borderRadius: 10, cursor: "pointer",
    fontWeight: 700, fontSize: 13, transition: "all .15s", letterSpacing: ".3px",
    background: v === "primary" ? C.primary : v === "danger" ? C.danger
              : v === "warning" ? C.warning : v === "success" ? C.success
              : v === "ghost"   ? "transparent" : "#e5e7eb",
    color: v === "ghost" ? C.muted : "#fff",
    border: v === "ghost" ? `1.5px solid #e5e7eb` : "none",
  }),
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    confirmed:   { bg: "#d1fae5", c: "#065f46" },
    cancelled:   { bg: "#fee2e2", c: "#991b1b" },
    rescheduled: { bg: "#fef3c7", c: "#92400e" },
  };
  const m = map[status] || map.confirmed;
  return <span style={{ background: m.bg, color: m.c, padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>{status}</span>;
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", bottom: 30, right: 30, zIndex: 9999,
      background: toast.type === "error" ? C.danger : C.success,
      color: "#fff", padding: "13px 24px", borderRadius: 12,
      boxShadow: "0 8px 30px rgba(0,0,0,0.18)", fontSize: 14, fontWeight: 600,
      maxWidth: 360, animation: "slideUp .25s ease",
    }}>{toast.msg}</div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 420 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "30px 34px",
        width: "90%", maxWidth: width, boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
        animation: "popIn .2s ease",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.muted, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "20px 22px",
      boxShadow: "0 2px 14px rgba(0,0,0,0.05)", display: "flex",
      alignItems: "center", gap: 16, borderTop: `4px solid ${color}`,
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: color + "18", display: "grid", placeItems: "center", fontSize: 24 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN / REGISTER PAGE
// ══════════════════════════════════════════════════════════════════════════════
function AuthPage({ onAuth }) {
  const [mode, setMode]   = useState("login");
  const [form, setForm]   = useState({ name: "", email: "", password: "", role: "user" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    const url  = mode === "login" ? "/auth/login" : "/auth/register";
    const body = mode === "login" ? { email: form.email, password: form.password } : form;
    try {
      const res  = await fetch(API + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      saveAuth(data.token, data.user);
      onAuth(data.user);
    } catch { setError("Cannot connect to server. Is Flask running?"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: `linear-gradient(135deg, ${C.sidebar} 0%, #0f766e 60%, #134e4a 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, padding: "44px 40px",
        width: "90%", maxWidth: 420, boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏥</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: C.sidebar }}>MediBook</h1>
          <p style={{ margin: "6px 0 0", color: C.muted, fontSize: 14 }}>Appointment Booking System</p>
        </div>

        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "9px", border: "none", borderRadius: 8, cursor: "pointer",
              fontWeight: 600, fontSize: 13,
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? C.primary : C.muted,
              boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all .2s",
            }}>{m === "login" ? "Sign In" : "Register"}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <input style={s.input} placeholder="Full Name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          )}
          <input style={s.input} placeholder="Email" type="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
          <input style={s.input} placeholder="Password (min 6 chars)" type="password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === "Enter" && submit()} />
          {mode === "register" && (
            <select style={{ ...s.input, background: "#fafafa" }} value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="user">Patient / User</option>
              <option value="admin">Admin</option>
            </select>
          )}
          {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{error}</div>}
          <button onClick={submit} disabled={loading} style={{
            ...s.btn("primary"), padding: "12px", fontSize: 15, marginTop: 4,
            background: loading ? "#9ca3af" : C.primary,
          }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 20, marginBottom: 0 }}>
          Demo admin: <b>admin@medibook.com</b> / <b>admin123</b>
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function AdminDashboard({ user, onLogout, notify }) {
  const [tab, setTab]           = useState("dashboard");
  const [slots, setSlots]       = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers]       = useState([]);
  const [stats, setStats]       = useState({});
  const [doctors, setDoctors]   = useState([]);

  // Filters
  const [slotFilter, setSlotFilter]       = useState({ date: "", doctor: "", available_only: "" });
  const [bookingFilter, setBookingFilter] = useState({ search: "", status: "", date: "", doctor: "" });

  // Forms
  const [slotForm, setSlotForm]       = useState({ start_time: "", end_time: "", date: "", doctor: "" });
  const [bulkForm, setBulkForm]       = useState({ doctor: "", from_date: "", to_date: "", skip_weekends: false, times: "09:00 AM,09:30 AM\n09:30 AM,10:00 AM" });
  const [bookModal, setBookModal]     = useState(null);
  const [reschedModal, setReschedModal] = useState(null);
  const [bookForm, setBookForm]       = useState({ reason: "" });
  const [newSlotId, setNewSlotId]     = useState("");
  const [showBulk, setShowBulk]       = useState(false);

  const h = authHeaders();

  const load = useCallback(() => {
    const sq = new URLSearchParams(Object.fromEntries(Object.entries(slotFilter).filter(([,v])=>v))).toString();
    const bq = new URLSearchParams(Object.fromEntries(Object.entries(bookingFilter).filter(([,v])=>v))).toString();
    fetch(`${API}/slots${sq ? "?" + sq : ""}`, { headers: h }).then(r => r.json()).then(setSlots).catch(() => {});
    fetch(`${API}/bookings${bq ? "?" + bq : ""}`, { headers: h }).then(r => r.json()).then(setBookings).catch(() => {});
    fetch(`${API}/users`, { headers: h }).then(r => r.json()).then(setUsers).catch(() => {});
    fetch(`${API}/stats`, { headers: h }).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API}/doctors`, { headers: h }).then(r => r.json()).then(setDoctors).catch(() => {});
  }, [slotFilter, bookingFilter]);

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [slotFilter, bookingFilter]);

  const addSlot = () => {
    const { start_time, end_time, date } = slotForm;
    if (!start_time || !end_time || !date) return notify("Fill all required fields", "error");
    fetch(`${API}/slots`, { method: "POST", headers: h, body: JSON.stringify(slotForm) })
      .then(r => r.json()).then(d => {
        if (d.error) return notify(d.error, "error");
        notify("Slot added!"); setSlotForm({ start_time: "", end_time: "", date: "", doctor: "" }); load();
      });
  };

  const addBulkSlots = () => {
    const times = bulkForm.times.trim().split("\n").map(line => {
      const [s, e] = line.split(",").map(x => x.trim());
      return { start_time: s, end_time: e };
    }).filter(t => t.start_time && t.end_time);
    const body = { doctor: bulkForm.doctor, from_date: bulkForm.from_date, to_date: bulkForm.to_date, skip_weekends: bulkForm.skip_weekends, times };
    fetch(`${API}/slots/bulk`, { method: "POST", headers: h, body: JSON.stringify(body) })
      .then(r => r.json()).then(d => {
        if (d.error) return notify(d.error, "error");
        notify(d.message); setShowBulk(false); load();
      });
  };

  const deleteSlot = (id) => {
    if (!window.confirm("Delete this slot?")) return;
    fetch(`${API}/slots/${id}`, { method: "DELETE", headers: h })
      .then(r => r.json()).then(d => { if (d.error) return notify(d.error, "error"); notify("Slot deleted"); load(); });
  };

  const bookSlot = () => {
    fetch(`${API}/book/${bookModal._id}`, { method: "POST", headers: h, body: JSON.stringify(bookForm) })
      .then(r => r.json()).then(d => {
        if (d.error) return notify(d.error, "error");
        notify(d.message); setBookModal(null); load();
      });
  };

  const cancelBooking = (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    fetch(`${API}/bookings/${id}/cancel`, { method: "POST", headers: h })
      .then(r => r.json()).then(d => { if (d.error) return notify(d.error, "error"); notify("Cancelled"); load(); });
  };

  const reschedule = () => {
    if (!newSlotId) return notify("Select a new slot", "error");
    fetch(`${API}/bookings/${reschedModal._id}/reschedule`, { method: "POST", headers: h, body: JSON.stringify({ new_slot_id: newSlotId }) })
      .then(r => r.json()).then(d => {
        if (d.error) return notify(d.error, "error");
        notify(d.message); setReschedModal(null); setNewSlotId(""); load();
      });
  };

  const exportCSV = () => { window.open(`${API}/export/bookings?token=${getToken()}`, "_blank"); };

  const availableSlots = slots.filter(s => !s.is_booked);

  const nav = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "slots",     icon: "🗓️",  label: "Slots" },
    { id: "bookings",  icon: "📋", label: "Bookings" },
    { id: "users",     icon: "👥", label: "Users" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: C.bg }}>
      {/* SIDEBAR */}
      <aside style={{ width: 230, background: C.sidebar, display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "0 22px 24px", borderBottom: "1px solid #1a5c58" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>🏥 MediBook</div>
          <div style={{ fontSize: 11, color: "#5eead4", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>Admin Panel</div>
        </div>
        <nav style={{ marginTop: 18, flex: 1 }}>
          {nav.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)} style={{
              padding: "13px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              fontSize: 14, fontWeight: 500,
              color: tab === n.id ? "#fff" : "#99f6e4",
              background: tab === n.id ? C.sidebarActive : "transparent",
              borderLeft: `3px solid ${tab === n.id ? "#2dd4bf" : "transparent"}`,
              transition: "all .15s",
            }}>
              <span style={{ fontSize: 18 }}>{n.icon}</span>{n.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "16px 22px" }}>
          <div style={{ fontSize: 13, color: "#99f6e4", marginBottom: 10 }}>👤 {user.name}</div>
          <button onClick={onLogout} style={{ ...s.btn("ghost"), color: "#f87171", borderColor: "#7f1d1d", fontSize: 12, width: "100%", padding: "8px" }}>Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (<>
          <h2 style={{ margin: "0 0 22px", fontSize: 24, fontWeight: 800, color: C.text }}>Dashboard</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))", gap: 14, marginBottom: 28 }}>
            <StatCard label="Total Slots"    value={stats.total_slots}     icon="🗓️" color={C.primary} />
            <StatCard label="Available"      value={stats.available_slots} icon="✅" color={C.success} />
            <StatCard label="Booked"         value={stats.booked_slots}    icon="📌" color={C.accent} />
            <StatCard label="Total Bookings" value={stats.total_bookings}  icon="📋" color={C.info} />
            <StatCard label="Cancelled"      value={stats.cancelled}       icon="❌" color={C.danger} />
            <StatCard label="Rescheduled"    value={stats.rescheduled}     icon="🔄" color="#f97316" />
            <StatCard label="Users"          value={stats.total_users}     icon="👥" color="#8b5cf6" />
          </div>

          {stats.by_doctor?.length > 0 && (
            <div style={s.card}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Bookings by Doctor</h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {stats.by_doctor.map(d => (
                  <div key={d.doctor} style={{ background: C.primaryLight, borderRadius: 10, padding: "10px 18px", fontSize: 14 }}>
                    <b>{d.doctor}</b> — {d.count} booking{d.count !== 1 ? "s" : ""}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Bookings</h3>
              <button onClick={exportCSV} style={s.btn("primary")}>⬇ Export CSV</button>
            </div>
            <BookingsTable bookings={bookings.slice(0, 10)} onCancel={cancelBooking} onReschedule={b => { setReschedModal(b); setNewSlotId(""); }} showActions />
          </div>
        </>)}

        {/* ── SLOTS ── */}
        {tab === "slots" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text }}>Manage Slots</h2>
            <button onClick={() => setShowBulk(true)} style={s.btn("primary")}>🔁 Bulk / Recurring</button>
          </div>

          {/* Add slot */}
          <div style={s.card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>➕ Add Single Slot</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 12 }}>
              <input style={s.input} type="date" value={slotForm.date} onChange={e => setSlotForm({ ...slotForm, date: e.target.value })} />
              <input style={s.input} placeholder="Start Time (09:00 AM)" value={slotForm.start_time} onChange={e => setSlotForm({ ...slotForm, start_time: e.target.value })} />
              <input style={s.input} placeholder="End Time (09:30 AM)" value={slotForm.end_time} onChange={e => setSlotForm({ ...slotForm, end_time: e.target.value })} />
              <input style={s.input} placeholder="Doctor Name" value={slotForm.doctor} onChange={e => setSlotForm({ ...slotForm, doctor: e.target.value })} />
            </div>
            <button onClick={addSlot} style={{ ...s.btn("primary"), marginTop: 14 }}>Add Slot</button>
          </div>

          {/* Filter */}
          <div style={{ ...s.card, padding: "18px 22px" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>🔍 Filter:</span>
              <input style={{ ...s.input, maxWidth: 170 }} type="date" value={slotFilter.date} onChange={e => setSlotFilter({ ...slotFilter, date: e.target.value })} />
              <select style={{ ...s.input, maxWidth: 180, background: "#fafafa" }} value={slotFilter.doctor} onChange={e => setSlotFilter({ ...slotFilter, doctor: e.target.value })}>
                <option value="">All Doctors</option>
                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select style={{ ...s.input, maxWidth: 160, background: "#fafafa" }} value={slotFilter.available_only} onChange={e => setSlotFilter({ ...slotFilter, available_only: e.target.value })}>
                <option value="">All Slots</option>
                <option value="true">Available Only</option>
              </select>
              <button onClick={() => setSlotFilter({ date: "", doctor: "", available_only: "" })} style={s.btn("ghost")}>Clear</button>
            </div>
          </div>

          <div style={s.card}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>All Slots ({slots.length})</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f3f4f6", color: C.muted, textAlign: "left" }}>
                  {["Date", "Doctor", "Time", "Status", "Booked By", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map(sl => (
                  <tr key={sl._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px" }}>{sl.date || "—"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{sl.doctor || "General"}</td>
                    <td style={{ padding: "10px 12px" }}>{sl.start_time} – {sl.end_time}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {sl.is_booked
                        ? <span style={{ color: C.danger, fontWeight: 700 }}>Booked</span>
                        : <span style={{ color: C.success, fontWeight: 700 }}>Available</span>}
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted }}>{sl.booked_by || "—"}</td>
                    <td style={{ padding: "10px 12px", display: "flex", gap: 8 }}>
                      {!sl.is_booked && <button onClick={() => { setBookModal(sl); setBookForm({ reason: "" }); }} style={{ ...s.btn("success"), padding: "6px 14px" }}>Book</button>}
                      {!sl.is_booked && <button onClick={() => deleteSlot(sl._id)} style={{ ...s.btn("danger"), padding: "6px 14px" }}>Delete</button>}
                    </td>
                  </tr>
                ))}
                {slots.length === 0 && <tr><td colSpan={6} style={{ padding: 28, textAlign: "center", color: C.muted }}>No slots found</td></tr>}
              </tbody>
            </table>
          </div>
        </>)}

        {/* ── BOOKINGS ── */}
        {tab === "bookings" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text }}>All Bookings</h2>
            <button onClick={exportCSV} style={s.btn("primary")}>⬇ Export CSV</button>
          </div>
          <div style={{ ...s.card, padding: "18px 22px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>🔍 Filter:</span>
              <input style={{ ...s.input, maxWidth: 200 }} placeholder="Search name/email…" value={bookingFilter.search} onChange={e => setBookingFilter({ ...bookingFilter, search: e.target.value })} />
              <select style={{ ...s.input, maxWidth: 150, background: "#fafafa" }} value={bookingFilter.status} onChange={e => setBookingFilter({ ...bookingFilter, status: e.target.value })}>
                <option value="">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
              <input style={{ ...s.input, maxWidth: 170 }} type="date" value={bookingFilter.date} onChange={e => setBookingFilter({ ...bookingFilter, date: e.target.value })} />
              <select style={{ ...s.input, maxWidth: 180, background: "#fafafa" }} value={bookingFilter.doctor} onChange={e => setBookingFilter({ ...bookingFilter, doctor: e.target.value })}>
                <option value="">All Doctors</option>
                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={() => setBookingFilter({ search: "", status: "", date: "", doctor: "" })} style={s.btn("ghost")}>Clear</button>
            </div>
          </div>
          <div style={s.card}>
            <BookingsTable bookings={bookings} onCancel={cancelBooking} onReschedule={b => { setReschedModal(b); setNewSlotId(""); }} showActions />
          </div>
        </>)}

        {/* ── USERS ── */}
        {tab === "users" && (<>
          <h2 style={{ margin: "0 0 22px", fontSize: 24, fontWeight: 800, color: C.text }}>Registered Users</h2>
          <div style={s.card}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f3f4f6", color: C.muted, textAlign: "left" }}>
                  {["Name", "Email", "Role", "Registered"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: "10px 12px", color: C.muted }}>{u.email}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: u.role === "admin" ? "#dbeafe" : "#d1fae5", color: u.role === "admin" ? "#1d4ed8" : "#065f46", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{u.role}</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted, fontSize: 12 }}>{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={4} style={{ padding: 28, textAlign: "center", color: C.muted }}>No users yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>)}
      </main>

      {/* BOOK MODAL */}
      {bookModal && (
        <Modal title={`Book: ${bookModal.start_time}–${bookModal.end_time} · ${bookModal.doctor}`} onClose={() => setBookModal(null)}>
          <p style={{ margin: "0 0 14px", color: C.muted, fontSize: 14 }}>Date: <b>{bookModal.date}</b></p>
          <textarea style={{ ...s.input, resize: "vertical", minHeight: 80, marginBottom: 14 }}
            placeholder="Reason for visit (optional)" value={bookForm.reason}
            onChange={e => setBookForm({ ...bookForm, reason: e.target.value })} />
          <button onClick={bookSlot} style={{ ...s.btn("success"), width: "100%", padding: 12 }}>Confirm Booking</button>
        </Modal>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedModal && (
        <Modal title={`Reschedule: ${reschedModal.name}`} onClose={() => setReschedModal(null)}>
          <p style={{ margin: "0 0 14px", color: C.muted, fontSize: 14 }}>
            Current: <b>{reschedModal.start_time}–{reschedModal.end_time}</b> on <b>{reschedModal.date || "—"}</b>
          </p>
          <select style={{ ...s.input, background: "#fff", marginBottom: 16 }} value={newSlotId} onChange={e => setNewSlotId(e.target.value)}>
            <option value="">— Select New Slot —</option>
            {availableSlots.map(sl => (
              <option key={sl._id} value={sl._id}>{sl.date} · {sl.start_time}–{sl.end_time} ({sl.doctor})</option>
            ))}
          </select>
          {availableSlots.length === 0 && <p style={{ color: C.danger, fontSize: 13 }}>No available slots at the moment.</p>}
          <button onClick={reschedule} style={{ ...s.btn("warning"), width: "100%", padding: 12 }}>Confirm Reschedule</button>
        </Modal>
      )}

      {/* BULK MODAL */}
      {showBulk && (
        <Modal title="🔁 Add Recurring Slots" onClose={() => setShowBulk(false)} width={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input style={s.input} placeholder="Doctor Name" value={bulkForm.doctor} onChange={e => setBulkForm({ ...bulkForm, doctor: e.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: C.muted }}>From Date</label><input style={s.input} type="date" value={bulkForm.from_date} onChange={e => setBulkForm({ ...bulkForm, from_date: e.target.value })} /></div>
              <div><label style={{ fontSize: 12, color: C.muted }}>To Date</label><input style={s.input} type="date" value={bulkForm.to_date} onChange={e => setBulkForm({ ...bulkForm, to_date: e.target.value })} /></div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted }}>Time Slots (one per line: "09:00 AM,09:30 AM")</label>
              <textarea style={{ ...s.input, minHeight: 100, marginTop: 4, fontFamily: "monospace", fontSize: 13 }} value={bulkForm.times} onChange={e => setBulkForm({ ...bulkForm, times: e.target.value })} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={bulkForm.skip_weekends} onChange={e => setBulkForm({ ...bulkForm, skip_weekends: e.target.checked })} />
              Skip weekends (Sat & Sun)
            </label>
            <button onClick={addBulkSlots} style={{ ...s.btn("primary"), padding: 12, marginTop: 4 }}>Generate Slots</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Shared bookings table component ─────────────────────────────────────────
function BookingsTable({ bookings, onCancel, onReschedule, showActions }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #f3f4f6", color: C.muted, textAlign: "left" }}>
          {["Patient", "Doctor", "Date", "Time", "Reason", "Status", ...(showActions ? ["Actions"] : [])].map(h => (
            <th key={h} style={{ padding: "8px 12px", fontWeight: 600 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bookings.map(b => (
          <tr key={b._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
            <td style={{ padding: "10px 12px", fontWeight: 600 }}>{b.name}</td>
            <td style={{ padding: "10px 12px", color: C.muted }}>{b.doctor}</td>
            <td style={{ padding: "10px 12px", color: C.muted }}>{b.date || "—"}</td>
            <td style={{ padding: "10px 12px" }}>{b.start_time}–{b.end_time}</td>
            <td style={{ padding: "10px 12px", color: C.muted, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.reason || "—"}</td>
            <td style={{ padding: "10px 12px" }}>{statusBadge(b.status)}</td>
            {showActions && (
              <td style={{ padding: "10px 12px" }}>
                {b.status === "confirmed" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => onCancel(b._id)} style={{ ...s.btn("danger"), padding: "5px 12px", fontSize: 12 }}>Cancel</button>
                    <button onClick={() => onReschedule(b)} style={{ ...s.btn("warning"), padding: "5px 12px", fontSize: 12 }}>Reschedule</button>
                  </div>
                )}
              </td>
            )}
          </tr>
        ))}
        {bookings.length === 0 && (
          <tr><td colSpan={7} style={{ padding: 28, textAlign: "center", color: C.muted }}>No bookings found</td></tr>
        )}
      </tbody>
    </table>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  USER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function UserDashboard({ user, onLogout, notify }) {
  const [tab, setTab]           = useState("book");
  const [slots, setSlots]       = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [doctors, setDoctors]   = useState([]);
  const [filter, setFilter]     = useState({ date: "", doctor: "" });
  const [reschedModal, setReschedModal] = useState(null);
  const [newSlotId, setNewSlotId] = useState("");
  const [bookingReasons, setBookingReasons] = useState({});

  const h = authHeaders();

  const load = useCallback(() => {
    const q = new URLSearchParams({ available_only: "true", ...Object.fromEntries(Object.entries(filter).filter(([,v]) => v)) }).toString();
    fetch(`${API}/slots?${q}`).then(r => r.json()).then(setSlots).catch(() => {});
    fetch(`${API}/bookings/mine`, { headers: h }).then(r => r.json()).then(setMyBookings).catch(() => {});
    fetch(`${API}/doctors`).then(r => r.json()).then(setDoctors).catch(() => {});
  }, [filter]);

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [filter]);

  const bookSlot = (slotId) => {
    fetch(`${API}/book/${slotId}`, { method: "POST", headers: h, body: JSON.stringify({ reason: bookingReasons[slotId] || "" }) })
      .then(r => r.json()).then(d => {
        if (d.error) return notify(d.error, "error");
        notify(d.message); load();
      });
  };

  const cancelBooking = (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    fetch(`${API}/bookings/${id}/cancel`, { method: "POST", headers: h })
      .then(r => r.json()).then(d => { if (d.error) return notify(d.error, "error"); notify("Appointment cancelled"); load(); });
  };

  const reschedule = () => {
    if (!newSlotId) return notify("Select a new slot", "error");
    fetch(`${API}/bookings/${reschedModal._id}/reschedule`, { method: "POST", headers: h, body: JSON.stringify({ new_slot_id: newSlotId }) })
      .then(r => r.json()).then(d => {
        if (d.error) return notify(d.error, "error");
        notify(d.message); setReschedModal(null); setNewSlotId(""); load();
      });
  };

  const nav = [
    { id: "book",     icon: "🗓️",  label: "Book Appointment" },
    { id: "history",  icon: "📋", label: "My Appointments" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f8fafc" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 230, background: "#1e3a5f", display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "0 22px 24px", borderBottom: "1px solid #2a4a70" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>🏥 MediBook</div>
          <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>Patient Portal</div>
        </div>
        <nav style={{ marginTop: 18, flex: 1 }}>
          {nav.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)} style={{
              padding: "13px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              fontSize: 14, fontWeight: 500,
              color: tab === n.id ? "#fff" : "#93c5fd",
              background: tab === n.id ? "#2563eb" : "transparent",
              borderLeft: `3px solid ${tab === n.id ? "#60a5fa" : "transparent"}`,
              transition: "all .15s",
            }}>
              <span style={{ fontSize: 18 }}>{n.icon}</span>{n.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "16px 22px" }}>
          <div style={{ fontSize: 13, color: "#93c5fd", marginBottom: 10 }}>👤 {user.name}</div>
          <button onClick={onLogout} style={{ ...s.btn("ghost"), color: "#f87171", borderColor: "#7f1d1d", fontSize: 12, width: "100%", padding: "8px" }}>Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>

        {tab === "book" && (<>
          <h2 style={{ margin: "0 0 22px", fontSize: 24, fontWeight: 800, color: C.text }}>Book an Appointment</h2>

          {/* Filter */}
          <div style={{ ...s.card, padding: "18px 22px", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>🔍 Filter:</span>
              <input style={{ ...s.input, maxWidth: 180 }} type="date" value={filter.date} onChange={e => setFilter({ ...filter, date: e.target.value })} />
              <select style={{ ...s.input, maxWidth: 200, background: "#fafafa" }} value={filter.doctor} onChange={e => setFilter({ ...filter, doctor: e.target.value })}>
                <option value="">All Doctors</option>
                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={() => setFilter({ date: "", doctor: "" })} style={s.btn("ghost")}>Clear</button>
            </div>
          </div>

          {/* Slot cards */}
          {slots.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
              <div style={{ fontSize: 48 }}>🗓️</div>
              <p>No available slots found</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 18 }}>
              {slots.map(sl => (
                <div key={sl._id} style={{
                  background: "#fff", borderRadius: 16,
                  boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                  padding: "22px 24px", borderTop: `4px solid ${C.success}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{sl.start_time} – {sl.end_time}</span>
                    <span style={{ background: "#d1fae5", color: "#065f46", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Available</span>
                  </div>
                  <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>📅 {sl.date}</div>
                  <div style={{ fontSize: 14, color: C.muted, marginBottom: 14 }}>👨‍⚕️ Dr. {sl.doctor}</div>
                  <input
                    style={{ ...s.input, marginBottom: 10, fontSize: 13 }}
                    placeholder="Reason for visit (optional)"
                    value={bookingReasons[sl._id] || ""}
                    onChange={e => setBookingReasons({ ...bookingReasons, [sl._id]: e.target.value })}
                  />
                  <button onClick={() => bookSlot(sl._id)} style={{ ...s.btn("success"), width: "100%", padding: "10px" }}>
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </>)}

        {tab === "history" && (<>
          <h2 style={{ margin: "0 0 22px", fontSize: 24, fontWeight: 800, color: C.text }}>My Appointments</h2>
          {myBookings.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
              <div style={{ fontSize: 48 }}>📋</div>
              <p>You have no appointments yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {myBookings.map(b => (
                <div key={b._id} style={{
                  background: "#fff", borderRadius: 16,
                  boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
                  padding: "20px 24px", display: "flex", justifyContent: "space-between",
                  alignItems: "center", flexWrap: "wrap", gap: 14,
                  borderLeft: `5px solid ${b.status === "confirmed" ? C.success : b.status === "cancelled" ? C.danger : C.accent}`,
                }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Dr. {b.doctor}</div>
                    <div style={{ fontSize: 14, color: C.muted, marginTop: 3 }}>📅 {b.date} · ⏰ {b.start_time}–{b.end_time}</div>
                    {b.reason && <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Reason: {b.reason}</div>}
                    <div style={{ marginTop: 6 }}>{statusBadge(b.status)}</div>
                  </div>
                  {b.status === "confirmed" && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => cancelBooking(b._id)} style={{ ...s.btn("danger"), padding: "8px 18px" }}>Cancel</button>
                      <button onClick={() => { setReschedModal(b); setNewSlotId(""); }} style={{ ...s.btn("warning"), padding: "8px 18px" }}>Reschedule</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>)}
      </main>

      {/* RESCHEDULE MODAL */}
      {reschedModal && (
        <Modal title="Reschedule Appointment" onClose={() => setReschedModal(null)}>
          <p style={{ margin: "0 0 14px", color: C.muted, fontSize: 14 }}>
            Current: <b>{reschedModal.start_time}–{reschedModal.end_time}</b> on <b>{reschedModal.date}</b>
          </p>
          <select style={{ ...s.input, background: "#fff", marginBottom: 16 }} value={newSlotId} onChange={e => setNewSlotId(e.target.value)}>
            <option value="">— Select New Slot —</option>
            {slots.map(sl => (
              <option key={sl._id} value={sl._id}>{sl.date} · {sl.start_time}–{sl.end_time} ({sl.doctor})</option>
            ))}
          </select>
          <button onClick={reschedule} style={{ ...s.btn("warning"), width: "100%", padding: 12 }}>Confirm Reschedule</button>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [authUser, setAuthUser] = useState(getUser);
  const [toast, setToast]       = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3400);
  };

  const handleAuth  = (user) => setAuthUser(user);
  const handleLogout = () => { clearAuth(); setAuthUser(null); };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes popIn   { from { opacity: 0; transform: scale(.94);       } to { opacity: 1; transform: none; } }
        table tr:hover { background: #fafafa; }
        button:hover:not(:disabled) { opacity: .87; transform: translateY(-1px); }
        input:focus, select:focus, textarea:focus { border-color: #0f766e !important; box-shadow: 0 0 0 3px rgba(15,118,110,.1); }
      `}</style>

      {!authUser
        ? <AuthPage onAuth={handleAuth} />
        : authUser.role === "admin"
          ? <AdminDashboard user={authUser} onLogout={handleLogout} notify={notify} />
          : <UserDashboard  user={authUser} onLogout={handleLogout} notify={notify} />
      }

      <Toast toast={toast} />
    </>
  );
}