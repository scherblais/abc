import { useEffect, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { BookScreen } from './screens/BookScreen';
import { AdminScreen } from './screens/AdminScreen';
import { ServiceEditScreen } from './screens/ServiceEditScreen';
import { RevenueScreen } from './screens/RevenueScreen';
import { ClientsScreen } from './screens/ClientsScreen';
import type {
  Agent,
  Booking,
  Company,
  DraftBooking,
  DraftService,
  Service,
  Settings,
} from './types';
import {
  loadAgents,
  loadBookings,
  loadCompanies,
  loadServices,
  loadSettings,
  newId,
  saveAgents,
  saveBookings,
  saveCompanies,
  saveServices,
  saveSettings,
} from './lib/storage';
import { DEFAULT_CATALOG } from './lib/catalog';
import { geocode } from './lib/geocode';
import { googleGeocode } from './lib/google';

type Screen =
  | { name: 'home' }
  | { name: 'book'; editingId?: string }
  | { name: 'admin' }
  | { name: 'service-edit'; serviceId?: string }
  | { name: 'clients' }
  | { name: 'revenue' };

export default function App() {
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings());
  const [services, setServices] = useState<Service[]>(() => {
    const stored = loadServices();
    return stored ?? DEFAULT_CATALOG;
  });
  const [companies, setCompanies] = useState<Company[]>(() => loadCompanies());
  const [agents, setAgents] = useState<Agent[]>(() => loadAgents());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  useEffect(() => {
    saveServices(services);
  }, [services]);

  useEffect(() => {
    saveCompanies(companies);
  }, [companies]);

  useEffect(() => {
    saveAgents(agents);
  }, [agents]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Resolve the starting address on first launch so travel works immediately,
  // before the user ever opens Settings.
  useEffect(() => {
    if (settings.startingAddress && !settings.startingCoords) {
      let cancelled = false;
      (async () => {
        const apiKey = settings.googleApiKey?.trim();
        let coords: { lat: number; lon: number } | null = null;
        if (apiKey) {
          const r = await googleGeocode(settings.startingAddress, apiKey);
          if (r.ok) coords = { lat: r.value.lat, lon: r.value.lon };
        } else {
          const r = await geocode(settings.startingAddress);
          if (r) coords = { lat: r.lat, lon: r.lon };
        }
        if (!cancelled && coords) {
          setSettings((prev) => ({ ...prev, startingCoords: coords! }));
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editingBooking =
    screen.name === 'book' && screen.editingId
      ? bookings.find((b) => b.id === screen.editingId)
      : undefined;

  const editingService =
    screen.name === 'service-edit' && screen.serviceId
      ? services.find((s) => s.id === screen.serviceId)
      : undefined;

  const handleSaveBooking = (draft: DraftBooking) => {
    if (editingBooking) {
      setBookings((prev) =>
        prev.map((b) => (b.id === editingBooking.id ? { ...b, ...draft } : b)),
      );
    } else {
      const next: Booking = {
        ...draft,
        id: newId(),
        createdAt: new Date().toISOString(),
        source: 'me',
      };
      setBookings((prev) => [...prev, next]);
    }
    setScreen({ name: 'home' });
  };

  const handleDeleteBooking = () => {
    if (!editingBooking) return;
    setBookings((prev) => prev.filter((b) => b.id !== editingBooking.id));
    setScreen({ name: 'home' });
  };

  const handleSaveService = (draft: DraftService) => {
    if (editingService) {
      setServices((prev) =>
        prev.map((s) => (s.id === editingService.id ? { ...s, ...draft } : s)),
      );
    } else {
      const next: Service = { ...draft, id: newId() };
      setServices((prev) => [...prev, next]);
    }
    setScreen({ name: 'admin' });
  };

  const handleDeleteService = () => {
    if (!editingService) return;
    setServices((prev) => prev.filter((s) => s.id !== editingService.id));
    setScreen({ name: 'admin' });
  };

  const createCompany = (name: string): Company => {
    const next: Company = {
      id: newId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    setCompanies((prev) => [...prev, next]);
    return next;
  };

  const updateCompany = (id: string, patch: Partial<Company>) => {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    // Cascade: drop agents under this company. Bookings keep companyId/agentId
    // as orphaned IDs — the UI resolves them as "(deleted)" which is fine for
    // historical records.
    setAgents((prev) => prev.filter((a) => a.companyId !== id));
  };

  const createAgent = (companyId: string, name: string): Agent => {
    const next: Agent = {
      id: newId(),
      companyId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    setAgents((prev) => [...prev, next]);
    return next;
  };

  const updateAgent = (id: string, patch: Partial<Agent>) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const deleteAgent = (id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-4">
      {screen.name === 'home' && (
        <HomeScreen
          bookings={bookings}
          catalog={services}
          companies={companies}
          agents={agents}
          onAdd={() => setScreen({ name: 'book' })}
          onOpen={(b) => setScreen({ name: 'book', editingId: b.id })}
          onOpenAdmin={() => setScreen({ name: 'admin' })}
          onOpenRevenue={() => setScreen({ name: 'revenue' })}
        />
      )}
      {screen.name === 'revenue' && (
        <RevenueScreen bookings={bookings} onBack={() => setScreen({ name: 'home' })} />
      )}
      {screen.name === 'book' && (
        <BookScreen
          initial={editingBooking}
          catalog={services}
          companies={companies}
          agents={agents}
          settings={settings}
          onSave={handleSaveBooking}
          onDelete={editingBooking ? handleDeleteBooking : undefined}
          onCancel={() => setScreen({ name: 'home' })}
          onManageCatalog={() => setScreen({ name: 'admin' })}
          onCreateCompany={createCompany}
          onCreateAgent={createAgent}
        />
      )}
      {screen.name === 'admin' && (
        <AdminScreen
          services={services}
          settings={settings}
          onSaveSettings={setSettings}
          onBack={() => setScreen({ name: 'home' })}
          onAdd={() => setScreen({ name: 'service-edit' })}
          onEdit={(s) => setScreen({ name: 'service-edit', serviceId: s.id })}
          onOpenClients={() => setScreen({ name: 'clients' })}
          companiesCount={companies.length}
          agentsCount={agents.length}
        />
      )}
      {screen.name === 'service-edit' && (
        <ServiceEditScreen
          initial={editingService}
          onSave={handleSaveService}
          onDelete={editingService ? handleDeleteService : undefined}
          onCancel={() => setScreen({ name: 'admin' })}
        />
      )}
      {screen.name === 'clients' && (
        <ClientsScreen
          companies={companies}
          agents={agents}
          onBack={() => setScreen({ name: 'admin' })}
          onCreateCompany={createCompany}
          onUpdateCompany={updateCompany}
          onDeleteCompany={deleteCompany}
          onCreateAgent={createAgent}
          onUpdateAgent={updateAgent}
          onDeleteAgent={deleteAgent}
        />
      )}
    </div>
  );
}
