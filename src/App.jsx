import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { db } from "./lib/db.js";

/* ---------------------------------------------------------
   DICTAZ — event ticketing, simplified.
   Design: ticket-stub motif. Deep-violet stage, paper-cream stubs,
   electric-violet CTA, alert-red for holds/alerts.
--------------------------------------------------------- */

const COLORS = {
  ink: "#1B1633",
  inkDeep: "#120F26",
  paper: "#FBF7EF",
  paperDim: "#F1EADA",
  gold: "#6C4BFF",
  goldDeep: "#4C2FCC",
  red: "#E14B4B",
  slate: "#2B2B33",
  mute: "#8D93A6",
  line: "rgba(27,22,51,0.14)",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function ticketCode(eventName) {
  const prefix = (eventName || "EVT").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "EVT";
  const body = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${body}`;
}
function money(n) {
  const v = Number(n) || 0;
  return v === 0 ? "Free" : `$${v.toFixed(2)}`;
}
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function remainingForEvent(ev, tickets) {
  const sold = tickets.filter((t) => t.eventId === ev.id).reduce((s, t) => s + t.qty, 0);
  return Math.max(0, Number(ev.capacity) - sold);
}

/* ---------------- Perforated ticket-stub shell ---------------- */
function Stub({ children, accent = COLORS.gold, bg = COLORS.paper, notchBg, className = "", style = {} }) {
  return (
    <div
      className={`stub ${className}`}
      style={{
        background: bg,
        borderRadius: 14,
        position: "relative",
        boxShadow: "0 1px 0 rgba(20,33,61,0.06), 0 12px 24px -12px rgba(13,23,48,0.35)",
        border: `1px solid ${COLORS.line}`,
        ...style,
      }}
    >
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 6, width: 4, borderRadius: 4, background: accent }} />
      {children}
    </div>
  );
}

function Perforation({ notchBg }) {
  return (
    <div style={{ position: "relative", height: 0 }}>
      <div
        style={{
          borderTop: `2px dashed ${COLORS.line}`,
          margin: "0 18px",
        }}
      />
      <div style={{ position: "absolute", left: -10, top: -9, width: 18, height: 18, borderRadius: "50%", background: notchBg }} />
      <div style={{ position: "absolute", right: -10, top: -9, width: 18, height: 18, borderRadius: "50%", background: notchBg }} />
    </div>
  );
}

/* ---------------- Top nav ---------------- */
function Nav({ tab, setTab, banner }) {
  const tabs = [
    { id: "home", label: "Home" },
    { id: "browse", label: "Browse" },
    { id: "planner", label: "Planner" },
    { id: "vendorportal", label: "Vendor Portal" },
    { id: "dashboard", label: "Dashboard" },
    { id: "checkin", label: "Check-in" },
  ];
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20 }}>
      <div
        style={{
          background: COLORS.inkDeep,
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          padding: "14px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          onClick={() => setTab("home")}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: COLORS.gold,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18,
              color: COLORS.inkDeep,
              transform: "rotate(-6deg)",
            }}
          >
            D
          </div>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 1, color: COLORS.paper }}>
            DICTAZ
          </span>
        </div>
        <div className="nav-tabs" style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", padding: 4, borderRadius: 10, maxWidth: "100%", overflowX: "auto" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "8px 16px",
                borderRadius: 8,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 13.5,
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: tab === t.id ? COLORS.gold : "transparent",
                color: tab === t.id ? COLORS.inkDeep : COLORS.paper,
                transition: "background 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {banner && (
        <div
          style={{
            background: banner.type === "error" ? COLORS.red : COLORS.gold,
            color: banner.type === "error" ? COLORS.paper : COLORS.inkDeep,
            textAlign: "center",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 13.5,
            padding: "8px 12px",
          }}
        >
          {banner.text}
        </div>
      )}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
function Empty({ title, body, cta }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "70px 20px",
        color: COLORS.paper,
      }}
    >
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 0.5 }}>{title}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", color: COLORS.mute, marginTop: 8, fontSize: 14.5 }}>{body}</div>
      {cta}
    </div>
  );
}

/* ---------------- Browse ---------------- */
function EventCard({ ev, remaining, onSelect }) {
  const soldOut = remaining <= 0;
  return (
    <Stub accent={soldOut ? COLORS.red : COLORS.gold} bg={COLORS.paper} className="event-card">
      <div style={{ padding: "20px 22px 16px 30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: 1, color: COLORS.goldDeep, textTransform: "uppercase" }}>
            {fmtDate(ev.date)} {ev.time ? `· ${ev.time}` : ""}
          </span>
          {soldOut && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: COLORS.red }}>SOLD OUT</span>
          )}
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: COLORS.slate, marginTop: 4, lineHeight: 1.05 }}>
          {ev.name}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: COLORS.mute, marginTop: 2 }}>{ev.location}</div>
        {ev.description && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: COLORS.slate, marginTop: 10, lineHeight: 1.5 }}>
            {ev.description}
          </div>
        )}
      </div>
      <Perforation notchBg={COLORS.inkDeep} />
      <div style={{ padding: "16px 22px 20px 30px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: COLORS.slate }}>{money(ev.price)}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: COLORS.mute }}>
            {soldOut ? "no seats left" : `${remaining} of ${ev.capacity} left`}
          </div>
        </div>
        <button
          disabled={soldOut}
          onClick={() => onSelect(ev)}
          style={{
            border: "none",
            cursor: soldOut ? "not-allowed" : "pointer",
            padding: "10px 18px",
            borderRadius: 8,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: 13.5,
            background: soldOut ? COLORS.paperDim : COLORS.ink,
            color: soldOut ? COLORS.mute : COLORS.paper,
          }}
        >
          {soldOut ? "Unavailable" : "Get tickets"}
        </button>
      </div>
    </Stub>
  );
}

function PurchaseFlow({ event, remaining, onClose, onConfirm }) {
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim() || !email.trim()) return setError("Name and email are required.");
    if (qty < 1 || qty > remaining) return setError(`Choose between 1 and ${remaining} tickets.`);
    setError("");
    onConfirm({ name: name.trim(), email: email.trim(), qty: Number(qty) });
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ maxWidth: 460, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <Stub accent={COLORS.gold} bg={COLORS.paper}>
          <div style={{ padding: "24px 26px 18px 32px" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: COLORS.goldDeep, letterSpacing: 1, textTransform: "uppercase" }}>
              {fmtDate(event.date)}
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: COLORS.slate }}>{event.name}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.mute, marginTop: 2 }}>{event.location}</div>

            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={fieldLabel}>
                Your name
                <input style={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
              </label>
              <label style={fieldLabel}>
                Email
                <input style={fieldInput} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@email.com" />
              </label>
              <label style={fieldLabel}>
                Tickets ({remaining} available)
                <input
                  style={fieldInput}
                  type="number"
                  min={1}
                  max={remaining}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </label>
              {error && <div style={{ color: COLORS.red, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600 }}>{error}</div>}
            </div>
          </div>
          <Perforation notchBg={COLORS.inkDeep} />
          <div style={{ padding: "16px 26px 22px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: COLORS.slate }}>
                {money((Number(event.price) || 0) * (Number(qty) || 0))}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: COLORS.mute }}>total, mock checkout</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={ghostBtn}>Cancel</button>
              <button onClick={submit} style={solidBtn}>Confirm order</button>
            </div>
          </div>
        </Stub>
      </div>
    </div>
  );
}

function TicketReceipt({ event, tickets, onClose }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ maxWidth: 460, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tickets.map((t, i) => (
            <Stub key={t.id} accent={COLORS.gold} bg={COLORS.paper}>
              <div style={{ padding: "20px 22px 14px 30px" }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: COLORS.goldDeep, textTransform: "uppercase" }}>
                  Admit One — Ticket {i + 1} of {tickets.length}
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: COLORS.slate }}>{event.name}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: COLORS.mute }}>
                  {fmtDate(event.date)} {event.time ? `· ${event.time}` : ""} · {event.location}
                </div>
              </div>
              <Perforation notchBg={COLORS.inkDeep} />
              <div style={{ padding: "16px 22px 20px 30px", display: "flex", alignItems: "center", gap: 16 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(t.code)}`}
                  alt={`QR code for ticket ${t.code}`}
                  width={92}
                  height={92}
                  style={{ borderRadius: 6, border: `1px solid ${COLORS.line}` }}
                />
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: COLORS.mute }}>Ticket code</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 600, color: COLORS.slate, letterSpacing: 1 }}>
                    {t.code}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: COLORS.mute, marginTop: 6 }}>
                    {t.buyerName}
                  </div>
                </div>
              </div>
            </Stub>
          ))}
          <button onClick={onClose} style={{ ...solidBtn, alignSelf: "center" }}>Done</button>
        </div>
      </div>
    </div>
  );
}

