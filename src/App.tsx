import { Header } from './components/Header';
import { RevenueCard } from './components/RevenueCard';
import { UpcomingAppointments } from './components/UpcomingAppointments';
import { NeedsBooking } from './components/NeedsBooking';

export default function App() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-4">
      <Header />
      <main className="safe-bottom flex-1 pb-8">
        <div className="mb-6">
          <RevenueCard />
        </div>
        <UpcomingAppointments />
        <NeedsBooking />
      </main>
    </div>
  );
}
