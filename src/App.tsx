import { useEffect, useMemo, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { BookScreen } from './screens/BookScreen';
import { AdminScreen } from './screens/AdminScreen';
import { ServiceEditScreen } from './screens/ServiceEditScreen';
import { RevenueScreen } from './screens/RevenueScreen';
import { ClientsScreen } from './screens/ClientsScreen';
import { InvoicesScreen } from './screens/InvoicesScreen';
import { InvoiceEditScreen } from './screens/InvoiceEditScreen';
import { InvoicePrintScreen } from './screens/InvoicePrintScreen';
import { ExpensesScreen } from './screens/ExpensesScreen';
import { ExpenseEditScreen } from './screens/ExpenseEditScreen';
import { TasksScreen } from './screens/TasksScreen';
import { TaskEditScreen } from './screens/TaskEditScreen';
import { SignInScreen } from './screens/SignInScreen';
import { NavProvider, type TabId } from './lib/nav-context';
import type {
  Agent,
  Booking,
  Company,
  DraftBooking,
  DraftExpense,
  DraftService,
  DraftTask,
  Expense,
  Invoice,
  Service,
  Settings,
  Task,
} from './types';
import {
  DEFAULT_SETTINGS,
  loadAgents,
  loadBookings,
  loadCompanies,
  loadExpenses,
  loadInvoices,
  loadServices,
  loadSettings,
  loadTasks,
  newId,
  saveAgents,
  saveBookings,
  saveCompanies,
  saveExpenses,
  saveInvoices,
  saveServices,
  saveSettings,
  saveTasks,
} from './lib/storage';
import { DEFAULT_CATALOG, catalogFor, sumServices } from './lib/catalog';
import { geocode } from './lib/geocode';
import { googleGeocode } from './lib/google';
import { GOOGLE_API_KEY } from './config';
import {
  GST_RATE,
  QST_RATE,
  bookingToInvoiceIndex,
  nextInvoiceNumber,
} from './lib/invoices';
import { useAuth } from './lib/auth';
import { useDataDoc, useDataList } from './lib/sync';
import { migrateLocalToCloud } from './lib/migrate';
import { getFirebaseDb, signOut } from './lib/firebase';
import { onSnapshotsInSync } from 'firebase/firestore';
import { markWarm, setInSync, setOnline } from './lib/sync-status';
import { UidProvider } from './lib/uid-context';

type Screen =
  | { name: 'home' }
  | { name: 'book'; editingId?: string; fromTaskId?: string }
  | { name: 'admin' }
  | { name: 'service-edit'; serviceId?: string }
  | { name: 'clients' }
  | { name: 'revenue' }
  | { name: 'invoices' }
  | { name: 'invoice-edit'; invoiceId?: string; preselectBookingId?: string }
  | { name: 'invoice-print'; invoiceId: string }
  | { name: 'expenses' }
  | { name: 'expense-edit'; expenseId?: string }
  | { name: 'tasks' }
  | { name: 'task-edit'; taskId?: string };

/** Tab-scoped screen persistence. Survives F5 / pull-to-refresh; resets
 *  when the tab is closed. Validates that the persisted shape still
 *  matches the union before restoring, so a stale localStorage entry
 *  can't crash the app. */
const SCREEN_KEY = 'lensbook.screen.v1';

const SCREEN_NAMES = new Set([
  'home',
  'book',
  'admin',
  'service-edit',
  'clients',
  'revenue',
  'invoices',
  'invoice-edit',
  'invoice-print',
  'expenses',
  'expense-edit',
  'tasks',
  'task-edit',
]);

function loadScreen(): Screen {
  try {
    const raw = sessionStorage.getItem(SCREEN_KEY);
    if (!raw) return { name: 'home' };
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.name === 'string' &&
      SCREEN_NAMES.has(parsed.name)
    ) {
      return parsed as Screen;
    }
  } catch {
    // ignore
  }
  return { name: 'home' };
}

function usePersistedScreen(): [Screen, (s: Screen) => void] {
  const [screen, setScreen] = useState<Screen>(() => loadScreen());
  useEffect(() => {
    try {
      sessionStorage.setItem(SCREEN_KEY, JSON.stringify(screen));
    } catch {
      // ignore quota / private-mode errors
    }
  }, [screen]);
  return [screen, setScreen];
}