function EventGrid({ events, remainingFor, onSelect }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 20,
      }}
    >
      {events.map((ev) => (
        <EventCard key={ev.id} ev={ev} remaining={remainingFor(ev)} onSelect={onSelect} />
      ))}
    </div>
  );
}

/* ---------------- Hero / Home ---------------- */
function Hero({ eventCount, onBrowse, onList }) {
  return (
    <div className="hero" style={{ position: "relative", overflow: "hidden", padding: "56px 22px 46px", textAlign: "center" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 20% 15%, rgba(108,75,255,0.35), transparent 45%), radial-gradient(circle at 82% 75%, rgba(232,163,61,0.16), transparent 40%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
        <div
          style={{
            display: "inline-block",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: COLORS.gold,
            border: `1px solid ${COLORS.gold}`,
            borderRadius: 20,
            padding: "5px 14px",
            marginBottom: 18,
          }}
        >
          {eventCount > 0 ? `${eventCount} event${eventCount > 1 ? "s" : ""} on sale now` : "Ticketing & planning, in one place"}
        </div>
        <h1 className="hero-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, lineHeight: 1, letterSpacing: 0.5, color: COLORS.paper, margin: "0 0 14px" }}>
          Events worth
          <br />
          showing up for.
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15.5, color: COLORS.mute, maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Dictaz gets your event on sale, keeps the planning organized, and lets vendors bring their own — all from one dashboard.
        </p>
        <div className="hero-actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onBrowse} style={{ ...solidBtn, padding: "12px 26px", fontSize: 14.5, background: COLORS.gold, color: COLORS.inkDeep }}>
            Browse events
          </button>
          <button onClick={onList} style={{ ...ghostBtn, padding: "12px 26px", fontSize: 14.5, background: "transparent", color: COLORS.paper, borderColor: "rgba(251,247,239,0.35)" }}>
            List your event
          </button>
        </div>
      </div>
    </div>
  );
}

function Home({ events, tickets, onBrowse, onList }) {
  const upcoming = events
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .slice(0, 6);

  return (
    <div>
      <Hero eventCount={events.length} onBrowse={onBrowse} onList={onList} />
      <div style={{ padding: "8px 22px 60px", maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: COLORS.paper }}>Happening soon</div>
          {events.length > 6 && (
            <button onClick={onBrowse} style={{ ...ghostBtn, color: COLORS.paper, borderColor: "rgba(251,247,239,0.35)" }}>
              See all {events.length} events
            </button>
          )}
        </div>
        {upcoming.length === 0 ? (
          <Empty
            title="No events yet"
            body="Publish one from the Dashboard, or list one as a vendor — it'll show up right here."
            cta={
              <button onClick={onList} style={{ ...solidBtn, marginTop: 16 }}>
                List your event
              </button>
            }
          />
        ) : (
          <EventGrid events={upcoming} remainingFor={(ev) => remainingForEvent(ev, tickets)} onSelect={onBrowse} />
        )}
      </div>
    </div>
  );
}

function Browse({ events, tickets, onPurchased }) {
  const [selected, setSelected] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const remainingFor = (ev) => remainingForEvent(ev, tickets);

  const handleConfirm = ({ name, email, qty }) => {
    const created = Array.from({ length: qty }).map(() => ({
      id: uid(),
      eventId: selected.id,
      buyerName: name,
      buyerEmail: email,
      qty: 1,
      code: ticketCode(selected.name),
      checkedIn: false,
      purchasedAt: new Date().toISOString(),
    }));
    onPurchased(created);
    setReceipt({ event: selected, tickets: created });
    setSelected(null);
  };

  if (!events.length) {
    return (
      <Empty
        title="No events on sale yet"
        body="Once an organizer publishes an event from the Dashboard tab, it'll show up here."
      />
    );
  }

  return (
    <div style={{ padding: "28px 22px 60px", maxWidth: 1040, margin: "0 auto" }}>
      <EventGrid
        events={events.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""))}
        remainingFor={remainingFor}
        onSelect={setSelected}
      />
      {selected && (
        <PurchaseFlow
          event={selected}
          remaining={remainingFor(selected)}
          onClose={() => setSelected(null)}
          onConfirm={handleConfirm}
        />
      )}
      {receipt && <TicketReceipt event={receipt.event} tickets={receipt.tickets} onClose={() => setReceipt(null)} />}
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
const fieldLabel = { display: "flex", flexDirection: "column", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.slate };
const fieldInput = {
  border: `1px solid ${COLORS.line}`,
  borderRadius: 8,
  padding: "9px 11px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: COLORS.slate,
  outline: "none",
  background: "#fff",
};
const solidBtn = {
  border: "none",
  cursor: "pointer",
  padding: "10px 18px",
  borderRadius: 8,
  fontFamily: "'Inter', sans-serif",
  fontWeight: 700,
  fontSize: 13.5,
  background: COLORS.ink,
  color: COLORS.paper,
};
const ghostBtn = {
  border: `1px solid ${COLORS.line}`,
  cursor: "pointer",
  padding: "10px 16px",
  borderRadius: 8,
  fontFamily: "'Inter', sans-serif",
  fontWeight: 600,
  fontSize: 13.5,
  background: "transparent",
  color: COLORS.slate,
};
const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(13,23,48,0.55)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 50,
};

function EventForm({ onCreate, onCancel }) {
  const [f, setF] = useState({ name: "", description: "", date: "", time: "", location: "", price: "", capacity: "" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = () => {
    if (!f.name.trim() || !f.date || !f.location.trim() || !f.capacity) {
      setError("Name, date, location, and capacity are required.");
      return;
    }
    onCreate({
      id: uid(),
      name: f.name.trim(),
      description: f.description.trim(),
      date: f.date,
      time: f.time,
      location: f.location.trim(),
      price: Number(f.price) || 0,
      capacity: Math.max(1, Number(f.capacity) || 1),
    });
  };

  return (
    <Stub accent={COLORS.gold} bg={COLORS.paper} style={{ marginBottom: 24 }}>
      <div style={{ padding: "22px 26px" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: COLORS.slate, marginBottom: 14 }}>New event</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
            Event name
            <input style={fieldInput} value={f.name} onChange={set("name")} placeholder="Dictaz Product Showcase" />
          </label>
          <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
            Description
            <input style={fieldInput} value={f.description} onChange={set("description")} placeholder="What's it about?" />
          </label>
          <label style={fieldLabel}>
            Date
            <input style={fieldInput} type="date" value={f.date} onChange={set("date")} />
          </label>
          <label style={fieldLabel}>
            Time
            <input style={fieldInput} type="time" value={f.time} onChange={set("time")} />
          </label>
          <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
            Location
            <input style={fieldInput} value={f.location} onChange={set("location")} placeholder="Accra Digital Centre" />
          </label>
          <label style={fieldLabel}>
            Price (USD, 0 = free)
            <input style={fieldInput} type="number" min={0} value={f.price} onChange={set("price")} placeholder="0" />
          </label>
          <label style={fieldLabel}>
            Capacity
            <input style={fieldInput} type="number" min={1} value={f.capacity} onChange={set("capacity")} placeholder="100" />
          </label>
        </div>
        {error && <div style={{ color: COLORS.red, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, marginTop: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={submit} style={solidBtn}>Publish event</button>
          <button onClick={onCancel} style={ghostBtn}>Cancel</button>
        </div>
      </div>
    </Stub>
  );
}

function Dashboard({ events, tickets, submissions, onCreate, onDelete, onResetData, onApproveSubmission, onRejectSubmission }) {
  const [creating, setCreating] = useState(false);

  const soldFor = (id) => tickets.filter((t) => t.eventId === id).reduce((s, t) => s + t.qty, 0);
  const totalRevenue = events.reduce((sum, ev) => sum + soldFor(ev.id) * (Number(ev.price) || 0), 0);
  const totalSold = events.reduce((sum, ev) => sum + soldFor(ev.id), 0);

  const chartData = events.map((ev) => ({ name: ev.name.length > 14 ? ev.name.slice(0, 13) + "…" : ev.name, sold: soldFor(ev.id), capacity: Number(ev.capacity) }));
  const pending = submissions.filter((s) => s.status === "pending");

  return (
    <div style={{ padding: "28px 22px 60px", maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <StatPill label="Events live" value={events.length} />
          <StatPill label="Tickets sold" value={totalSold} />
          <StatPill label="Revenue" value={money(totalRevenue)} />
          {pending.length > 0 && <StatPill label="Pending submissions" value={pending.length} />}
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} style={solidBtn}>+ New event</button>
        )}
      </div>

      {pending.length > 0 && (
        <Panel title="Vendor submissions awaiting review">
          {pending.map((s) => (
            <div key={s.id} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ color: COLORS.slate, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: COLORS.mute }}>
                  {fmtDate(s.date)} {s.time ? `· ${s.time}` : ""} · {s.location} · submitted by {s.vendorName} ({s.vendorEmail})
                </div>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: COLORS.slate }}>{money(s.price)}</span>
              <button style={{ ...smallBtn, background: COLORS.gold, color: COLORS.inkDeep, border: "none" }} onClick={() => onApproveSubmission(s.id)}>
                Approve
              </button>
              <button style={{ ...smallBtn, color: COLORS.red, borderColor: COLORS.red }} onClick={() => onRejectSubmission(s.id)}>
                Reject
              </button>
            </div>
          ))}
        </Panel>
      )}

      {creating && <EventForm onCreate={(ev) => { onCreate(ev); setCreating(false); }} onCancel={() => setCreating(false)} />}

      {events.length > 0 && (
        <Stub accent={COLORS.gold} bg={COLORS.paper} style={{ marginBottom: 24 }}>
          <div style={{ padding: "20px 26px" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: COLORS.slate, marginBottom: 10 }}>Tickets sold per event</div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontFamily: "Inter", fontSize: 11, fill: COLORS.mute }} />
                  <YAxis tick={{ fontFamily: "Inter", fontSize: 11, fill: COLORS.mute }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="sold" fill={COLORS.gold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Stub>
      )}

      {events.length === 0 && !creating && (
        <Empty
          title="Nothing published yet"
          body="Create your first event and it'll appear on the Browse tab instantly."
          cta={
            <button onClick={() => setCreating(true)} style={{ ...solidBtn, marginTop: 16 }}>
              + New event
            </button>
          }
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {events.map((ev) => {
          const sold = soldFor(ev.id);
          const pct = Math.min(100, (sold / Math.max(1, Number(ev.capacity))) * 100);
          return (
            <Stub key={ev.id} accent={COLORS.gold} bg={COLORS.paper}>
              <div style={{ padding: "16px 20px 16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: COLORS.slate }}>{ev.name}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: COLORS.mute }}>{fmtDate(ev.date)} · {ev.location}</div>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ height: 8, borderRadius: 6, background: COLORS.paperDim, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: COLORS.gold }} />
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: COLORS.mute, marginTop: 4 }}>
                    {sold} / {ev.capacity} sold · {money(sold * ev.price)}
                  </div>
                </div>
                <button onClick={() => onDelete(ev.id)} style={{ ...ghostBtn, color: COLORS.red, borderColor: COLORS.red }}>
                  Delete
                </button>
              </div>
            </Stub>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: 40 }}>
        <button onClick={onResetData} style={{ ...ghostBtn, fontSize: 12, opacity: 0.6 }}>Clear all Dictaz data</button>
      </div>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={{ background: COLORS.paper, borderRadius: 10, padding: "8px 16px", border: `1px solid ${COLORS.line}` }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: COLORS.slate, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: COLORS.mute, marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ---------------- Check-in ---------------- */
function CheckIn({ events, tickets, onCheckIn }) {
  const [query, setQuery] = useState("");
  const found = tickets.find((t) => t.code.toLowerCase() === query.trim().toLowerCase());
  const ev = found ? events.find((e) => e.id === found.eventId) : null;

  const recentCheckins = tickets
    .filter((t) => t.checkedIn)
    .sort((a, b) => (b.checkedInAt || "").localeCompare(a.checkedInAt || ""))
    .slice(0, 6);

  return (
    <div style={{ padding: "28px 22px 60px", maxWidth: 640, margin: "0 auto" }}>
      <Stub accent={COLORS.gold} bg={COLORS.paper} style={{ marginBottom: 22 }}>
        <div style={{ padding: "24px 26px" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: COLORS.slate, marginBottom: 10 }}>Scan or enter a ticket code</div>
          <input
            style={{ ...fieldInput, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, letterSpacing: 1, width: "100%", boxSizing: "border-box" }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ABC-DEF123"
            autoFocus
          />
          {query.trim() && !found && (
            <div style={{ marginTop: 12, color: COLORS.red, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5 }}>
              No ticket matches that code.
            </div>
          )}
          {found && ev && (
            <div style={{ marginTop: 16, borderTop: `2px dashed ${COLORS.line}`, paddingTop: 16 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: COLORS.slate }}>{ev.name}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.mute }}>{found.buyerName} · {found.buyerEmail}</div>
              <div style={{ marginTop: 12 }}>
                {found.checkedIn ? (
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: "#5C8A3A", fontSize: 13.5 }}>
                    ✓ Already checked in
                  </span>
                ) : (
                  <button onClick={() => onCheckIn(found.id)} style={solidBtn}>Check in</button>
                )}
              </div>
            </div>
          )}
        </div>
      </Stub>

      {recentCheckins.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: COLORS.paper, opacity: 0.7, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Recently checked in
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentCheckins.map((t) => {
              const e = events.find((ev2) => ev2.id === t.eventId);
              return (
                <div key={t.id} style={{ background: COLORS.paper, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
                  <span style={{ color: COLORS.slate, fontWeight: 600 }}>{t.buyerName}</span>
                  <span style={{ color: COLORS.mute }}>{e ? e.name : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Planner ---------------- */
const STATUS_COLORS = {
  Contacted: COLORS.mute,
  Booked: COLORS.goldDeep,
  Confirmed: "#5C8A3A",
};

function SubNav({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 4, background: COLORS.inkDeep, padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 20 }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            border: "none",
            cursor: "pointer",
            padding: "7px 14px",
            borderRadius: 7,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            background: value === o.id ? COLORS.gold : "transparent",
            color: value === o.id ? COLORS.inkDeep : COLORS.paper,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Panel({ children, title, right }) {
  return (
    <Stub accent={COLORS.gold} bg={COLORS.paper} style={{ marginBottom: 18 }}>
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: COLORS.slate }}>{title}</div>
          {right}
        </div>
        {children}
      </div>
    </Stub>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 10,
  padding: "10px 0",
  borderBottom: `1px solid ${COLORS.line}`,
  fontFamily: "'Inter', sans-serif",
  fontSize: 13.5,
};
const smallBtn = { ...ghostBtn, padding: "6px 10px", fontSize: 12 };
const badge = (bg, fg) => ({
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: 20,
  background: bg,
  color: fg,
});

function TaskPanel({ tasks, onAdd, onToggle, onDelete }) {
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const submit = () => {
    if (!text.trim()) return;
    onAdd({ id: uid(), text: text.trim(), due, done: false });
    setText("");
    setDue("");
  };

  return (
    <Panel
      title="Checklist"
      right={
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: COLORS.mute }}>
          {done}/{tasks.length} done · {pct}%
        </div>
      }
    >
      <div style={{ height: 6, borderRadius: 4, background: COLORS.paperDim, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: COLORS.gold }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input style={{ ...fieldInput, flex: 1, minWidth: 180 }} placeholder="Add a task…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <input style={{ ...fieldInput, width: 150 }} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button style={solidBtn} onClick={submit}>Add</button>
      </div>
      {tasks.length === 0 ? (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.mute }}>No tasks yet — add the first one above.</div>
      ) : (
        tasks.map((t) => (
          <div key={t.id} style={rowStyle}>
            <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} style={{ width: 16, height: 16, accentColor: COLORS.gold }} />
            <span style={{ flex: 1, minWidth: 140, color: t.done ? COLORS.mute : COLORS.slate, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
            {t.due && <span style={{ fontSize: 11.5, color: COLORS.mute, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(t.due)}</span>}
            <button style={smallBtn} onClick={() => onDelete(t.id)}>Remove</button>
          </div>
        ))
      )}
    </Panel>
  );
}

function BudgetPanel({ items, onAdd, onTogglePaid, onDelete }) {
  const [category, setCategory] = useState("");
  const [item, setItem] = useState("");
  const [est, setEst] = useState("");
  const [actual, setActual] = useState("");

  const totalEst = items.reduce((s, i) => s + (Number(i.est) || 0), 0);
  const totalActual = items.reduce((s, i) => s + (Number(i.actual) || 0), 0);
  const delta = totalEst - totalActual;

  const submit = () => {
    if (!item.trim() || !category.trim()) return;
    onAdd({ id: uid(), category: category.trim(), item: item.trim(), est: Number(est) || 0, actual: Number(actual) || 0, paid: false });
    setCategory("");
    setItem("");
    setEst("");
    setActual("");
  };

  return (
    <Panel
      title="Budget"
      right={
        <div style={{ display: "flex", gap: 14, fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}>
          <span style={{ color: COLORS.mute }}>Est {money(totalEst)}</span>
          <span style={{ color: COLORS.mute }}>Actual {money(totalActual)}</span>
          <span style={{ color: delta >= 0 ? "#5C8A3A" : COLORS.red, fontWeight: 700 }}>{delta >= 0 ? "Under" : "Over"} {money(Math.abs(delta))}</span>
        </div>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input style={{ ...fieldInput, width: 130 }} placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input style={{ ...fieldInput, flex: 1, minWidth: 160 }} placeholder="Line item" value={item} onChange={(e) => setItem(e.target.value)} />
        <input style={{ ...fieldInput, width: 100 }} type="number" placeholder="Est." value={est} onChange={(e) => setEst(e.target.value)} />
        <input style={{ ...fieldInput, width: 100 }} type="number" placeholder="Actual" value={actual} onChange={(e) => setActual(e.target.value)} />
        <button style={solidBtn} onClick={submit}>Add</button>
      </div>
      {items.length === 0 ? (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.mute }}>No line items yet — add your first cost above.</div>
      ) : (
        items.map((i) => (
          <div key={i.id} style={rowStyle}>
            <span style={badge(COLORS.paperDim, COLORS.slate)}>{i.category}</span>
            <span style={{ flex: 1, minWidth: 140, color: COLORS.slate }}>{i.item}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: COLORS.mute }}>est {money(i.est)}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: COLORS.slate }}>act {money(i.actual)}</span>
            <button
              style={{ ...smallBtn, ...(i.paid ? { background: "#5C8A3A", color: "#fff", border: "none" } : {}) }}
              onClick={() => onTogglePaid(i.id)}
            >
              {i.paid ? "Paid" : "Mark paid"}
            </button>
            <button style={smallBtn} onClick={() => onDelete(i.id)}>Remove</button>
          </div>
        ))
      )}
    </Panel>
  );
}

function VendorPanel({ vendors, onAdd, onDelete, onStatus }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [contact, setContact] = useState("");
  const [cost, setCost] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ id: uid(), name: name.trim(), category: category.trim(), contact: contact.trim(), cost: Number(cost) || 0, status: "Contacted" });
    setName("");
    setCategory("");
    setContact("");
    setCost("");
  };

  return (
    <Panel title="Vendors">
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input style={{ ...fieldInput, flex: 1, minWidth: 140 }} placeholder="Vendor name" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={{ ...fieldInput, width: 130 }} placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input style={{ ...fieldInput, width: 170 }} placeholder="Contact (email/phone)" value={contact} onChange={(e) => setContact(e.target.value)} />
        <input style={{ ...fieldInput, width: 100 }} type="number" placeholder="Cost" value={cost} onChange={(e) => setCost(e.target.value)} />
        <button style={solidBtn} onClick={submit}>Add</button>
      </div>
      {vendors.length === 0 ? (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.mute }}>No vendors yet — add one above.</div>
      ) : (
        vendors.map((v) => (
          <div key={v.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ color: COLORS.slate, fontWeight: 600 }}>{v.name}</div>
              <div style={{ fontSize: 11.5, color: COLORS.mute }}>{v.category} {v.contact ? `· ${v.contact}` : ""}</div>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: COLORS.slate }}>{money(v.cost)}</span>
            <select
              value={v.status}
              onChange={(e) => onStatus(v.id, e.target.value)}
              style={{ ...badge(COLORS.paperDim, STATUS_COLORS[v.status] || COLORS.slate), border: "none", cursor: "pointer" }}
            >
              <option>Contacted</option>
              <option>Booked</option>
              <option>Confirmed</option>
            </select>
            <button style={smallBtn} onClick={() => onDelete(v.id)}>Remove</button>
          </div>
        ))
      )}
    </Panel>
  );
}

function TimelinePanel({ items, onAdd, onDelete }) {
  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("");
  const [owner, setOwner] = useState("");

  const submit = () => {
    if (!time || !activity.trim()) return;
    onAdd({ id: uid(), time, activity: activity.trim(), owner: owner.trim() });
    setTime("");
    setActivity("");
    setOwner("");
  };

  const sorted = items.slice().sort((a, b) => a.time.localeCompare(b.time));

  return (
    <Panel title="Day-of timeline">
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input style={{ ...fieldInput, width: 110 }} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <input style={{ ...fieldInput, flex: 1, minWidth: 160 }} placeholder="Activity" value={activity} onChange={(e) => setActivity(e.target.value)} />
        <input style={{ ...fieldInput, width: 140 }} placeholder="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <button style={solidBtn} onClick={submit}>Add</button>
      </div>
      {sorted.length === 0 ? (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.mute }}>No schedule yet — add the first slot above.</div>
      ) : (
        sorted.map((i) => (
          <div key={i.id} style={rowStyle}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13, color: COLORS.goldDeep, width: 60 }}>{i.time}</span>
            <span style={{ flex: 1, minWidth: 140, color: COLORS.slate }}>{i.activity}</span>
            <span style={{ fontSize: 11.5, color: COLORS.mute }}>{i.owner}</span>
            <button style={smallBtn} onClick={() => onDelete(i.id)}>Remove</button>
          </div>
        ))
      )}
    </Panel>
  );
}

