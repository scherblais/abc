import { useEffect, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { BookScreen } from './screens/BookScreen';
import { AdminScreen } from './screens/AdminScreen';
import { ServiceEditScreen } from './screens/ServiceEditScreen';
import { RevenueScreen } from './screens/RevenueScreen';
import type { Booking, DraftBooking, DraftService, Service, Settings } from './types';
import {
  loadBookings,
  loadServices,
  loadSettings,
  newId,
  saveBookings,
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
  | { name: 'revenue' };

export default function App() {
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings());
  const [services, setServices] = useState<Service[]>(() => {
    const stored = loadServices();
    return stored ?? DEFAULT_CATALOG;
  });
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  useEffect(() => {
    saveServices(services);
  }, [services]);

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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-4">
      {screen.name === 'home' && (
        <HomeScreen
          bookings={bookings}
          catalog={services}
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
          settings={settings}
          onSave={handleSaveBooking}
          onDelete={editingBooking ? handleDeleteBooking : undefined}
          onCancel={() => setScreen({ name: 'home' })}
          onManageCatalog={() => setScreen({ name: 'admin' })}
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
    </div>
  );
}
