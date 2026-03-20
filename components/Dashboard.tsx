import React, { useEffect, useMemo, useState } from 'react';
import { Project, Client, Transaction, TransactionType, ViewType, TeamMember, Card, FinancialPocket, PocketType, Lead, LeadStatus, TeamProjectPayment, Package, ClientFeedback, ClientStatus, NavigationAction, User, ProjectStatusConfig, Profile, PaymentStatus } from '../types';
import StatCard from './StatCard';
import { listCalendarEventsInRange } from '../services/calendarEvents';
import StatCardModal from './StatCardModal';
import Modal from './Modal';
import { NAV_ITEMS, DollarSignIcon, FolderKanbanIcon, UsersIcon, BriefcaseIcon, ChevronRightIcon, CreditCardIcon, CalendarIcon, ClipboardListIcon, LightbulbIcon, TargetIcon, StarIcon, CameraIcon, FileTextIcon, TrendingUpIcon, AlertCircleIcon, MapPinIcon, ClockIcon } from '../constants';

// Helper Functions
const formatCurrency = (amount: number, minimumFractionDigits = 0) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits }).format(amount);
};

const getStatusClass = (status: string, config: ProjectStatusConfig[]) => {
    const statusConfig = config.find(c => c.name === status);
    const color = statusConfig ? statusConfig.color : '#64748b'; // slate-500
    // Note: Tailwind purge might not see this. Inline styles are safer for dynamic colors.
    // This is a simplified approach.
    const colorMap: { [key: string]: string } = {
        '#10b981': 'bg-brand-success/20 text-brand-success',
        '#3b82f6': 'bg-blue-500/20 text-blue-400',
        '#8b5cf6': 'bg-purple-500/20 text-purple-400',
        '#f97316': 'bg-orange-500/20 text-orange-400',
        '#06b6d4': 'bg-teal-500/20 text-teal-400',
        '#eab308': 'bg-yellow-500/20 text-yellow-400',
        '#6366f1': 'bg-gray-500/20 text-gray-300',
        '#ef4444': 'bg-brand-danger/20 text-brand-danger'
    };
    return colorMap[color] || 'bg-gray-500/20 text-gray-400';
};


// --- Sub-components for Dashboard ---

