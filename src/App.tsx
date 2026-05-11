import { useEffect, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { BookScreen } from './screens/BookScreen';
import type { Booking, DraftBooking } from './types';
import { loadBookings, newId, saveBookings } from './lib/storage';

type Screen = { name: 'home' } | { name: 'book'; editingId?: string };

export default function App() {
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings());
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  const editing =
    screen.name === 'book' && screen.editingId
      ? bookings.find((b) => b.id === screen.editingId)
      : undefined;

  const handleSave = (draft: DraftBooking) => {
    if (editing) {
      setBookings((prev) =>
        prev.map((b) => (b.id === editing.id ? { ...b, ...draft } : b)),
      );
    } else {
      const newBooking: Booking = {
        ...draft,
        id: newId(),
        createdAt: new Date().toISOString(),
        source: 'me',
      };
      setBookings((prev) => [...prev, newBooking]);
    }
    setScreen({ name: 'home' });
  };

  const handleDelete = () => {
    if (!editing) return;
    setBookings((prev) => prev.filter((b) => b.id !== editing.id));
    setScreen({ name: 'home' });
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-4">
      {screen.name === 'home' && (
        <HomeScreen
          bookings={bookings}
          onAdd={() => setScreen({ name: 'book' })}
          onOpen={(b) => setScreen({ name: 'book', editingId: b.id })}
        />
      )}
      {screen.name === 'book' && (
        <BookScreen
          initial={editing}
          onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
          onCancel={() => setScreen({ name: 'home' })}
        />
      )}
    </div>
  );
}
