'use client';
import React, { useState, useEffect } from 'react';

/**
 * Admin dashboard client component.
 * - Login form (calls /api/auth/login)
 * - List specials and stores (calls /api/specials and /api/stores)
 * - Create special (POST /api/specials) — protected
 * - View supplier inquiries (GET /api/supplier-inquiries) — protected
 *
 * This page is intentionally a client component: uses cookies for token auth (httpOnly cookie)
 */

function formatCurrency(bwp: number) {
  return `P ${bwp.toFixed(2)}`;
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [loginCred, setLoginCred] = useState({ email: 'admin@sefalana.co.bw', password: '' });
  const [specials, setSpecials] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [newSpecial, setNewSpecial] = useState({ title: '', description: '', price_bwp: '', original_price_bwp: '', image_url: '' });
  const [message, setMessage] = useState<string | null>(null);

  async function fetchInitial() {
    try {
      setLoadingUser(true);
      // Try to load specials & stores (public GETs)
      const sp = await fetch('/api/specials', { cache: 'no-store' }).then((r) => r.json());
      setSpecials(sp.data || []);

      const st = await fetch('/api/stores', { cache: 'no-store' }).then((r) => r.json());
      setStores(st.data || []);
    } finally {
      setLoadingUser(false);
    }
  }

  useEffect(() => {
    fetchInitial();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCred),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error || 'Login failed');
        return;
      }
      setUser(json.user);
      // After login, fetch protected resources
      await fetchProtectedResources();
      setMessage('Login successful');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('login err', err);
      setMessage('Network error');
    }
  }

  async function fetchProtectedResources() {
    try {
      const res1 = await fetch('/api/supplier-inquiries', { credentials: 'include' });
      if (res1.ok) {
        const j1 = await res1.json();
        setInquiries(j1.data || []);
      } else {
        // not authorized or other error
        setInquiries([]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fetch protected error', err);
    }
  }

  async function createSpecial(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const payload: any = {
        title: newSpecial.title,
        description: newSpecial.description,
        price_bwp: Number(newSpecial.price_bwp),
      };
      if (newSpecial.original_price_bwp) payload.original_price_bwp = Number(newSpecial.original_price_bwp);
      if (newSpecial.image_url) payload.image_url = newSpecial.image_url;

      const res = await fetch('/api/specials', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error || 'Creation failed');
      } else {
        setSpecials((s) => [json.data, ...s]);
        setNewSpecial({ title: '', description: '', price_bwp: '', original_price_bwp: '', image_url: '' });
        setMessage('Special created');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('create special error', err);
      setMessage('Network error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-[#0A192F] text-white py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sefalana Admin Dashboard</h1>
          <a href="/" className="text-white">Back to public site</a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <section className="bg-white p-4 rounded shadow-sm">
          <h2 className="text-xl font-semibold">Administrator</h2>
          {!user ? (
            <form onSubmit={login} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <input required type="email" placeholder="Email" value={loginCred.email} onChange={(e) => setLoginCred({ ...loginCred, email: e.target.value })} className="p-2 border rounded col-span-1" />
              <input required type="password" placeholder="Password" value={loginCred.password} onChange={(e) => setLoginCred({ ...loginCred, password: e.target.value })} className="p-2 border rounded col-span-1" />
              <div className="col-span-1">
                <button type="submit" className="bg-[#0A192F] text-white px-4 py-2 rounded">Log in</button>
              </div>
              {message && <p className="md:col-span-3 mt-2 text-sm text-red-600">{message}</p>}
            </form>
          ) : (
            <div className="mt-3">
              <p>Signed in as <strong>{user.full_name}</strong> ({user.email})</p>
              <button className="mt-2 bg-gray-200 px-3 py-1 rounded" onClick={async () => { await fetch('/api/auth/logout'); setUser(null); }}>Sign out</button>
            </div>
          )}
        </section>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <section className="bg-white p-4 rounded shadow-sm">
            <h3 className="text-lg font-semibold">Manage Specials</h3>

            <form onSubmit={createSpecial} className="mt-3 grid grid-cols-1 gap-3">
              <input required placeholder="Title" value={newSpecial.title} onChange={(e) => setNewSpecial({ ...newSpecial, title: e.target.value })} className="p-2 border rounded" />
              <input placeholder="Image URL" value={newSpecial.image_url} onChange={(e) => setNewSpecial({ ...newSpecial, image_url: e.target.value })} className="p-2 border rounded" />
              <input required placeholder="Price (BWP)" value={newSpecial.price_bwp} onChange={(e) => setNewSpecial({ ...newSpecial, price_bwp: e.target.value })} className="p-2 border rounded" />
              <input placeholder="Original price (optional)" value={newSpecial.original_price_bwp} onChange={(e) => setNewSpecial({ ...newSpecial, original_price_bwp: e.target.value })} className="p-2 border rounded" />
              <textarea placeholder="Description" value={newSpecial.description} onChange={(e) => setNewSpecial({ ...newSpecial, description: e.target.value })} className="p-2 border rounded" rows={3} />
              <div>
                <button disabled={creating} type="submit" className="bg-[#0A192F] text-white px-4 py-2 rounded">
                  {creating ? 'Creating...' : 'Create Special'}
                </button>
                {message && <p className="mt-2 text-sm">{message}</p>}
              </div>
            </form>

            <div className="mt-4">
              <h4 className="font-semibold">Active Specials</h4>
              <ul className="mt-2 space-y-2">
                {specials.map((s) => (
                  <li key={s.id} className="border p-2 rounded flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-sm text-gray-600">{s.description}</div>
                      <div className="text-sm text-gray-700">{formatCurrency(Number(s.price_bwp))}</div>
                    </div>
                    <div>
                      <button className="bg-yellow-400 px-3 py-1 rounded text-sm">Edit</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bg-white p-4 rounded shadow-sm">
            <h3 className="text-lg font-semibold">Stores & Supplier Inquiries</h3>

            <div className="mt-3">
              <h4 className="font-semibold">Stores</h4>
              <ul className="mt-2 space-y-2">
                {stores.map((s) => (
                  <li key={s.id} className="border p-2 rounded">
                    <div className="font-semibold">{s.name} <span className="text-sm text-gray-600">({s.format})</span></div>
                    <div className="text-sm text-gray-600">{s.address} • {s.city}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold">Supplier Inquiries</h4>
              <div className="mt-2">
                <button className="bg-[#0A192F] text-white px-3 py-1 rounded" onClick={fetchProtectedResources}>Refresh inquiries</button>
                <ul className="mt-2 space-y-2">
                  {inquiries.length === 0 && <li className="text-sm text-gray-600 mt-2">No inquiries or you might not be authorized to view them.</li>}
                  {inquiries.map((iq) => (
                    <li key={iq.id} className="border p-2 rounded">
                      <div className="font-semibold">{iq.company_name} — {iq.contact_name || '—'}</div>
                      <div className="text-sm text-gray-600">{iq.contact_email} • {iq.contact_phone || '—'}</div>
                      <div className="mt-1 text-sm">{iq.message}</div>
                      <div className="mt-1 text-xs text-gray-500">{new Date(iq.received_at).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