const QuickLinksWidget: React.FC<{ handleNavigation: (view: ViewType) => void; currentUser: User | null; }> = ({ handleNavigation, currentUser }) => {
    const quickLinks = useMemo(() => {
        const allLinks = NAV_ITEMS.filter(item => item.view !== ViewType.DASHBOARD);
        if (!currentUser || currentUser.role === 'Admin') {
            return allLinks;
        }
        const memberPermissions = new Set(currentUser.permissions || []);
        return allLinks.filter(link => memberPermissions.has(link.view));
    }, [currentUser]);


    return (
        <div className="bg-brand-surface p-4 md:p-6 rounded-2xl shadow-lg border border-brand-border">
            <h3 className="font-bold text-base md:text-lg text-gradient mb-3 md:mb-4">Akses Cepat</h3>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
                {quickLinks.map(link => (
                    <button
                        key={link.view}
                        onClick={() => handleNavigation(link.view)}
                        className="flex flex-col items-center justify-center p-3 md:p-4 bg-brand-bg rounded-xl text-center hover:bg-brand-input hover:shadow-md transition-all duration-200 active:scale-95"
                        aria-label={`Buka ${link.label}`}
                    >
                        <link.icon className="w-6 h-6 md:w-8 md:h-8 text-brand-accent mb-1.5 md:mb-2" />
                        <span className="text-[10px] md:text-xs font-semibold text-brand-text-primary">{link.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const IncomeChartWidget: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const [chartView, setChartView] = useState<'monthly' | 'yearly'>('monthly');

    const chartData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        if (chartView === 'yearly') {
            const totals: { [year: string]: { income: number, expense: number } } = {};
            transactions.forEach(t => {
                const year = new Date(t.date).getFullYear().toString();
                if (!totals[year]) totals[year] = { income: 0, expense: 0 };
                if (t.type === TransactionType.INCOME) totals[year].income += t.amount;
                else totals[year].expense += t.amount;
            });
            return Object.entries(totals)
                .sort(([yearA], [yearB]) => parseInt(yearA) - parseInt(yearB))
                .map(([year, values]) => ({ name: year, ...values }));
        } else {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const data = months.map(month => ({ name: month, income: 0, expense: 0 }));
            transactions.forEach(t => {
                const d = new Date(t.date);
                if (d.getFullYear() === currentYear) {
                    const m = d.getMonth();
                    if (t.type === TransactionType.INCOME) data[m].income += t.amount;
                    else data[m].expense += t.amount;
                }
            });
            return data;
        }
    }, [transactions, chartView]);

    const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg h-full border border-brand-border">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg text-gradient">Analisis Keuangan</h3>
                    <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-brand-accent"></div>
                            <span className="text-[10px] text-brand-text-secondary uppercase font-bold tracking-tight">Pemasukan</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                            <span className="text-[10px] text-brand-text-secondary uppercase font-bold tracking-tight">Pengeluaran</span>
                        </div>
                    </div>
                </div>
                <div className="p-1 bg-brand-bg rounded-lg flex items-center h-fit">
                    {(['monthly', 'yearly'] as const).map(view => (
                        <button
                            key={view}
                            onClick={() => setChartView(view)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${chartView === view ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text-light'}`}
                        >
                            {view === 'monthly' ? 'Bulanan' : 'Tahunan'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-56 flex justify-between items-end gap-3 mt-4">
                {chartData.map(item => (
                    <div key={item.name} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20">
                            <div className="bg-brand-surface border border-brand-border shadow-2xl p-2 rounded-lg text-[10px] whitespace-nowrap">
                                <p className="text-brand-success font-bold">In: {formatCurrency(item.income, 0)}</p>
                                <p className="text-rose-400 font-bold">Out: {formatCurrency(item.expense, 0)}</p>
                            </div>
                            <div className="w-2 h-2 bg-brand-surface border-r border-b border-brand-border rotate-45 -mt-1"></div>
                        </div>
                        <div className="w-full flex items-end gap-1 h-full">
                            <div className="flex-1 bg-brand-accent/40 rounded-t-md group-hover:bg-brand-accent transition-all duration-300" style={{ height: `${(item.income / maxVal) * 100}%` }}></div>
                            <div className="flex-1 bg-rose-500/40 rounded-t-md group-hover:bg-rose-500 transition-all duration-300" style={{ height: `${(item.expense / maxVal) * 100}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-brand-text-secondary mt-3 uppercase tracking-tighter">{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const RecentTransactionsWidget: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gradient">Transaksi Terbaru</h3>
            <button className="text-brand-text-secondary hover:text-brand-text-light"><ChevronRightIcon className="w-6 h-6" /></button>
        </div>
        <div className="space-y-4">
            {transactions.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-bg flex-shrink-0 flex items-center justify-center">
                        <DollarSignIcon className={`w-5 h-5 ${t.type === TransactionType.INCOME ? 'text-brand-success' : 'text-brand-danger'}`} />
                    </div>
                    <div className="flex-grow overflow-hidden">
                        <p className="font-medium text-brand-text-light truncate text-sm">{t.description}</p>
                        <p className="text-xs text-brand-text-secondary">{new Date(t.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}</p>
                    </div>
                    <div className={`font-semibold text-sm ${t.type === TransactionType.INCOME ? 'text-brand-success' : 'text-brand-text-light'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount, 0)}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const CardWidget: React.FC<{ card: Card }> = ({ card }) => {
    const gradient = card.colorGradient || 'from-slate-700 to-slate-900';
    const isLight = gradient.includes('slate-100') || gradient.includes('slate-200') || gradient.includes('white');
    const textColor = isLight ? 'text-slate-800' : 'text-white';

    return (
        <div className={`p-4 rounded-xl ${textColor} shadow-md flex flex-col justify-between h-40 flex-1 min-w-64 bg-gradient-to-br ${gradient}`}>
            <div>
                <div className="flex justify-between items-center">
                    <p className="font-bold text-sm">{card.bankName}</p>
                    <p className="text-xs">{card.cardType}</p>
                </div>
            </div>
            <div>
                <p className="text-xl font-mono tracking-wider">**** {card.lastFourDigits}</p>
                <p className="text-2xl font-bold tracking-tight">{formatCurrency(card.balance)}</p>
            </div>
        </div>
    );
};

const MyCardsWidget: React.FC<{ cards: Card[], handleNavigation: (view: ViewType) => void }> = ({ cards, handleNavigation }) => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gradient flex items-center gap-2"><CreditCardIcon className="w-5 h-5" /> Kartu Saya</h3>
            <button onClick={() => handleNavigation(ViewType.FINANCE)} className="text-sm font-semibold text-brand-accent hover:underline">Kelola Kartu &rarr;</button>
        </div>
        <div className="flex flex-wrap gap-4">
            {cards.map(card => <CardWidget key={card.id} card={card} />)}
        </div>
    </div>
);

const weekdaysShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const eventTypeColors: Record<string, string> = {
    'Meeting Pengantin': '#3b82f6',
    'Survey Lokasi': '#22c55e',
    'Libur': '#94a3b8',
    'Workshop': '#a855f7',
    'Lainnya': '#eab308',
};

const getEventColor = (event: Project, profile: Profile) => {
    const type = event.projectType?.toLowerCase() || '';
    if (type.includes('wedding') || type.includes('pernikahan')) return '#ef4444'; // Merah
    if (type.includes('engagement') || type.includes('lamaran')) return '#f97316'; // Orange
    if (type.includes('meeting') || type.includes('internal')) return '#3b82f6'; // Biru
    
    const isInternalEvent = profile.eventTypes?.includes(event.projectType);
    if (isInternalEvent) return eventTypeColors[event.projectType] || '#6366f1';
    return profile.projectStatusConfig?.find(s => s.name === event.status)?.color || '#64748b';
};

/** Kalender bulan ringkas untuk Dashboard - menampilkan Acara Pernikahan & Acara Pernikahan internal */
const CalendarMonthWidget: React.FC<{
    projects: Project[];
    profile: Profile;
    handleNavigation: (view: ViewType, action?: NavigationAction) => void;
}> = ({ projects, profile, handleNavigation }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [internalEvents, setInternalEvents] = useState<Project[]>([]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const from = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
                const to = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
                const rows = await listCalendarEventsInRange(from, to);
                if (!isMounted) return;
                setInternalEvents(Array.isArray(rows) ? rows : []);
            } catch {
                setInternalEvents([]);
            }
        })();
        return () => { isMounted = false; };
    }, [currentDate]);

    const deadlineEvents = useMemo(() =>
        (projects || [])
            .filter(p => (p as { deadlineDate?: string }).deadlineDate)
            .map(p => ({
                ...p,
                id: `${p.id}-deadline`,
                projectName: `Deadline: ${p.projectName}`,
                date: (p as { deadlineDate?: string }).deadlineDate!,
            } as Project)),
        [projects]
    );

    const allEvents = useMemo(() => [...projects, ...internalEvents, ...deadlineEvents], [projects, internalEvents, deadlineEvents]);

    const { daysInMonth, eventsByDate } = useMemo(() => {
        const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const start = new Date(first);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(last);
        end.setDate(end.getDate() + (6 - end.getDay()));
        const days: Date[] = [];
        let d = new Date(start);
        while (d <= end) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        const byDate = new Map<string, Project[]>();
        allEvents.forEach(ev => {
            const key = new Date(ev.date).toDateString();
            if (!byDate.has(key)) byDate.set(key, []);
            byDate.get(key)!.push(ev);
        });
        return { daysInMonth: days, eventsByDate: byDate };
    }, [currentDate, allEvents]);

    const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1));
    const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1));

    return (
        <div className="bg-brand-surface p-4 md:p-6 rounded-2xl shadow-lg border border-brand-border">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gradient flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" /> Kalender
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-text-secondary" aria-label="Bulan sebelumnya">
                        <ChevronRightIcon className="w-5 h-5 rotate-180" />
                    </button>
                    <span className="text-sm font-semibold text-brand-text-light min-w-[140px] text-center">
                        {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-text-secondary" aria-label="Bulan berikutnya">
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleNavigation(ViewType.CALENDAR)} className="text-sm font-semibold text-brand-accent hover:underline ml-2">
                        Kalender Lengkap &rarr;
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 border border-brand-border rounded-xl overflow-hidden">
                {weekdaysShort.map(day => (
                    <div key={day} className="bg-brand-bg py-2 text-center text-xs font-semibold text-brand-text-secondary border-b border-r border-brand-border last:border-r-0">
                        {day}
                    </div>
                ))}
                {daysInMonth.map((day, i) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const events = eventsByDate.get(day.toDateString()) || [];
                    return (
                        <div
                            key={i}
                            className={`min-h-[64px] sm:min-h-[80px] p-1 border-b border-r border-brand-border last:border-r-0 ${i % 7 === 6 ? '' : ''} ${isCurrentMonth ? 'bg-brand-surface' : 'bg-brand-bg/50'}`}
                        >
                            <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${isCurrentMonth ? 'text-brand-text-light' : 'text-brand-text-secondary/50'} ${isToday ? 'bg-brand-accent text-white' : ''}`}>
                                {day.getDate()}
                            </span>
                            <div className="mt-0.5 space-y-0.5 overflow-hidden">
                                {events.slice(0, 2).map(ev => (
                                    <div
                                        key={ev.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (ev.clientId === 'INTERNAL') {
                                                handleNavigation(ViewType.CALENDAR);
                                            } else {
                                                handleNavigation(ViewType.PROJECTS, { type: 'VIEW_PROJECT_DETAILS', id: ev.id.replace(/-deadline$/, '') });
                                            }
                                        }}
                                        className="text-[10px] px-1 py-0.5 rounded text-white truncate cursor-pointer font-medium"
                                        style={{ backgroundColor: getEventColor(ev, profile) }}
                                    >
                                        {ev.projectName}
                                    </div>
                                ))}
                                {events.length > 2 && (
                                    <span className="text-[10px] text-brand-text-secondary">+{events.length - 2}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const UpcomingCalendarWidget: React.FC<{ projects: Project[], handleNavigation: (view: ViewType, action?: NavigationAction) => void }> = ({ projects, handleNavigation }) => {
    const upcoming = projects
        .filter(p => new Date(p.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gradient flex items-center gap-2">Acara Pernikahan Mendatang</h3>
                <button onClick={() => handleNavigation(ViewType.CALENDAR)} className="text-sm font-semibold text-brand-accent hover:underline">Lihat Semua &rarr;</button>
            </div>
            <div className="space-y-3">
                {upcoming.map(p => {
                    const daysAway = Math.ceil((new Date(p.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isToday = daysAway === 0;
                    const countdownText = isToday ? 'Hari Ini' : daysAway > 0 ? `${daysAway} Hari Lagi` : 'Selesai';

                    return (
                        <div key={p.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-brand-bg border border-transparent hover:border-brand-border cursor-pointer transition-all duration-200" onClick={() => handleNavigation(ViewType.PROJECTS, { type: 'VIEW_PROJECT_DETAILS', id: p.id })}>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent/20 to-brand-accent/5 flex-shrink-0 flex flex-col items-center justify-center border border-brand-accent/10">
                                <p className="text-[10px] font-bold text-brand-accent uppercase tracking-wider">{new Date(p.date).toLocaleString('default', { month: 'short' })}</p>
                                <p className="text-xl font-black text-brand-text-light">{new Date(p.date).getDate()}</p>
                            </div>
                            <div className="flex-grow overflow-hidden">
                                <p className="font-bold text-brand-text-light truncate text-sm group-hover:text-brand-accent transition-colors">{p.projectName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-semibold text-brand-text-secondary uppercase tracking-tight">{p.projectType}</span>
                                    {p.location && (
                                        <div className="flex items-center gap-1 text-[10px] text-brand-text-secondary truncate">
                                            <MapPinIcon className="w-3 h-3" />
                                            <span className="truncate">{p.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isToday ? 'bg-rose-500/20 text-rose-400' : 'bg-brand-accent/10 text-brand-accent'}`}>
                                    {countdownText}
                                </span>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusClass(p.status, [])} opacity-80`}>{p.status}</span>
                            </div>
                        </div>
                    );
                })}
                {upcoming.length === 0 && <p className="text-center text-sm text-brand-text-secondary py-8">Tidak ada Acara Pernikahan mendatang.</p>}
            </div>
        </div>
    );
}

const ProjectStatusWidget: React.FC<{ projects: Project[], projectStatusConfig: ProjectStatusConfig[], handleNavigation: (view: ViewType) => void }> = ({ projects, projectStatusConfig, handleNavigation }) => {
    const statusOrder = projectStatusConfig.map(s => s.name).filter(name => name !== 'Selesai' && name !== 'Dibatalkan');

    const statusCounts = useMemo(() => {
        return statusOrder.map(statusName => {
            const count = projects.filter(p => p.status === statusName).length;
            const config = projectStatusConfig.find(s => s.name === statusName);
            return {
                name: statusName,
                count: count,
                color: config ? config.color : '#64748b'
            };
        }).filter(s => s.count > 0);

    }, [projects, statusOrder, projectStatusConfig]);

    const total = statusCounts.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full flex flex-col">
            <h3 className="font-bold text-lg text-gradient mb-4">Progres Acara Pernikahan Pengantin Aktif</h3>
            <div className="space-y-3 flex-grow">
                {statusCounts.map(status => (
                    <div key={status.name} className="text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-brand-text-primary font-medium">{status.name}</span>
                            <span className="text-brand-text-secondary font-semibold">{status.count}</span>
                        </div>
                        <div className="w-full bg-brand-bg rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${total > 0 ? (status.count / total) * 100 : 0}%`, backgroundColor: status.color }}></div></div>
                    </div>
                ))}
            </div>
            <button onClick={() => handleNavigation(ViewType.PROJECTS)} className="mt-4 text-sm font-semibold text-brand-accent hover:underline self-start">Kelola Acara Pernikahan &rarr;</button>
        </div>
    );
};

const LeadsSummaryWidget: React.FC<{ leads: Lead[]; handleNavigation: (view: ViewType) => void }> = ({ leads, handleNavigation }) => {
    const newLeadsThisMonth = leads.filter(l => new Date(l.date).getMonth() === new Date().getMonth() && new Date(l.date).getFullYear() === new Date().getFullYear()).length;
    const convertedLeads = leads.filter(l => l.status === LeadStatus.CONVERTED).length;
    const conversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;

    const SmallStat: React.FC<{ icon: React.ReactNode; title: string; value: string; }> = ({ icon, title, value }) => (
        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-brand-bg flex items-center justify-center text-brand-accent">{icon}</div><div><p className="text-sm text-brand-text-secondary">{title}</p><p className="font-bold text-lg text-brand-text-light">{value}</p></div></div>
    );

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full flex flex-col justify-between">
            <h3 className="font-bold text-lg text-gradient mb-4">Ringkasan Calon Pengantin</h3>
            <div className="space-y-4 flex-grow">
                <SmallStat icon={<LightbulbIcon className="w-5 h-5" />} title="Calon Pengantin Baru Bulan Ini" value={newLeadsThisMonth.toString()} />
                <SmallStat icon={<TargetIcon className="w-5 h-5" />} title="Tingkat Konversi" value={`${conversionRate.toFixed(1)}%`} />
            </div>
            <button onClick={() => handleNavigation(ViewType["Calon Pengantin"])} className="mt-4 text-sm font-semibold text-brand-accent hover:underline self-start">Kelola Calon Pengantin &rarr;</button>
        </div>
    );
};

