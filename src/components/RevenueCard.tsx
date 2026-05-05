import { useMemo } from 'react';
import { invoices } from '../data/mock';
import { useNow } from '../lib/now';
import { buildRevenueComparison } from '../lib/revenue';
import { compactCurrency, currency } from '../lib/format';

const W = 320;
const H = 96;
const PADDING_X = 4;
const PADDING_Y = 6;

function buildPath(
  series: { day: number; total: number }[],
  maxValue: number,
  daysWindow: number,
) {
  if (series.length === 0 || maxValue === 0) return '';
  const innerW = W - PADDING_X * 2;
  const innerH = H - PADDING_Y * 2;
  const x = (day: number) =>
    PADDING_X + (innerW * (day - 1)) / Math.max(daysWindow - 1, 1);
  const y = (v: number) => PADDING_Y + innerH - (innerH * v) / maxValue;

  const pts = series.map((p) => `${x(p.day).toFixed(2)},${y(p.total).toFixed(2)}`);
  return `M ${pts.join(' L ')}`;
}

function buildArea(
  series: { day: number; total: number }[],
  maxValue: number,
  daysWindow: number,
) {
  if (series.length === 0 || maxValue === 0) return '';
  const innerW = W - PADDING_X * 2;
  const innerH = H - PADDING_Y * 2;
  const x = (day: number) =>
    PADDING_X + (innerW * (day - 1)) / Math.max(daysWindow - 1, 1);
  const y = (v: number) => PADDING_Y + innerH - (innerH * v) / maxValue;

  const baseline = PADDING_Y + innerH;
  const first = series[0];
  const last = series[series.length - 1];
  const middle = series.map((p) => `L ${x(p.day).toFixed(2)} ${y(p.total).toFixed(2)}`).join(' ');
  return `M ${x(first.day).toFixed(2)} ${baseline} ${middle} L ${x(last.day).toFixed(2)} ${baseline} Z`;
}

export function RevenueCard() {
  const now = useNow();
  const data = useMemo(() => buildRevenueComparison(invoices, now), [now]);

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long' });
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthLabel = lastMonth.toLocaleDateString('en-US', { month: 'long' });

  const isUp = data.pctChangeVsLastMonthToDate >= 0;
  const pctText = `${isUp ? '+' : ''}${data.pctChangeVsLastMonthToDate.toFixed(1)}%`;

  const maxValue = Math.max(
    1,
    data.thisMonthDaily.at(-1)?.total ?? 0,
    data.lastMonthDaily.at(-1)?.total ?? 0,
  );

  // Width of x-axis: days in *this month* (so the May line ends mid-chart on May 5,
  // with April fully drawn out underneath through its matching slice).
  const daysWindow = Math.max(data.comparisonDay, 2);

  const thisMonthLine = buildPath(data.thisMonthDaily, maxValue, daysWindow);
  const thisMonthArea = buildArea(data.thisMonthDaily, maxValue, daysWindow);
  const lastMonthLine = buildPath(data.lastMonthDaily, maxValue, daysWindow);

  const last = data.thisMonthDaily.at(-1);
  const innerW = W - PADDING_X * 2;
  const innerH = H - PADDING_Y * 2;
  const lastX = last
    ? PADDING_X + (innerW * (last.day - 1)) / Math.max(daysWindow - 1, 1)
    : 0;
  const lastY = last
    ? PADDING_Y + innerH - (innerH * last.total) / maxValue
    : 0;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
            Revenue · {monthLabel} so far
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-[28px] font-semibold leading-none tracking-tight">
              {currency(data.thisMonthTotal)}
            </p>
            <span
              className={
                'pill ring-1 ring-inset ' +
                (isUp
                  ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20'
                  : 'bg-rose-500/15 text-rose-300 ring-rose-400/20')
              }
            >
              <span aria-hidden>{isUp ? '▲' : '▼'}</span>
              {pctText}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-white/50">
            vs {currency(data.lastMonthToDateTotal)} by {lastMonthLabel} {data.comparisonDay}
            {' · '}
            <span className="text-white/35">
              {lastMonthLabel} total {compactCurrency(data.lastMonthFullTotal)}
            </span>
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 h-24 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`This month cumulative revenue ${currency(
          data.thisMonthTotal,
        )} versus last month same window ${currency(data.lastMonthToDateTotal)}`}
      >
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Last month overlay */}
        {lastMonthLine && (
          <path
            d={lastMonthLine}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* This month area + line */}
        {thisMonthArea && <path d={thisMonthArea} fill="url(#revFill)" />}
        {thisMonthLine && (
          <path
            d={thisMonthLine}
            fill="none"
            stroke="#a594ff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {last && (
          <>
            <circle cx={lastX} cy={lastY} r={5} fill="#0b0d12" />
            <circle cx={lastX} cy={lastY} r={3.2} fill="#a594ff" />
          </>
        )}
      </svg>

      <div className="mt-2 flex items-center gap-4 text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full bg-accent-soft" />
          {monthLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-[2px] w-4 rounded-full"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, rgba(255,255,255,0.5) 0 3px, transparent 3px 6px)',
            }}
          />
          {lastMonthLabel} (same window)
        </span>
      </div>
    </div>
  );
}