export default function App() {
  const auth = useAuth();

  // Firebase not configured: run as a local-only app, exactly as before.
  if (auth.status === 'disabled')
    return (
      <UidProvider uid={null}>
        <AppShell uid={null} />
      </UidProvider>
    );

  // Resolving the persisted sign-in.
  if (auth.status === 'loading') return <LoadingScreen />;

  if (auth.status === 'signed-out') return <SignInScreen />;

  return <AuthenticatedApp uid={auth.user.uid} email={auth.user.email} />;
}

function AuthenticatedApp({
  uid,
  email,
}: {
  uid: string;
  email: string | null;
}) {
  // Kick off migration in the background. The Firestore listener will pick up
  // migrated rows on the next snapshot, so we don't gate the UI on it.
  useEffect(() => {
    migrateLocalToCloud(uid).catch((err) => {
      console.error('Migration failed:', err);
    });
  }, [uid]);

  // Wire global sync-status signals exactly once per authenticated session.
  // onSnapshotsInSync fires when every active listener is caught up; that
  // event also tells us we've completed the warm-up after sign-in. The
  // online / offline window events flip the indicator's red state.
  useEffect(() => {
    const unsub = onSnapshotsInSync(getFirebaseDb(), () => {
      markWarm();
      setInSync(true);
    });
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setOnline(navigator.onLine !== false);
    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <UidProvider uid={uid}>
      <AppShell uid={uid} accountEmail={email} />
    </UidProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-full min-h-full items-center justify-center px-6">
      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
        Loading…
      </p>
    </div>
  );
}

function AppShell({
  uid,
  accountEmail,
}: {
  uid: string | null;
  accountEmail?: string | null;
}) {
  const [bookings, setBookings] = useDataList<Booking>(
    uid,
    'bookings',
    loadBookings,
    saveBookings,
  );
  const [services, setServices] = useDataList<Service>(
    uid,
    'services',
    () => loadServices() ?? DEFAULT_CATALOG,
    saveServices,
  );
  const [companies, setCompanies] = useDataList<Company>(
    uid,
    'companies',
    loadCompanies,
    saveCompanies,
  );
  const [agents, setAgents] = useDataList<Agent>(
    uid,
    'agents',
    loadAgents,
    saveAgents,
  );
  const [invoices, setInvoices] = useDataList<Invoice>(
    uid,
    'invoices',
    loadInvoices,
    saveInvoices,
  );
  const [expenses, setExpenses] = useDataList<Expense>(
    uid,
    'expenses',
    loadExpenses,
    saveExpenses,
  );
  const [tasks, setTasks] = useDataList<Task>(
    uid,
    'tasks',
    loadTasks,
    saveTasks,
  );
  const [settings, setSettings] = useDataDoc<Settings>(
    uid,
    'meta/settings',
    loadSettings,
    saveSettings,
  );
  const [screen, setScreen] = usePersistedScreen();

  // One-shot migration: invoices created before tax was made automatic have
  // gstRate/qstRate snapshotted as 0. Bring them up to current rates so they
  // actually charge tax. New invoices already snapshot the correct rates.
  useEffect(() => {
    setInvoices((prev) => {
      let changed = false;
      const next = prev.map((inv) => {
        if (inv.gstRate === 0 && inv.qstRate === 0) {
          changed = true;
          return { ...inv, gstRate: GST_RATE, qstRate: QST_RATE };
        }
        return inv;
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (settings.startingAddress && !settings.startingCoords) {
      let cancelled = false;
      (async () => {
        const apiKey = GOOGLE_API_KEY.trim();
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

  // bookingId → invoiceId, rebuilt only when invoices change.
  const bookingInvoiceIndex = useMemo(
    () => bookingToInvoiceIndex(invoices),
    [invoices],
  );

  const unpaidInvoiceCount = useMemo(
    () => invoices.filter((i) => i.status === 'sent').length,
    [invoices],
  );

  const editingBooking =
    screen.name === 'book' && screen.editingId
      ? bookings.find((b) => b.id === screen.editingId)
      : undefined;

  const editingService =
    screen.name === 'service-edit' && screen.serviceId
      ? services.find((s) => s.id === screen.serviceId)
      : undefined;

  const editingInvoice =
    screen.name === 'invoice-edit' && screen.invoiceId
      ? invoices.find((i) => i.id === screen.invoiceId)
      : undefined;

  const printInvoice =
    screen.name === 'invoice-print'
      ? invoices.find((i) => i.id === screen.invoiceId)
      : undefined;

  const editingExpense =
    screen.name === 'expense-edit' && screen.expenseId
      ? expenses.find((e) => e.id === screen.expenseId)
      : undefined;

  const editingTask =
    screen.name === 'task-edit' && screen.taskId
      ? tasks.find((t) => t.id === screen.taskId)
      : undefined;

  const fromTask =
    screen.name === 'book' && screen.fromTaskId
      ? tasks.find((t) => t.id === screen.fromTaskId)
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
      // Task → Shoot: drop the task that spawned this booking. The user
      // explicitly said it should "convert", so the task disappears rather
      // than lingering as a completed item.
      if (screen.name === 'book' && screen.fromTaskId) {
        const taskId = screen.fromTaskId;
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    }
    setScreen({ name: 'home' });
  };

  const handleDeleteBooking = () => {
    if (!editingBooking) return;
    setBookings((prev) => prev.filter((b) => b.id !== editingBooking.id));
    // Drop the booking from any invoices referencing it.
    setInvoices((prev) =>
      prev.map((i) =>
        i.bookingIds.includes(editingBooking.id)
          ? { ...i, bookingIds: i.bookingIds.filter((x) => x !== editingBooking.id) }
          : i,
      ),
    );
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
    // When a brokerage's pricing changes, recompute every booking attached
    // to that brokerage that's still in flight (no invoice yet, or only on
    // a draft invoice). Bookings on sent / paid / void invoices stay locked
    // at whatever was billed.
    if ('pricing' in patch) {
      const synthetic: Company = {
        id,
        name: '',
        createdAt: '',
        pricing: patch.pricing,
      };
      const newCatalog = catalogFor(services, synthetic);
      setBookings((prev) => {
        let changed = false;
        const next = prev.map((b) => {
          if (b.companyId !== id) return b;
          const invId = bookingInvoiceIndex.get(b.id);
          if (invId) {
            const inv = invoices.find((i) => i.id === invId);
            if (inv && inv.status !== 'draft') return b;
          }
          const { price } = sumServices(b.services, newCatalog);
          if (b.price === price) return b;
          changed = true;
          return { ...b, price };
        });
        return changed ? next : prev;
      });
    }
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
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

  // --- Invoices ---

  const addBookingToInvoice = (invoiceId: string, bookingId: string) => {
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId && !i.bookingIds.includes(bookingId)
          ? { ...i, bookingIds: [...i.bookingIds, bookingId] }
          : i,
      ),
    );
  };

  const removeBookingFromInvoice = (bookingId: string) => {
    setInvoices((prev) =>
      prev.map((i) =>
        i.bookingIds.includes(bookingId)
          ? { ...i, bookingIds: i.bookingIds.filter((x) => x !== bookingId) }
          : i,
      ),
    );
  };

  const createInvoiceForBooking = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || !booking.companyId) return;
    const now = new Date();
    const next: Invoice = {
      id: newId(),
      number: nextInvoiceNumber(invoices, now.getFullYear()),
      companyId: booking.companyId,
      agentId: booking.agentId,
      bookingIds: [bookingId],
      billTo: { name: '' },
      business: {
        name: settings.businessName ?? '',
        address: settings.businessAddress,
        phone: settings.businessPhone,
        email: settings.businessEmail,
        gstNumber: settings.gstNumber,
        qstNumber: settings.qstNumber,
      },
      gstRate: GST_RATE,
      qstRate: QST_RATE,
      status: 'draft',
      notes: '',
      createdAt: now.toISOString(),
    };
    setInvoices((prev) => [...prev, next]);
    setScreen({ name: 'invoice-edit', invoiceId: next.id });
  };

  const saveInvoice = (invoice: Invoice) => {
    if (!invoice.id) {
      // Brand-new invoice from the InvoicesScreen "+ New" path.
      const final: Invoice = {
        ...invoice,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      setInvoices((prev) => [...prev, final]);
    } else {
      setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? invoice : i)));
    }
    setScreen({ name: 'invoices' });
  };

  const deleteInvoice = () => {
    if (!editingInvoice || editingInvoice.status !== 'draft') return;
    setInvoices((prev) => prev.filter((i) => i.id !== editingInvoice.id));
    setScreen({ name: 'invoices' });
  };

  const voidInvoice = () => {
    if (!editingInvoice) return;
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === editingInvoice.id ? { ...i, status: 'void' as const } : i,
      ),
    );
    setScreen({ name: 'invoices' });
  };

  // --- Expenses ---

  const saveExpense = (draft: DraftExpense) => {
    if (editingExpense) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editingExpense.id ? { ...editingExpense, ...draft } : e,
        ),
      );
    } else {
      const next: Expense = {
        ...draft,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      setExpenses((prev) => [...prev, next]);
    }
    setScreen({ name: 'expenses' });
  };

  const deleteExpense = () => {
    if (!editingExpense) return;
    setExpenses((prev) => prev.filter((e) => e.id !== editingExpense.id));
    setScreen({ name: 'expenses' });
  };

  // --- Tasks ---

  const saveTask = (draft: DraftTask) => {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id ? { ...editingTask, ...draft } : t,
        ),
      );
    } else {
      const next: Task = {
        ...draft,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, next]);
    }
    setScreen({ name: 'tasks' });
  };

  const deleteTask = () => {
    if (!editingTask) return;
    setTasks((prev) => prev.filter((t) => t.id !== editingTask.id));
    setScreen({ name: 'tasks' });
  };

  const toggleTaskDone = (task: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
    );
  };

  const scheduleFromTask = (task: Task) => {
    setScreen({ name: 'book', fromTaskId: task.id });
  };

  // Print route renders outside the mobile-width wrapper so the invoice can
  // span the full page when printed to PDF.
  if (screen.name === 'invoice-print' && printInvoice) {
    return (
      <InvoicePrintScreen
        invoice={printInvoice}
        bookings={bookings}
        services={services}
        onBack={() =>
          setScreen({ name: 'invoice-edit', invoiceId: printInvoice.id })
        }
      />
    );
  }

  return (
    <NavProvider
      value={{
        current: activeTabFor(screen),
        navigate: (tab) => setScreen({ name: tab }),
        unpaidInvoices: unpaidInvoiceCount,
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-4">
      {screen.name === 'home' && (
        <HomeScreen
          bookings={bookings}
          catalog={services}
          companies={companies}
          agents={agents}
          onAdd={() => setScreen({ name: 'book' })}
          onOpen={(b) => setScreen({ name: 'book', editingId: b.id })}
          onOpenRevenue={() => setScreen({ name: 'revenue' })}
        />
      )}
      {screen.name === 'revenue' && (
        <RevenueScreen
          bookings={bookings}
          invoices={invoices}
          companies={companies}
          expenses={expenses}
          bookingInvoiceIndex={bookingInvoiceIndex}
          onBack={() => setScreen({ name: 'home' })}
          onOpenExpenses={() => setScreen({ name: 'expenses' })}
        />
      )}
      {screen.name === 'book' && (
        <BookScreen
          initial={editingBooking}
          prefill={
            fromTask
              ? {
                  address: fromTask.address ?? '',
                  companyId: fromTask.companyId,
                  agentId: fromTask.agentId,
                  notes: fromTask.notes,
                }
              : undefined
          }
          catalog={services}
          companies={companies}
          agents={agents}
          invoices={invoices}
          bookingInvoiceIndex={bookingInvoiceIndex}
          settings={settings}
          onSave={handleSaveBooking}
          onDelete={editingBooking ? handleDeleteBooking : undefined}
          onCancel={() => setScreen({ name: 'home' })}
          onManageCatalog={() => setScreen({ name: 'admin' })}
          onCreateCompany={createCompany}
          onCreateAgent={createAgent}
          onAddBookingToInvoice={addBookingToInvoice}
          onRemoveBookingFromInvoice={removeBookingFromInvoice}
          onCreateInvoiceForBooking={createInvoiceForBooking}
          onOpenInvoice={(id) => setScreen({ name: 'invoice-edit', invoiceId: id })}
        />
      )}
      {screen.name === 'admin' && (
        <AdminScreen
          services={services}
          settings={settings}
          accountEmail={accountEmail ?? null}
          onSaveSettings={setSettings}
          onSignOut={accountEmail !== undefined ? () => signOut() : undefined}
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
          catalog={services}
          onBack={() => setScreen({ name: 'admin' })}
          onCreateCompany={createCompany}
          onUpdateCompany={updateCompany}
          onDeleteCompany={deleteCompany}
          onCreateAgent={createAgent}
          onUpdateAgent={updateAgent}
          onDeleteAgent={deleteAgent}
        />
      )}
      {screen.name === 'invoices' && (
        <InvoicesScreen
          invoices={invoices}
          bookings={bookings}
          companies={companies}
          onBack={() => setScreen({ name: 'home' })}
          onNew={() => setScreen({ name: 'invoice-edit' })}
          onOpen={(id) => setScreen({ name: 'invoice-edit', invoiceId: id })}
        />
      )}
      {screen.name === 'invoice-edit' && (
        <InvoiceEditScreen
          initial={editingInvoice}
          invoices={invoices}
          bookings={bookings}
          companies={companies}
          agents={agents}
          settings={settings}
          bookingIndex={bookingInvoiceIndex}
          preselectBookingId={
            screen.name === 'invoice-edit' ? screen.preselectBookingId : undefined
          }
          onSave={saveInvoice}
          onDelete={
            editingInvoice && editingInvoice.status === 'draft'
              ? deleteInvoice
              : undefined
          }
          onVoid={
            editingInvoice && editingInvoice.status !== 'draft'
              ? voidInvoice
              : undefined
          }
          onCancel={() => setScreen({ name: 'invoices' })}
          onOpenPrint={(id) => setScreen({ name: 'invoice-print', invoiceId: id })}
          onCreateCompany={createCompany}
          onCreateAgent={createAgent}
        />
      )}
      {screen.name === 'expenses' && (
        <ExpensesScreen
          expenses={expenses}
          onBack={() => setScreen({ name: 'home' })}
          onAdd={() => setScreen({ name: 'expense-edit' })}
          onEdit={(e) => setScreen({ name: 'expense-edit', expenseId: e.id })}
        />
      )}
      {screen.name === 'expense-edit' && (
        <ExpenseEditScreen
          initial={editingExpense}
          onSave={saveExpense}
          onDelete={editingExpense ? deleteExpense : undefined}
          onCancel={() => setScreen({ name: 'expenses' })}
        />
      )}
      {screen.name === 'tasks' && (
        <TasksScreen
          tasks={tasks}
          companies={companies}
          agents={agents}
          onBack={() => setScreen({ name: 'home' })}
          onAdd={() => setScreen({ name: 'task-edit' })}
          onEdit={(t) => setScreen({ name: 'task-edit', taskId: t.id })}
          onToggleDone={toggleTaskDone}
        />
      )}
      {screen.name === 'task-edit' && (
        <TaskEditScreen
          initial={editingTask}
          companies={companies}
          agents={agents}
          onSave={saveTask}
          onDelete={editingTask ? deleteTask : undefined}
          onSchedule={
            editingTask ? () => scheduleFromTask(editingTask) : undefined
          }
          onCancel={() => setScreen({ name: 'tasks' })}
          onCreateCompany={createCompany}
          onCreateAgent={createAgent}
        />
      )}
      </div>
    </NavProvider>
  );
}

/**
 * Map the discriminated screen union onto a tab id. View screens light up
 * their tab; edit-form screens (book, service-edit, invoice-edit,
 * expense-edit) return null so the bottom tab bar hides — the form's
 * Save / Cancel in the header are the only nav while editing.
 * invoice-print is its own full-bleed route with no tabs either.
 */
function activeTabFor(screen: Screen): TabId | null {
  switch (screen.name) {
    case 'home':
      return 'home';
    case 'revenue':
      return 'revenue';
    case 'expenses':
      return 'expenses';
    case 'invoices':
      return 'invoices';
    case 'tasks':
      return 'tasks';
    case 'admin':
    case 'clients':
      return 'admin';
    case 'book':
    case 'service-edit':
    case 'invoice-edit':
    case 'expense-edit':
    case 'invoice-print':
    case 'task-edit':
      return null;
  }
}

// Re-export so other modules that imported it from this file still work.
export { DEFAULT_SETTINGS };