function Planner({ events, tasks, budgetItems, vendors, timeline, handlers }) {
  const [eventId, setEventId] = useState(events[0]?.id || "");
  const [sub, setSub] = useState("tasks");

  useEffect(() => {
    if (!events.find((e) => e.id === eventId)) setEventId(events[0]?.id || "");
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  if (events.length === 0) {
    return <Empty title="Nothing to plan yet" body="Publish an event from the Dashboard tab, then come back here to build out tasks, budget, vendors, and a timeline." />;
  }

  const evTasks = tasks.filter((t) => t.eventId === eventId);
  const evBudget = budgetItems.filter((b) => b.eventId === eventId);
  const evVendors = vendors.filter((v) => v.eventId === eventId);
  const evTimeline = timeline.filter((t) => t.eventId === eventId);

  return (
    <div style={{ padding: "28px 22px 60px", maxWidth: 900, margin: "0 auto" }}>
      <label style={{ ...fieldLabel, color: COLORS.paper, marginBottom: 18, display: "block", maxWidth: 380 }}>
        Planning for
        <select style={{ ...fieldInput, width: "100%" }} value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name} · {fmtDate(e.date)}</option>
          ))}
        </select>
      </label>

      <SubNav
        value={sub}
        onChange={setSub}
        options={[
          { id: "tasks", label: "Tasks" },
          { id: "budget", label: "Budget" },
          { id: "vendors", label: "Vendors" },
          { id: "timeline", label: "Timeline" },
        ]}
      />

      {sub === "tasks" && (
        <TaskPanel
          tasks={evTasks}
          onAdd={(t) => handlers.addTask({ ...t, eventId })}
          onToggle={handlers.toggleTask}
          onDelete={handlers.deleteTask}
        />
      )}
      {sub === "budget" && (
        <BudgetPanel
          items={evBudget}
          onAdd={(b) => handlers.addBudget({ ...b, eventId })}
          onTogglePaid={handlers.toggleBudgetPaid}
          onDelete={handlers.deleteBudget}
        />
      )}
      {sub === "vendors" && (
        <VendorPanel
          vendors={evVendors}
          onAdd={(v) => handlers.addVendor({ ...v, eventId })}
          onStatus={handlers.setVendorStatus}
          onDelete={handlers.deleteVendor}
        />
      )}
      {sub === "timeline" && (
        <TimelinePanel
          items={evTimeline}
          onAdd={(t) => handlers.addTimeline({ ...t, eventId })}
          onDelete={handlers.deleteTimeline}
        />
      )}
    </div>
  );
}

