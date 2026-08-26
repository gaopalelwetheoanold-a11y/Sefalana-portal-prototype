import React, { useState, useEffect } from 'react';

/*
  Public Home Page (Server Component with embedded Client portions)
  - Store Locator (client behavior)
  - Weekly Specials Grid
  - Supplier Inquiry Form
*/

/* Tailwind + Sefalana Brand:
  - Navy Blue: #0A192F
  - Gold/Yellow accent: e.g., #FFCC33
*/

const BRAND = {
  navy: '#0A192F',
  gold: '#FFCC33',
};

function formatCurrency(bwp: number) {
  return `P ${bwp.toFixed(2)}`;
}

/* Client component: store search & locator */
function StoreLocator() {
  const [city, setCity] = useState('');
  const [format, setFormat] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchStores() {
    setLoading(true);
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (format) params.set('format', format);
    const res = await fetch(`/api/stores?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    setStores(json.data || []);
    setLoading(false);
  }

  useEffect(() => {
    // initial load
    fetchStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="my-8">
      <h2 className="text-2xl font-semibold text-[#0A192F]">Store Locator</h2>
      <div className="mt-4 flex flex-col md:flex-row gap-3">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City (e.g., Gaborone)"
          className="border rounded-md p-2 flex-1"
        />
        <select value={format} onChange={(e) => setFormat(e.target.value)} className="border rounded-md p-2">
          <option value="">All formats</option>
          <option value="Hyper">Sefalana Hyper</option>
          <option value="Shopper">Sefalana Shopper</option>
          <option value="Cash & Carry">Cash & Carry</option>
        </select>
        <button
          onClick={fetchStores}
          className="bg-[#0A192F] text-white px-4 py-2 rounded-md"
          aria-label="Search stores"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {stores.map((s) => (
          <li key={s.id} className="border rounded p-3 shadow-sm bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-[#0A192F]">{s.name}</h3>
                <p className="text-sm text-gray-600">{s.address}</p>
                <p className="text-sm text-gray-600">{s.city} • {s.format}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm ${s.is_open ? 'text-green-600' : 'text-red-600'}`}>{s.is_open ? 'Open' : 'Closed'}</p>
                {s.phone && <p className="text-sm text-gray-700">{s.phone}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* Client component: weekly specials */
function SpecialsGrid() {
  const [specials, setSpecials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/specials', { cache: 'no-store' });
    const json = await res.json();
    setSpecials(json.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="my-8">
      <h2 className="text-2xl font-semibold text-[#0A192F]">Weekly Specials & Combos</h2>
      {loading ? (
        <p className="mt-4">Loading specials...</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {specials.map((sp) => (
            <article key={sp.id} className="border rounded overflow-hidden shadow-sm bg-white">
              <div className="relative">
                {sp.image_url ? (
                  <img
                    src={sp.image_url}
                    alt={sp.title}
                    loading="lazy"
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">No image</div>
                )}
                {sp.savings_bwp > 0 && (
                  <span className="absolute top-2 left-2 bg-[#FFCC33] text-[#0A192F] px-2 py-1 rounded text-sm font-semibold">
                    Save P {Number(sp.savings_bwp).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">{sp.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{sp.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-[#0A192F]">{formatCurrency(Number(sp.price_bwp))}</div>
                    {sp.original_price_bwp && <div className="text-sm text-gray-500 line-through">P {Number(sp.original_price_bwp).toFixed(2)}</div>}
                  </div>
                  <button className="bg-[#0A192F] text-white px-3 py-2 rounded">View</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* Client component: supplier inquiry form */
function SupplierForm() {
  const [state, setState] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', message: '' });
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const payload = {
      company_name: state.company_name,
      contact_name: state.contact_name,
      contact_email: state.contact_email,
      contact_phone: state.contact_phone,
      message: state.message,
    };

    try {
      const res = await fetch('/api/supplier-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        setStatus({ ok: false, message: json?.error || 'Submission failed' });
      } else {
        setStatus({ ok: true, message: 'Thank you — your inquiry has been received.' });
        setState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', message: '' });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('supplier submit error', err);
      setStatus({ ok: false, message: 'Network error, please try again later.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="my-8">
      <h2 className="text-2xl font-semibold text-[#0A192F]">B2B Supplier Inquiry</h2>
      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input required value={state.company_name} onChange={(e) => setState({ ...state, company_name: e.target.value })} placeholder="Company name" className="p-2 border rounded" />
        <input value={state.contact_name} onChange={(e) => setState({ ...state, contact_name: e.target.value })} placeholder="Contact name" className="p-2 border rounded" />
        <input required type="email" value={state.contact_email} onChange={(e) => setState({ ...state, contact_email: e.target.value })} placeholder="Contact email" className="p-2 border rounded" />
        <input value={state.contact_phone} onChange={(e) => setState({ ...state, contact_phone: e.target.value })} placeholder="Contact phone" className="p-2 border rounded" />
        <textarea required value={state.message} onChange={(e) => setState({ ...state, message: e.target.value })} placeholder="Message / product info" className="p-2 border rounded md:col-span-2" rows={5} />
        <div className="md:col-span-2 flex items-center gap-3">
          <button disabled={submitting} type="submit" className="bg-[#0A192F] text-white px-4 py-2 rounded">
            {submitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
          {status && (
            <p className={`${status.ok ? 'text-green-600' : 'text-red-600'}`}>{status.message}</p>
          )}
        </div>
      </form>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      <header style={{ backgroundColor: BRAND.navy }} className="text-white py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sefalana Portal</h1>
            <p className="text-sm text-gray-200">Official demo — Store locator, weekly specials, and supplier inquiries</p>
          </div>
          <nav className="space-x-4">
            <a href="/" className="text-white">Home</a>
            <a href="/admin" className="text-white">Admin</a>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <StoreLocator />
            <SpecialsGrid />
          </div>

          <aside>
            <div className="sticky top-6">
              <div style={{ borderLeft: `4px solid ${BRAND.gold}` }} className="bg-white p-4 rounded shadow-sm">
                <h3 className="font-semibold text-[#0A192F]">Promotions</h3>
                <p className="text-sm text-gray-600 mt-2">Subscribe to receive weekly specials.</p>
                <form className="mt-3">
                  <input placeholder="Your email" className="p-2 border rounded w-full" />
                  <button className="mt-3 w-full bg-[#0A192F] text-white p-2 rounded">Subscribe</button>
                </form>
              </div>

              <div className="mt-6 bg-white p-4 rounded shadow-sm">
                <h4 className="font-semibold text-[#0A192F]">Supplier Inquiry</h4>
                <p className="text-sm text-gray-600 mt-1">Want to supply to Sefalana? Use the form below.</p>
                <SupplierForm />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <footer className="bg-white border-t py-6">
        <div className="max-w-6xl mx-auto px-4 text-sm text-gray-600">
          © {new Date().getFullYear()} Sefalana — Demo. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
