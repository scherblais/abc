// In a real app, this would just be `new Date()`.
// For the seeded demo we pin "now" to match the mock data so the dashboard
// always reads as fresh — today, tomorrow, this month so far, etc.
export const useNow = (): Date => new Date('2026-05-05T09:00:00');