/* ---------------- Vendor portal ---------------- */
function VendorSignIn({ onSignIn }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim() || !email.trim()) return setError("Enter your name and email to continue.");
    setError("");
    onSignIn({ name: name.trim(), email: email.trim().toLowerCase() });
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto 0" }}>
      <Stub accent={COLORS.gold} bg={COLORS.paper}>
        <div style={{ padding: "26px 28px" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: COLORS.slate, marginBottom: 4 }}>Vendor sign-in</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: COLORS.mute, marginBottom: 18 }}>
            Lightweight identity for now — no password, just your name and email so we can track your submissions.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={fieldLabel}>
              Vendor / business name
              <input style={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Golden Bean Coffee" onKeyDown={(e) => e.key === "Enter" && submit()} />
            </label>
            <label style={fieldLabel}>
              Email
              <input style={fieldInput} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" onKeyDown={(e) => e.key === "Enter" && submit()} />
            </label>
            {error && <div style={{ color: COLORS.red, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600 }}>{error}</div>}
            <button onClick={submit} style={{ ...solidBtn, marginTop: 4 }}>Continue</button>
          </div>
        </div>
      </Stub>
    </div>
  );
}

function VendorSubmissionForm({ vendor, onSubmit }) {
  const [f, setF] = useState({ name: "", description: "", date: "", time: "", location: "", price: "", capacity: "" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = () => {
    if (!f.name.trim() || !f.date || !f.location.trim() || !f.capacity) {
      setError("Name, date, location, and capacity are required.");
      return;
    }
    onSubmit({
      id: uid(),
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      name: f.name.trim(),
      description: f.description.trim(),
      date: f.date,
      time: f.time,
      location: f.location.trim(),
      price: Number(f.price) || 0,
      capacity: Math.max(1, Number(f.capacity) || 1),
      status: "pending",
      submittedAt: new Date().toISOString(),
    });
    setF({ name: "", description: "", date: "", time: "", location: "", price: "", capacity: "" });
    setError("");
  };

  return (
    <Panel title="Submit a new event for review">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
          Event name
          <input style={fieldInput} value={f.name} onChange={set("name")} placeholder="Golden Bean Coffee Pop-Up" />
        </label>
        <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
          Description
          <input style={fieldInput} value={f.description} onChange={set("description")} placeholder="What's it about?" />
        </label>
        <label style={fieldLabel}>
          Date
          <input style={fieldInput} type="date" value={f.date} onChange={set("date")} />
        </label>
        <label style={fieldLabel}>
          Time
          <input style={fieldInput} type="time" value={f.time} onChange={set("time")} />
        </label>
        <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
          Location
          <input style={fieldInput} value={f.location} onChange={set("location")} placeholder="Accra Digital Centre" />
        </label>
        <label style={fieldLabel}>
          Price (USD, 0 = free)
          <input style={fieldInput} type="number" min={0} value={f.price} onChange={set("price")} placeholder="0" />
        </label>
        <label style={fieldLabel}>
          Capacity
          <input style={fieldInput} type="number" min={1} value={f.capacity} onChange={set("capacity")} placeholder="100" />
        </label>
      </div>
      {error && <div style={{ color: COLORS.red, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, marginTop: 10 }}>{error}</div>}
      <button onClick={submit} style={{ ...solidBtn, marginTop: 16 }}>Submit for review</button>
    </Panel>
  );
}

const SUBMISSION_STATUS_COLORS = {
  pending: COLORS.goldDeep,
  approved: "#5C8A3A",
  rejected: COLORS.red,
};

function VendorPortal({ submissions, onAddSubmission }) {
  const [vendor, setVendor] = useState(null);

  if (!vendor) return <VendorSignIn onSignIn={setVendor} />;

  const mine = submissions.filter((s) => s.vendorEmail === vendor.email).sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

  return (
    <div style={{ padding: "28px 22px 60px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.paper }}>
          Signed in as <strong>{vendor.name}</strong> ({vendor.email})
        </div>
        <button onClick={() => setVendor(null)} style={ghostBtn}>Switch vendor</button>
      </div>

      <VendorSubmissionForm vendor={vendor} onSubmit={onAddSubmission} />

      <Panel title="Your submissions">
        {mine.length === 0 ? (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.mute }}>Nothing submitted yet.</div>
        ) : (
          mine.map((s) => (
            <div key={s.id} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ color: COLORS.slate, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: COLORS.mute }}>{fmtDate(s.date)} · {s.location}</div>
              </div>
              <span style={badge(COLORS.paperDim, SUBMISSION_STATUS_COLORS[s.status] || COLORS.slate)}>{s.status}</span>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

/* ---------------- App shell ---------------- */
export default function App() {
  const [tab, setTab] = useState("home");
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const flash = (text, type = "ok") => {
    setBanner({ text, type });
    setTimeout(() => setBanner(null), 2600);
  };
  const fail = (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    flash("Couldn't save — try again.", "error");
  };

  useEffect(() => {
    (async () => {
      const safely = async (fn) => {
        try {
          return await fn();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          return [];
        }
      };
      setEvents(await safely(db.events.list));
      setTickets(await safely(db.tickets.list));
      setTasks(await safely(db.tasks.list));
      setBudgetItems(await safely(db.budget.list));
      setVendors(await safely(db.vendors.list));
      setTimeline(await safely(db.timeline.list));
      setSubmissions(await safely(db.submissions.list));
      setLoading(false);
    })();
  }, []);

  const handleCreate = async (ev) => {
    try {
      await db.events.create(ev);
      setEvents([ev, ...events]);
      flash(`"${ev.name}" is live on Browse.`);
    } catch (err) {
      fail(err);
    }
  };
  const handleDelete = async (id) => {
    try {
      await db.events.remove(id); // cascades tickets/tasks/budget/vendors/timeline in the DB
      setEvents(events.filter((e) => e.id !== id));
      setTickets(tickets.filter((t) => t.eventId !== id));
      setTasks(tasks.filter((t) => t.eventId !== id));
      setBudgetItems(budgetItems.filter((b) => b.eventId !== id));
      setVendors(vendors.filter((v) => v.eventId !== id));
      setTimeline(timeline.filter((t) => t.eventId !== id));
      flash("Event removed.");
    } catch (err) {
      fail(err);
    }
  };
  const handlePurchased = async (created) => {
    try {
      await db.tickets.createMany(created);
      setTickets([...tickets, ...created]);
      flash(`${created.length} ticket${created.length > 1 ? "s" : ""} issued.`);
    } catch (err) {
      fail(err);
    }
  };
  const handleAddSubmission = async (s) => {
    try {
      await db.submissions.create(s);
      setSubmissions([...submissions, s]);
      flash("Submitted for review.");
    } catch (err) {
      fail(err);
    }
  };
  const handleApproveSubmission = async (id) => {
    const s = submissions.find((x) => x.id === id);
    if (!s) return;
    const newEvent = {
      id: uid(),
      name: s.name,
      description: s.description,
      date: s.date,
      time: s.time,
      location: s.location,
      price: s.price,
      capacity: s.capacity,
    };
    try {
      await db.events.create(newEvent);
      await db.submissions.setStatus(id, "approved");
      setEvents([newEvent, ...events]);
      setSubmissions(submissions.map((x) => (x.id === id ? { ...x, status: "approved" } : x)));
      flash(`"${s.name}" approved and published.`);
    } catch (err) {
      fail(err);
    }
  };
  const handleRejectSubmission = async (id) => {
    try {
      await db.submissions.setStatus(id, "rejected");
      setSubmissions(submissions.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)));
      flash("Submission rejected.");
    } catch (err) {
      fail(err);
    }
  };
  const handleCheckIn = async (ticketId) => {
    const checkedInAt = new Date().toISOString();
    try {
      await db.tickets.setCheckedIn(ticketId, checkedInAt);
      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, checkedIn: true, checkedInAt } : t)));
      flash("Checked in.");
    } catch (err) {
      fail(err);
    }
  };
  const handleReset = async () => {
    if (!window.confirm("Clear all Dictaz events and tickets? This can't be undone.")) return;
    try {
      await db.resetAll();
      setEvents([]);
      setTickets([]);
      setTasks([]);
      setBudgetItems([]);
      setVendors([]);
      setTimeline([]);
      setSubmissions([]);
      flash("All data cleared.");
    } catch (err) {
      fail(err);
    }
  };

  const plannerHandlers = {
    addTask: async (t) => {
      try {
        await db.tasks.create(t);
        setTasks([...tasks, t]);
      } catch (err) {
        fail(err);
      }
    },
    toggleTask: async (id) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      try {
        await db.tasks.setDone(id, !t.done);
        setTasks(tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
      } catch (err) {
        fail(err);
      }
    },
    deleteTask: async (id) => {
      try {
        await db.tasks.remove(id);
        setTasks(tasks.filter((t) => t.id !== id));
      } catch (err) {
        fail(err);
      }
    },
    addBudget: async (b) => {
      try {
        await db.budget.create(b);
        setBudgetItems([...budgetItems, b]);
      } catch (err) {
        fail(err);
      }
    },
    toggleBudgetPaid: async (id) => {
      const b = budgetItems.find((x) => x.id === id);
      if (!b) return;
      try {
        await db.budget.setPaid(id, !b.paid);
        setBudgetItems(budgetItems.map((x) => (x.id === id ? { ...x, paid: !x.paid } : x)));
      } catch (err) {
        fail(err);
      }
    },
    deleteBudget: async (id) => {
      try {
        await db.budget.remove(id);
        setBudgetItems(budgetItems.filter((b) => b.id !== id));
      } catch (err) {
        fail(err);
      }
    },
    addVendor: async (v) => {
      try {
        await db.vendors.create(v);
        setVendors([...vendors, v]);
      } catch (err) {
        fail(err);
      }
    },
    setVendorStatus: async (id, status) => {
      try {
        await db.vendors.setStatus(id, status);
        setVendors(vendors.map((v) => (v.id === id ? { ...v, status } : v)));
      } catch (err) {
        fail(err);
      }
    },
    deleteVendor: async (id) => {
      try {
        await db.vendors.remove(id);
        setVendors(vendors.filter((v) => v.id !== id));
      } catch (err) {
        fail(err);
      }
    },
    addTimeline: async (t) => {
      try {
        await db.timeline.create(t);
        setTimeline([...timeline, t]);
      } catch (err) {
        fail(err);
      }
    },
    deleteTimeline: async (id) => {
      try {
        await db.timeline.remove(id);
        setTimeline(timeline.filter((t) => t.id !== id));
      } catch (err) {
        fail(err);
      }
    },
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: 2px solid ${COLORS.gold}; outline-offset: 1px; }
        button:focus-visible { outline: 2px solid ${COLORS.gold}; outline-offset: 2px; }
        ::placeholder { color: ${COLORS.mute}; opacity: 0.8; }
        button:not(:disabled) { transition: filter 0.12s ease, transform 0.08s ease; }
        button:not(:disabled):hover { filter: brightness(1.08); }
        button:not(:disabled):active { transform: translateY(1px); }
        .event-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .event-card:hover { transform: translateY(-3px); box-shadow: 0 4px 0 rgba(27,22,51,0.06), 0 22px 36px -16px rgba(18,15,38,0.5); }
        .nav-tabs::-webkit-scrollbar { display: none; }
        .nav-tabs { scrollbar-width: none; }

        @media (max-width: 640px) {
          .hero { padding: 40px 16px 34px !important; }
          .hero-title { font-size: 38px !important; }
          .hero-actions button { width: 100%; }
          .hero-actions { flex-direction: column; align-items: stretch; }
        }
      `}</style>
      <Nav
        tab={tab}
        setTab={setTab}
        banner={
          banner ||
          (!db.isConfigured
            ? { text: "Supabase isn't configured yet — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy. Nothing will save until then.", type: "error" }
            : null)
        }
      />
      {loading ? (
        <div style={{ color: COLORS.paper, textAlign: "center", padding: 80, fontFamily: "'Inter', sans-serif" }}>Loading Dictaz…</div>
      ) : (
        <>
          {tab === "home" && <Home events={events} tickets={tickets} onBrowse={() => setTab("browse")} onList={() => setTab("vendorportal")} />}
          {tab === "browse" && <Browse events={events} tickets={tickets} onPurchased={handlePurchased} />}
          {tab === "planner" && (
            <Planner events={events} tasks={tasks} budgetItems={budgetItems} vendors={vendors} timeline={timeline} handlers={plannerHandlers} />
          )}
          {tab === "vendorportal" && <VendorPortal submissions={submissions} onAddSubmission={handleAddSubmission} />}
          {tab === "dashboard" && (
            <Dashboard
              events={events}
              tickets={tickets}
              submissions={submissions}
              onCreate={handleCreate}
              onDelete={handleDelete}
              onResetData={handleReset}
              onApproveSubmission={handleApproveSubmission}
              onRejectSubmission={handleRejectSubmission}
            />
          )}
          {tab === "checkin" && <CheckIn events={events} tickets={tickets} onCheckIn={handleCheckIn} />}
        </>
      )}
    </div>
  );
}