const ClientSatisfactionWidget: React.FC<{ feedback: ClientFeedback[]; handleNavigation: (view: ViewType) => void }> = ({ feedback, handleNavigation }) => {
    const totalFeedback = feedback.length;
    const avgRating = totalFeedback > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback : 0;
    const StarRatingDisplay = ({ rating }: { rating: number }) => (<div className="flex items-center">{[1, 2, 3, 4, 5].map(star => (<StarIcon key={star} className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} />))}</div>);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full flex flex-col justify-between">
            <div><h3 className="font-bold text-lg text-gradient mb-2">Kepuasan Pengantin</h3><div className="flex items-baseline gap-2"><p className="text-3xl font-bold text-brand-text-light">{avgRating.toFixed(1)}</p><p className="text-brand-text-secondary">/ 5.0</p></div><div className="my-3"><StarRatingDisplay rating={avgRating} /></div><p className="text-sm text-brand-text-secondary">Berdasarkan {totalFeedback} ulasan.</p></div>
            <button onClick={() => handleNavigation(ViewType.CLIENT_REPORTS)} className="mt-4 text-sm font-semibold text-brand-accent hover:underline self-start">Lihat Laporan &rarr;</button>
        </div>
    );
};

const BookingTrendWidget: React.FC<{ projects: Project[] }> = ({ projects }) => {
    const monthlyBookings = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const data = months.map(month => ({ name: month, count: 0 }));

        projects.forEach(p => {
            const d = new Date(p.date);
            if (d.getFullYear() === currentYear) {
                data[d.getMonth()].count += 1;
            }
        });
        return data;
    }, [projects]);

    const maxCount = Math.max(...monthlyBookings.map(d => d.count), 1);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
            <h3 className="font-bold text-lg text-gradient mb-6">Tren Booking (Wedding Date)</h3>
            <div className="h-44 flex justify-between items-end gap-1">
                {monthlyBookings.map(item => {
                    const height = (item.count / maxCount) * 100;
                    return (
                        <div key={item.name} className="flex-1 flex flex-col items-center group relative">
                            <div className="absolute -top-8 bg-brand-accent text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{item.count} Wedding</div>
                            <div className="w-full bg-brand-accent/20 rounded-t-lg group-hover:bg-brand-accent transition-colors" style={{ height: `${Math.max(height, 5)}%` }}></div>
                            <span className="text-[10px] text-brand-text-secondary mt-2">{item.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const PackageDistributionWidget: React.FC<{ projects: Project[] }> = ({ projects }) => {
    const distribution = useMemo(() => {
        const counts: Record<string, number> = {};
        projects.forEach(p => {
            counts[p.packageName] = (counts[p.packageName] || 0) + 1;
        });
        const total = projects.length || 1;
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => ({ name, count, percentage: (count / total) * 100 }));
    }, [projects]);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
            <h3 className="font-bold text-lg text-gradient mb-4">Distribusi Paket</h3>
            <div className="space-y-4">
                {distribution.slice(0, 5).map((pkg, idx) => (
                    <div key={pkg.name}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-brand-text-primary font-medium truncate">{pkg.name}</span>
                            <span className="text-brand-text-secondary">{pkg.count} ({pkg.percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-brand-bg rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${idx === 0 ? 'bg-brand-accent' : 'bg-brand-accent/40'}`} 
                                style={{ width: `${pkg.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ConversionFunnelWidget: React.FC<{ leads: Lead[] }> = ({ leads }) => {
    const total = leads.length || 1;
    const stats = [
        { label: 'Total Leads', count: leads.length, color: 'bg-blue-500' },
        { label: 'Diskusi', count: leads.filter(l => l.status === LeadStatus.DISCUSSION || l.status === LeadStatus.CONVERTED).length, color: 'bg-indigo-500' },
        { label: 'Converted', count: leads.filter(l => l.status === LeadStatus.CONVERTED).length, color: 'bg-green-500' },
    ];

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
            <h3 className="font-bold text-lg text-gradient mb-6">Funnel Konversi</h3>
            <div className="flex flex-col items-center space-y-2">
                {stats.map((step, i) => {
                    const width = (step.count / total) * 100;
                    return (
                        <div key={step.label} className="w-full flex flex-col items-center">
                            <div 
                                className={`${step.color} h-10 flex items-center justify-center text-white text-xs font-bold rounded-lg transition-all duration-500`}
                                style={{ width: `${Math.max(width, 30)}%`, opacity: 1 - (i * 0.15) }}
                            >
                                {step.label}: {step.count}
                            </div>
                            {i < stats.length - 1 && <div className="w-px h-2 bg-brand-border"></div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const LeadSourceWidget: React.FC<{ leads: Lead[] }> = ({ leads }) => {
    const sourceData = useMemo(() => {
        const counts: Record<string, number> = {};
        leads.forEach(l => {
            counts[l.contactChannel] = (counts[l.contactChannel] || 0) + 1;
        });
        const total = leads.length || 1;
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => ({ name, count, percentage: (count / total) * 100 }));
    }, [leads]);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
            <h3 className="font-bold text-lg text-gradient mb-4">Sumber Calon Pengantin</h3>
            <div className="grid grid-cols-1 gap-4">
                {sourceData.map((source, idx) => (
                    <div key={source.name} className="flex items-center gap-3">
                        <div className="flex-grow">
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-brand-text-primary font-bold uppercase tracking-tight">{source.name}</span>
                                <span className="text-brand-text-secondary font-bold">{source.count}</span>
                            </div>
                            <div className="w-full bg-brand-bg rounded-full h-2 overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{ 
                                        width: `${source.percentage}%`,
                                        backgroundColor: `hsl(${idx * 40 + 200}, 70%, 60%)`
                                    }}
                                ></div>
                            </div>
                        </div>
                        <span className="text-xs font-black text-brand-text-light w-10 text-right">{source.percentage.toFixed(0)}%</span>
                    </div>
                ))}
                {leads.length === 0 && <p className="text-center text-sm text-brand-text-secondary py-8">Belum ada data calon pengantin.</p>}
            </div>
        </div>
    );
};

const BusinessHealthWidget: React.FC<{ projects: Project[], transactions: Transaction[] }> = ({ projects, transactions }) => {
    const stats = useMemo(() => {
        const totalRevenue = transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
        const margin = totalRevenue > 0 ? ((totalRevenue - totalExpense) / totalRevenue) * 100 : 0;
        
        const completed = projects.filter(p => p.status === 'Selesai').length;
        const total = projects.length || 1;
        const successRate = (completed / total) * 100;

        return [
            { label: 'Profit Margin', value: `${margin.toFixed(1)}%`, icon: <TrendingUpIcon className="w-4 h-4" />, color: 'text-brand-success' },
            { label: 'Project Success', value: `${successRate.toFixed(1)}%`, icon: <StarIcon className="w-4 h-4" />, color: 'text-brand-accent' },
            { label: 'Avg Revenue/Proyek', value: formatCurrency(totalRevenue / total, 0), icon: <DollarSignIcon className="w-4 h-4" />, color: 'text-brand-text-light' },
        ];
    }, [projects, transactions]);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
            <h3 className="font-bold text-lg text-gradient mb-6">Ringkasan Performa Bisnis</h3>
            <div className="space-y-6">
                {stats.map(stat => (
                    <div key={stat.label} className="flex items-center justify-between p-3 bg-brand-bg/50 rounded-xl border border-brand-border/50">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-brand-surface shadow-inner ${stat.color}`}>{stat.icon}</div>
                            <span className="text-sm font-medium text-brand-text-secondary">{stat.label}</span>
                        </div>
                        <span className={`text-lg font-black ${stat.color}`}>{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


interface DashboardProps {
    projects: Project[];
    clients: Client[];
    transactions: Transaction[];
    teamMembers: TeamMember[];
    cards: Card[];
    pockets: FinancialPocket[];
    handleNavigation: (view: ViewType, action?: NavigationAction) => void;
    leads: Lead[];
    teamProjectPayments: TeamProjectPayment[];
    packages: Package[];
    clientFeedback: ClientFeedback[];
    currentUser: User | null;
    projectStatusConfig: ProjectStatusConfig[];
    profile: Profile;
    totals: {
        projects: number;
        activeProjects: number;
        clients: number;
        activeClients: number;
        leads: number;
        discussionLeads: number;
        followUpLeads: number;
        teamMembers: number;
        transactions: number;
        revenue: number;
        expense: number;
    };
}

const Dashboard: React.FC<DashboardProps> = ({ projects, clients, transactions, teamMembers, cards, pockets, handleNavigation, leads, teamProjectPayments, packages, clientFeedback, currentUser, projectStatusConfig, profile, totals }) => {
    const [activeModal, setActiveModal] = useState<'balance' | 'projects' | 'clients' | 'teamMembers' | 'payments' | null>(null);

    const getSubStatusDisplay = (project: Project) => {
        if (project.activeSubStatuses?.length) {
            return `${project.status}: ${project.activeSubStatuses.join(', ')}`;
        }
        if (project.status === 'Dikirim' && project.shippingDetails) {
            return `Dikirim: ${project.shippingDetails}`;
        }
        return project.status;
    };

    const summary = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const eventsThisMonth = projects.filter(p => {
            const d = new Date(p.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;

        const incomeThisMonth = transactions.filter(t => {
            const d = new Date(t.date);
            return t.type === TransactionType.INCOME && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((sum, t) => sum + t.amount, 0);

        const unpaidInvoices = projects.filter(p => p.paymentStatus !== PaymentStatus.LUNAS && p.status !== 'Dibatalkan').length;

        return {
            totalBalance: cards.reduce((sum, c) => sum + c.balance, 0),
            activeProjects: totals.activeProjects,
            activeClients: totals.activeClients,
            totalteamMembers: totals.teamMembers,
            eventsThisMonth,
            incomeThisMonth,
            unpaidInvoices
        };
    }, [cards, totals.activeProjects, totals.activeClients, totals.teamMembers, projects, transactions]);

    const activeProjects = useMemo(() => projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);
    const activeClients = useMemo(() => clients.filter(c => c.status === ClientStatus.ACTIVE), [clients]);
    const unpaidTeamPayments = useMemo(() => teamProjectPayments.filter(p => p.status === 'Unpaid'), [teamProjectPayments]);

    const modalTitles: { [key: string]: string } = {
        balance: 'Rincian Saldo',
        projects: 'Daftar Acara Pernikahan Aktif',
        clients: 'Daftar Pengantin Aktif',
        teamMembers: 'Daftar Semua Tim / Vendor',
        payments: 'Rincian Sisa Pembayaran Tim'
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="col-span-1 xl:col-span-12 grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4">
                <div className="widget-animate transition-transform duration-200 hover:scale-[1.02]" style={{ animationDelay: '100ms' }}>
                    <StatCard
                        icon={<DollarSignIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Total Saldo"
                        value={formatCurrency(summary.totalBalance)}
                        subtitle="Saldo semua kartu & kas"
                        colorVariant="blue"
                        onClick={() => setActiveModal('balance')}
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-[1.02]" style={{ animationDelay: '150ms' }}>
                    <StatCard
                        icon={<TrendingUpIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Pendapatan (Bulan Ini)"
                        value={formatCurrency(summary.incomeThisMonth)}
                        subtitle={`Target: ${formatCurrency(50000000)}`}
                        colorVariant="green"
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-[1.02]" style={{ animationDelay: '200ms' }}>
                    <StatCard
                        icon={<FolderKanbanIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Acara Aktif"
                        value={summary.activeProjects.toString()}
                        subtitle="Project sedang berjalan"
                        colorVariant="purple"
                        onClick={() => setActiveModal('projects')}
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-[1.02]" style={{ animationDelay: '250ms' }}>
                    <StatCard
                        icon={<CalendarIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Acara Bulan Ini"
                        value={summary.eventsThisMonth.toString()}
                        subtitle="Jadwal di bulan ini"
                        colorVariant="orange"
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-[1.02]" style={{ animationDelay: '300ms' }}>
                    <StatCard
                        icon={<UsersIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Pengantin Aktif"
                        value={summary.activeClients.toString()}
                        subtitle="Klien dengan project berjalan"
                        colorVariant="blue"
                        onClick={() => setActiveModal('clients')}
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-[1.02]" style={{ animationDelay: '350ms' }}>
                    <StatCard
                        icon={<AlertCircleIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Invoice Unpaid"
                        value={summary.unpaidInvoices.toString()}
                        subtitle="Klien belum lunas"
                        colorVariant="pink"
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-[1.02]" style={{ animationDelay: '400ms' }}>
                    <StatCard
                        icon={<BriefcaseIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Total Tim"
                        value={summary.totalteamMembers.toString()}
                        subtitle="Tim/Vendor terdaftar"
                        colorVariant="blue"
                        onClick={() => setActiveModal('teamMembers')}
                    />
                </div>
            </div>


            <div className="col-span-1 xl:col-span-12 widget-animate" style={{ animationDelay: '500ms' }}><CalendarMonthWidget projects={projects} profile={profile} handleNavigation={handleNavigation} /></div>
            <div className="col-span-1 xl:col-span-8 widget-animate" style={{ animationDelay: '600ms' }}><IncomeChartWidget transactions={transactions} /></div>
            <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '650ms' }}><BusinessHealthWidget projects={projects} transactions={transactions} /></div>

            <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '700ms' }}><LeadSourceWidget leads={leads} /></div>
            <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '750ms' }}><ConversionFunnelWidget leads={leads} /></div>
            <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '800ms' }}><PackageDistributionWidget projects={projects} /></div>

            <div className="col-span-1 xl:col-span-7 widget-animate" style={{ animationDelay: '850ms' }}><MyCardsWidget cards={cards} handleNavigation={handleNavigation} /></div>
            <div className="col-span-1 xl:col-span-5 widget-animate" style={{ animationDelay: '900ms' }}><RecentTransactionsWidget transactions={transactions} /></div>

            <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '1000ms' }}><ProjectStatusWidget projects={projects} projectStatusConfig={projectStatusConfig} handleNavigation={handleNavigation} /></div>
            <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '1100ms' }}><LeadsSummaryWidget leads={leads} handleNavigation={handleNavigation} /></div>
            <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '1200ms' }}><ClientSatisfactionWidget feedback={clientFeedback} handleNavigation={handleNavigation} /></div>
            <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '1300ms' }}><BookingTrendWidget projects={projects} /></div>

            <div className="col-span-1 xl:col-span-3 widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '1300ms' }} onClick={() => setActiveModal('payments')}>
                <StatCard icon={<BriefcaseIcon className="w-5 h-5 md:w-6 md:h-6" />} title="Sisa Pembayaran Tim" value={formatCurrency(teamProjectPayments.filter(p => p.status === 'Unpaid').reduce((s, p) => s + p.fee, 0))} subtitle="Fee tim yang belum dibayar" colorVariant="pink" />
            </div>
            <div className="col-span-1 xl:col-span-12 widget-animate" style={{ animationDelay: '1400ms' }}><UpcomingCalendarWidget projects={projects} handleNavigation={handleNavigation} /></div>
            <div className="col-span-1 xl:col-span-12 widget-animate" style={{ animationDelay: '1500ms' }}><QuickLinksWidget handleNavigation={handleNavigation} currentUser={currentUser} /></div>

            {/* StatCard Detail Modals */}
            <StatCardModal
                isOpen={activeModal === 'balance'}
                onClose={() => setActiveModal(null)}
                icon={<DollarSignIcon className="w-6 h-6" />}
                title="Total Saldo"
                value={formatCurrency(summary.totalBalance)}
                subtitle="Saldo semua kartu & kas"
                colorVariant="blue"
                description={`Total saldo mencakup semua kartu bank, kartu kredit, dan uang tunai yang Anda miliki.\n\nRincian:\n• Kartu Bank: ${cards.filter(c => c.cardType === 'Debit').length} kartu\n• Kartu Kredit: ${cards.filter(c => c.cardType === 'Kredit').length} kartu\n• Tunai: ${cards.filter(c => c.cardType === 'Tunai').length} akun\n\nSaldo ini diperbarui secara real-time berdasarkan transaksi yang Anda catat.`}
            >
                <div className="space-y-4">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Kartu & Tunai</h4>
                    <div className="space-y-3">
                        {cards.map(card => (
                            <div key={card.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center hover:bg-brand-input transition-colors">
                                <p className="font-semibold text-brand-text-light">{card.bankName} {card.id !== 'CARD_CASH' ? `**** ${card.lastFourDigits}` : '(Tunai)'}</p>
                                <p className="font-semibold text-brand-accent">{formatCurrency(card.balance)}</p>
                            </div>
                        ))}
                    </div>
                    {pockets.length > 0 && (
                        <>
                            <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2 mt-6">Kantong</h4>
                            <div className="space-y-3">
                                {pockets.map(pocket => (
                                    <div key={pocket.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center hover:bg-brand-input transition-colors">
                                        <p className="font-semibold text-brand-text-light">{pocket.name}</p>
                                        <p className="font-semibold text-brand-accent">{formatCurrency(pocket.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeModal === 'projects'}
                onClose={() => setActiveModal(null)}
                icon={<FolderKanbanIcon className="w-6 h-6" />}
                title="Acara Pernikahan Aktif"
                value={summary.activeProjects.toString()}
                subtitle="Acara Pernikahan yang sedang berjalan"
                colorVariant="purple"
                description={`Acara Pernikahan aktif adalah Acara Pernikahan yang statusnya bukan "Selesai" atau "Dibatalkan".\n\nAcara Pernikahan aktif memerlukan perhatian dan tindak lanjut untuk memastikan penyelesaian tepat waktu.`}
            >
                <div className="space-y-3">
                    {projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan').map(project => (
                        <div key={project.id} className="p-4 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors cursor-pointer" onClick={() => { setActiveModal(null); handleNavigation(ViewType.PROJECTS); }}>
                            <div className="flex justify-between items-start mb-2">
                                <p className="font-semibold text-brand-text-light">{project.projectName}</p>
                                <span className="text-xs px-2 py-1 rounded-full bg-brand-accent/20 text-brand-accent">{project.status}</span>
                            </div>
                            <p className="text-sm text-brand-text-secondary">{clients.find(c => c.id === project.clientId)?.name || 'Unknown Client'}</p>
                            <p className="text-sm text-brand-accent font-semibold mt-2">{formatCurrency(project.totalCost)}</p>
                        </div>
                    ))}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeModal === 'clients'}
                onClose={() => setActiveModal(null)}
                icon={<UsersIcon className="w-6 h-6" />}
                title="Pengantin Aktif"
                value={summary.activeClients.toString()}
                subtitle="Pengantin dengan Acara Pernikahan berjalan"
                colorVariant="green"
                description={`Pengantin aktif adalah pengantin yang memiliki minimal satu Acara Pernikahan yang sedang berjalan.\n\nMempertahankan hubungan baik dengan pengantin aktif sangat penting untuk bisnis Anda.`}
            >
                <div className="space-y-3">
                    {clients.filter(c => projects.some(p => p.clientId === c.id && p.status !== 'Selesai' && p.status !== 'Dibatalkan')).map(client => {
                        const clientProjects = projects.filter(p => p.clientId === client.id && p.status !== 'Selesai' && p.status !== 'Dibatalkan');
                        return (
                            <div key={client.id} className="p-4 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors cursor-pointer" onClick={() => { setActiveModal(null); handleNavigation(ViewType.CLIENTS); }}>
                                <p className="font-semibold text-brand-text-light">{client.name}</p>
                                <p className="text-sm text-brand-text-secondary mt-1">{clientProjects.length} Acara Pernikahan aktif</p>
                                <p className="text-xs text-brand-text-secondary mt-1">{client.email}</p>
                            </div>
                        );
                    })}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeModal === 'teamMembers'}
                onClose={() => setActiveModal(null)}
                icon={<BriefcaseIcon className="w-6 h-6" />}
                title="Total Tim / Vendor"
                value={summary.totalteamMembers.toString()}
                subtitle="Anggota tim terdaftar"
                colorVariant="orange"
                description={`Total Tim / Vendor mencakup semua anggota tim yang terdaftar dalam sistem Anda.\n\nTim / Vendor dapat ditugaskan ke berbagai Acara Pernikahan dan menerima fee sesuai pekerjaan mereka.`}
            >
                <div className="space-y-3">
                    {teamMembers.map(member => {
                        const unpaidPayments = teamProjectPayments.filter(p => p.teamMemberId === member.id && p.status === 'Unpaid');
                        const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + p.fee, 0);
                        return (
                            <div key={member.id} className="p-4 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors cursor-pointer" onClick={() => { setActiveModal(null); handleNavigation(ViewType.TEAM); }}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{member.name}</p>
                                        <p className="text-sm text-brand-text-secondary">{member.role}</p>
                                    </div>
                                    {totalUnpaid > 0 && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-500">
                                            {formatCurrency(totalUnpaid)} belum dibayar
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </StatCardModal>

            <Modal isOpen={!!activeModal && !['balance', 'projects', 'clients', 'teamMembers'].includes(activeModal)} onClose={() => setActiveModal(null)} title={activeModal ? modalTitles[activeModal] : ''} size="2xl">
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {activeModal === 'balance' && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gradient border-b border-brand-border pb-2">Kartu & Tunai</h4>
                            <div className="space-y-3">
                                {cards.map(card => (
                                    <div key={card.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-brand-text-light">{card.bankName} {card.id !== 'CARD_CASH' ? `**** ${card.lastFourDigits}` : '(Tunai)'}</p>
                                        <p className="font-semibold text-brand-text-light">{formatCurrency(card.balance)}</p>
                                    </div>
                                ))}
                            </div>
                            <h4 className="font-semibold text-gradient border-b border-brand-border pb-2 mt-6">Kantong</h4>
                            <div className="space-y-3">
                                {pockets.map(pocket => (
                                    <div key={pocket.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-brand-text-light">{pocket.name}</p>
                                        <p className="font-semibold text-brand-text-light">{formatCurrency(pocket.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeModal === 'projects' && (
                        <div className="space-y-3">
                            {activeProjects.length > 0 ? activeProjects.map(project => (
                                <div key={project.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{project.projectName}</p>
                                        <p className="text-sm text-brand-text-secondary">{project.clientName}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(project.status, projectStatusConfig)}`}>
                                        {getSubStatusDisplay(project)}
                                    </span>
                                </div>
                            )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada Acara Pernikahan aktif.</p>}
                        </div>
                    )}
                    {activeModal === 'clients' && (
                        <div className="space-y-3">
                            {activeClients.map(client => (
                                <div key={client.id} className="p-3 bg-brand-bg rounded-lg">
                                    <p className="font-semibold text-brand-text-light">{client.name}</p>
                                    <p className="text-sm text-brand-text-secondary">{client.email}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeModal === 'teamMembers' && (
                        <div className="space-y-3">
                            {teamMembers.map(member => (
                                <div key={member.id} className="p-3 bg-brand-bg rounded-lg">
                                    <p className="font-semibold text-brand-text-light">{member.name}</p>
                                    <p className="text-sm text-brand-text-secondary">{member.role}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeModal === 'payments' && (
                        <div className="space-y-3">
                            {unpaidTeamPayments.length > 0 ? unpaidTeamPayments.map(p => (
                                <div key={p.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{p.teamMemberName}</p>
                                        <p className="text-sm text-brand-text-secondary">Acara Pernikahan: {projects.find(proj => proj.id === p.projectId)?.projectName || 'N/A'}</p>
                                    </div>
                                    <p className="font-semibold text-brand-danger">{formatCurrency(p.fee)}</p>
                                </div>
                            )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada pembayaran yang tertunda.</p>}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
