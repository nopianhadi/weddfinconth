import React, { useState, useMemo, useEffect } from 'react';
import { TeamMember, TeamProjectPayment, Profile, Transaction, TransactionType, TeamPaymentRecord, Project, Card, FinancialPocket, PocketType, PerformanceNoteType, PerformanceNote, NavigationAction, CardType } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import FreelancerProjects from './FreelancerProjects';
import StatCard from './StatCard';
import RupiahInput from './RupiahInput';
import SignaturePad from './SignaturePad';
import PrintButton from './PrintButton';
import QrCodeDisplay from './QrCodeDisplay';
import { PlusIcon, PencilIcon, Trash2Icon, EyeIcon, PrinterIcon, CreditCardIcon, FileTextIcon, HistoryIcon, Share2Icon, PiggyBankIcon, LightbulbIcon, StarIcon, UsersIcon, AlertCircleIcon, UserCheckIcon, MessageSquareIcon, DownloadIcon, QrCodeIcon, CalendarIcon, DollarSignIcon } from '../constants';
import { createTeamMember as createTeamMemberRow, updateTeamMember as updateTeamMemberRow, deleteTeamMember as deleteTeamMemberRow } from '../services/teamMembers';
import { markTeamPaymentStatus, listAllTeamPayments, updateTeamPaymentFee } from '../services/teamProjectPayments';
import { createTransaction as createTransactionApi, updateCardBalance as updateCardBalanceApi, listTransactions as listTransactionsApi } from '../services/transactions';
import { createTeamPaymentRecord } from '../services/teamPaymentRecords';

import { updatePocket as updatePocketRow } from '../services/pockets';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const getStatusClass = (status: 'Paid' | 'Unpaid') => {
    return status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400';
};

const emptyMember: Omit<TeamMember, 'id' | 'rating' | 'performanceNotes' | 'portalAccessId'> = { name: '', role: '', email: '', phone: '', standardFee: 0, noRek: '', category: 'Tim' };

const downloadCSV = (headers: string[], data: (string | number)[][], filename: string) => {
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            row.map(field => {
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        )
    ];

    const csvString = csvRows.join('\n');
    // Add UTF-8 BOM so Excel (Windows) recognizes encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// --- NEWLY ADDED HELPER COMPONENTS ---

const StarRating: React.FC<{ rating: number; onSetRating?: (rating: number) => void }> = ({ rating, onSetRating }) => (
    <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
            <button
                key={star}
                type="button"
                onClick={onSetRating ? () => onSetRating(star) : undefined}
                className={`p-1 ${onSetRating ? 'cursor-pointer' : ''}`}
                disabled={!onSetRating}
                aria-label={`Set rating to ${star}`}
            >
                <StarIcon className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
            </button>
        ))}
    </div>
);

const getNoteTypeClass = (type: PerformanceNoteType) => {
    switch (type) {
        case PerformanceNoteType.PRAISE: return 'bg-green-500/20 text-green-400';
        case PerformanceNoteType.CONCERN: return 'bg-yellow-500/20 text-yellow-400';
        case PerformanceNoteType.LATE_DEADLINE: return 'bg-red-500/20 text-red-400';
        case PerformanceNoteType.GENERAL:
        default: return 'bg-gray-500/20 text-gray-400';
    }
}

interface PerformanceTabProps {
    member: TeamMember;
    onSetRating: (rating: number) => void;
    newNote: string;
    setNewNote: (note: string) => void;
    newNoteType: PerformanceNoteType;
    setNewNoteType: (type: PerformanceNoteType) => void;
    onAddNote: () => void;
    onDeleteNote: (noteId: string) => void;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({
    member, onSetRating, newNote, setNewNote, newNoteType, setNewNoteType, onAddNote, onDeleteNote
}) => (
    <div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-lg mb-6 transition-all">
            <h4 className="text-base font-semibold text-brand-text-light mb-2">Peringkat Kinerja Keseluruhan</h4>
            <p className="text-sm text-brand-text-secondary mb-3">Beri peringkat pada Tim / Vendor ini berdasarkan kinerja mereka secara umum.</p>
            <div className="flex justify-center">
                <StarRating rating={member.rating} onSetRating={onSetRating} />
            </div>
        </div>

        <div className="mb-6">
            <h4 className="text-base font-semibold text-brand-text-light mb-3">Tambah Catatan Kinerja Baru</h4>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-lg space-y-4">
                <div className="input-group">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="input-field"
                        rows={3}
                        placeholder=" "
                        id="newPerformanceNote"
                    />
                    <label htmlFor="newPerformanceNote" className="input-label">Tulis catatan...</label>
                </div>
                <div className="flex justify-between items-center">
                    <div className="input-group !mb-0 flex-grow">
                        <select
                            id="newNoteType"
                            value={newNoteType}
                            onChange={(e) => setNewNoteType(e.target.value as PerformanceNoteType)}
                            className="input-field"
                        >
                            {Object.values(PerformanceNoteType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <label htmlFor="newNoteType" className="input-label">Jenis Catatan</label>
                    </div>
                    <button onClick={onAddNote} className="button-primary ml-4">Tambah Catatan</button>
                </div>
            </div>
        </div>

        <div>
            <h4 className="text-base font-semibold text-brand-text-light mb-3">Riwayat Catatan Kinerja</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {member.performanceNotes.length > 0 ? member.performanceNotes.map(note => (
                    <div key={note.id} className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-sm flex justify-between items-start transition-all hover:bg-white/10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getNoteTypeClass(note.type)}`}>{note.type}</span>
                                <span className="text-xs text-brand-text-secondary">{new Date(note.date).toLocaleDateString('id-ID')}</span>
                            </div>
                            <p className="text-sm text-brand-text-primary">{note.note}</p>
                        </div>
                        <button onClick={() => onDeleteNote(note.id)} className="p-1.5 text-brand-text-secondary hover:text-red-400">
                            <Trash2Icon className="w-4 h-4" />
                        </button>
                    </div>
                )) : (
                    <p className="text-center text-sm text-brand-text-secondary py-8">Belum ada catatan kinerja.</p>
                )}
            </div>
        </div>
    </div>
);


// --- Detail Modal Sub-components (Moved outside main component) ---



interface CreatePaymentTabProps {
    member: TeamMember;
    paymentDetails: { projects: TeamProjectPayment[]; total: number };
    paymentAmount: number | '';
    setPaymentAmount: React.Dispatch<React.SetStateAction<number | ''>>;
    isInstallment: boolean;
    setIsInstallment: React.Dispatch<React.SetStateAction<boolean>>;
    onPay: () => void;
    onSetTab: (tab: 'projects') => void;
    renderPaymentDetailsContent: () => React.ReactNode;
    cards: Card[];
    monthlyBudgetPocket: FinancialPocket | undefined;
    paymentSourceId: string;
    setPaymentSourceId: (id: string) => void;
    onSign: () => void;
}

const CreatePaymentTab: React.FC<CreatePaymentTabProps> = ({
    member, paymentDetails, paymentAmount, setPaymentAmount, isInstallment, setIsInstallment, onPay, onSetTab, renderPaymentDetailsContent, cards,
    monthlyBudgetPocket, paymentSourceId, setPaymentSourceId, onSign
}) => {

    const handlePayClick = () => {
        onPay();
    }

    return (
        <div>
            {renderPaymentDetailsContent()}

            <div className="mt-6 pt-6 border-t border-brand-border non-printable space-y-4 bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-gradient text-base">Buat Pembayaran</h5>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <span className="text-xs font-medium text-brand-text-secondary group-hover:text-brand-accent transition-colors">Bayar Bertahap?</span>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
                        </div>
                    </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="input-group">
                        <input
                            type="number"
                            id="paymentAmount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            className="input-field"
                            placeholder=" "
                            max={paymentDetails.total}
                        />
                        <label htmlFor="paymentAmount" className="input-label">Jumlah Bayar (Total: {formatCurrency(paymentDetails.total)})</label>
                    </div>
                    <div className="input-group">
                        <select
                            id="paymentSource"
                            className="input-field"
                            value={paymentSourceId}
                            onChange={e => setPaymentSourceId(e.target.value)}
                        >
                            <option value="" disabled>Pilih Sumber Pembayaran...</option>
                            {monthlyBudgetPocket && (
                                <option value={`pocket-${monthlyBudgetPocket.id}`}>
                                    {monthlyBudgetPocket.name} (Sisa: {formatCurrency(monthlyBudgetPocket.amount)})
                                </option>
                            )}
                            {cards.map(card => (
                                <option key={card.id} value={`card-${card.id}`}>
                                    {card.bankName} {card.lastFourDigits !== 'CASH' ? `**** ${card.lastFourDigits}` : ''} (Saldo: {formatCurrency(card.balance)})
                                </option>
                            ))}
                        </select>
                        <label htmlFor="paymentSource" className="input-label">Sumber Dana</label>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onSign} className="button-secondary text-sm inline-flex items-center gap-2">
                            <PencilIcon className="w-4 h-4" />
                            Tanda Tangani Slip
                        </button>
                        <button type="button" onClick={() => window.print()} className="button-secondary text-sm inline-flex items-center gap-2">
                            <PrinterIcon className="w-4 h-4" /> Cetak
                        </button>
                    </div>
                    <button type="button" onClick={handlePayClick} className="button-primary w-full sm:w-auto">
                        Bayar Sekarang & Buat Catatan
                    </button>
                </div>
            </div>
        </div>
    );
};

interface FreelancersProps {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  teamProjectPayments: TeamProjectPayment[];
  setTeamProjectPayments: React.Dispatch<React.SetStateAction<TeamProjectPayment[]>>;
  teamPaymentRecords: TeamPaymentRecord[];
  setTeamPaymentRecords: React.Dispatch<React.SetStateAction<TeamPaymentRecord[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  userProfile: Profile;
  showNotification: (message: string) => void;
  initialAction: NavigationAction | null;
  setInitialAction: (action: NavigationAction | null) => void;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;

  pockets: FinancialPocket[];
  setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
  cards: Card[];
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  onSignPaymentRecord: (recordId: string, signatureDataUrl: string) => void;
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

export const Freelancers: React.FC<FreelancersProps> = ({
    teamMembers, setTeamMembers, teamProjectPayments, setTeamProjectPayments, teamPaymentRecords, setTeamPaymentRecords,
    transactions, setTransactions, userProfile, showNotification, initialAction, setInitialAction, projects, setProjects,
    pockets, setPockets, cards, setCards, onSignPaymentRecord, totals
}) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [isInstallment, setIsInstallment] = useState(false);

    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [formData, setFormData] = useState<Omit<TeamMember, 'id' | 'rating' | 'performanceNotes' | 'portalAccessId'>>(emptyMember);

    const [detailTab, setDetailTab] = useState<'projects' | 'payments' | 'performance' | 'create-payment'>('projects');
    const [projectsToPay, setProjectsToPay] = useState<string[]>([]);
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
    const [paymentSourceId, setPaymentSourceId] = useState('');
    const [activeStatModal, setActiveStatModal] = useState<{ group: 'team' | 'vendor'; stat: 'total' | 'unpaid' | 'topRated' | 'events' | 'payments' | 'performance' } | null>(null);
    const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
    const [paymentSlipToView, setPaymentSlipToView] = useState<TeamPaymentRecord | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // New states for performance management
    const [newNote, setNewNote] = useState('');
    const [newNoteType, setNewNoteType] = useState<PerformanceNoteType>(PerformanceNoteType.GENERAL);
    const [qrModalContent, setQrModalContent] = useState<{ title: string; url: string } | null>(null);

    const [teamSearchQuery, setTeamSearchQuery] = useState('');
    const [vendorSearchQuery, setVendorSearchQuery] = useState('');



    const projectsInDateRange = useMemo(() => {
        if (!dateFrom && !dateTo) return projects;
        return projects.filter(p => {
            const d = new Date(p.date);
            d.setHours(0, 0, 0, 0);
            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                if (d < from) return false;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (d > to) return false;
            }
            return true;
        });
    }, [projects, dateFrom, dateTo]);

    const teamProjectPaymentsInDateRange = useMemo(() => {
        if (!dateFrom && !dateTo) return teamProjectPayments;
        const projectIdsInRange = new Set(projectsInDateRange.map(p => p.id));
        return teamProjectPayments.filter(p => projectIdsInRange.has(p.projectId));
    }, [teamProjectPayments, projectsInDateRange, dateFrom, dateTo]);

    useEffect(() => {
        if (initialAction && initialAction.type === 'VIEW_FREELANCER_DETAILS' && initialAction.id) {
            const memberToView = teamMembers.find(m => m.id === initialAction.id);
            if (memberToView) {
                handleViewDetails(memberToView);
            }
            setInitialAction(null);
        }
    }, [initialAction, teamMembers, setInitialAction]);

    // Keep selectedMember up-to-date when teamMembers changes
    useEffect(() => {
        if (!selectedMember) return;
        const latest = teamMembers.find(m => m.id === selectedMember.id);
        if (latest && (
            latest.name !== selectedMember.name ||
            latest.role !== selectedMember.role ||
            latest.rating !== selectedMember.rating
        )) {
            setSelectedMember(latest);
        }
    }, [teamMembers, selectedMember]);

    const handleOpenQrModal = async (member: TeamMember) => {
        try {
            let accessId = member.portalAccessId;
            if (!accessId) {
                accessId = crypto.randomUUID();
                // Persist to DB
                try {
                    const updated = await updateTeamMemberRow(member.id, { portalAccessId: accessId } as Partial<TeamMember>);
                    // Update local state to reflect new accessId
                    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, portalAccessId: updated.portalAccessId || accessId! } : m));
                } catch (e) {
                    // Fallback update local only
                    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, portalAccessId: accessId! } : m));
                }
            }
            const path = window.location.pathname.replace(/index\.html$/, '');
            const url = `${window.location.origin}${path}#/freelancer-portal/${accessId}`;
            setQrModalContent({ title: `Portal Tautan untuk ${member.name}`, url });
        } catch { }
    };

    const memberGroups = useMemo(() => {
        const team = teamMembers.filter(m => m.category !== 'Vendor');
        const vendor = teamMembers.filter(m => m.category === 'Vendor');
        return { team, vendor };
    }, [teamMembers]);

    const teamSectionStats = useMemo(() => {
        const memberIds = new Set(memberGroups.team.map(m => m.id));
        const totalUnpaid = teamProjectPaymentsInDateRange
            .filter(p => p.status === 'Unpaid' && memberIds.has(p.teamMemberId))
            .reduce((sum, p) => sum + p.fee, 0);

        const teamPayments = teamProjectPaymentsInDateRange.filter(p => memberIds.has(p.teamMemberId));
        const uniqueProjectIds = new Set(teamPayments.map(p => p.projectId));
        const totalPaid = teamPayments
            .filter(p => p.status === 'Paid')
            .reduce((sum, p) => sum + p.fee, 0);
        const totalUnpaidCount = teamPayments.filter(p => p.status === 'Unpaid').length;
        const totalPaidCount = teamPayments.filter(p => p.status === 'Paid').length;
        const avgRating = memberGroups.team.length > 0
            ? memberGroups.team.reduce((sum, m) => sum + (m.rating || 0), 0) / memberGroups.team.length
            : 0;
        const performanceNotesCount = memberGroups.team.reduce((sum, m) => sum + (m.performanceNotes?.length || 0), 0);

        const topRated = [...memberGroups.team].sort((a, b) => b.rating - a.rating)[0];
        return {
            totalMembers: memberGroups.team.length,
            totalUnpaid: formatCurrency(totalUnpaid),
            topRatedName: topRated ? topRated.name : 'N/A',
            topRatedRating: topRated ? topRated.rating.toFixed(1) : 'N/A',

            totalWeddingEvents: uniqueProjectIds.size,
            totalPaid: formatCurrency(totalPaid),
            totalUnpaidRaw: formatCurrency(totalUnpaid),
            totalPaidCount,
            totalUnpaidCount,
            avgRating: avgRating.toFixed(1),
            performanceNotesCount,
        };
    }, [memberGroups.team, teamProjectPaymentsInDateRange]);

    const vendorSectionStats = useMemo(() => {
        const memberIds = new Set(memberGroups.vendor.map(m => m.id));
        const totalUnpaid = teamProjectPaymentsInDateRange
            .filter(p => p.status === 'Unpaid' && memberIds.has(p.teamMemberId))
            .reduce((sum, p) => sum + p.fee, 0);

        const vendorPayments = teamProjectPaymentsInDateRange.filter(p => memberIds.has(p.teamMemberId));
        const uniqueProjectIds = new Set(vendorPayments.map(p => p.projectId));
        const totalPaid = vendorPayments
            .filter(p => p.status === 'Paid')
            .reduce((sum, p) => sum + p.fee, 0);
        const totalUnpaidCount = vendorPayments.filter(p => p.status === 'Unpaid').length;
        const totalPaidCount = vendorPayments.filter(p => p.status === 'Paid').length;
        const avgRating = memberGroups.vendor.length > 0
            ? memberGroups.vendor.reduce((sum, m) => sum + (m.rating || 0), 0) / memberGroups.vendor.length
            : 0;
        const performanceNotesCount = memberGroups.vendor.reduce((sum, m) => sum + (m.performanceNotes?.length || 0), 0);

        const topRated = [...memberGroups.vendor].sort((a, b) => b.rating - a.rating)[0];
        return {
            totalMembers: memberGroups.vendor.length,
            totalUnpaid: formatCurrency(totalUnpaid),
            topRatedName: topRated ? topRated.name : 'N/A',
            topRatedRating: topRated ? topRated.rating.toFixed(1) : 'N/A',

            totalWeddingEvents: uniqueProjectIds.size,
            totalPaid: formatCurrency(totalPaid),
            totalUnpaidRaw: formatCurrency(totalUnpaid),
            totalPaidCount,
            totalUnpaidCount,
            avgRating: avgRating.toFixed(1),
            performanceNotesCount,
        };
    }, [memberGroups.vendor, teamProjectPaymentsInDateRange]);

    const teamStats = useMemo(() => {
        const totalPayout = teamPaymentRecords.reduce((sum, r) => sum + r.totalAmount, 0);
        const totalProjectsHandled = teamProjectPayments.filter(p => p.status === 'Paid').length;
        const avgRating = teamMembers.length > 0 ? teamMembers.reduce((sum, m) => sum + m.rating, 0) / teamMembers.length : 0;

        return {
            totalPayout: formatCurrency(totalPayout),
            totalProjectsHandled,
            avgRating: avgRating.toFixed(1),
        };
    }, [teamPaymentRecords, teamProjectPayments, teamMembers]);

    const handleOpenForm = (mode: 'add' | 'edit', member?: TeamMember) => {
        setFormMode(mode);
        if (mode === 'edit' && member) {
            setSelectedMember(member);
            // Pastikan nilai terdefinisi agar input menjadi controlled
            setFormData({
                name: member.name || '',
                role: member.role || '',
                email: member.email || '',
                phone: member.phone || '',
                standardFee: typeof member.standardFee === 'number' ? member.standardFee : 0,
                noRek: member.noRek || '',
                category: member.category || 'Tim'
            });
        } else {
            setSelectedMember(null);
            setFormData(emptyMember);
        }
        setIsFormOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'standardFee' ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formMode === 'add') {
                const payload: Omit<TeamMember, 'id'> = {
                    ...formData,

                    rating: 0,
                    performanceNotes: [],
                    portalAccessId: crypto.randomUUID(),
                } as any;
                const created = await createTeamMemberRow(payload);
                setTeamMembers(prev => [...prev, created]);
                showNotification(`Tim / Vendor ${created.name} berhasil ditambahkan.`);
            } else if (selectedMember) {
                try {
                    const updated = await updateTeamMemberRow(selectedMember.id, formData as Partial<TeamMember>);
                    setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? updated : m));
                    // Cascade name change to other data structures
                    if (formData.name !== selectedMember.name) {
                        setProjects(prevProjects => prevProjects.map(proj => ({
                            ...proj,
                            team: proj.team.map(t => t.memberId === selectedMember.id ? { ...t, name: formData.name } : t)
                        })));
                        setTeamProjectPayments(prevPayments => prevPayments.map(p => p.teamMemberId === selectedMember.id ? { ...p, teamMemberName: formData.name } : p));
                    }
                    showNotification(`Data ${updated.name} berhasil diperbarui.`);
                } catch (err: any) {
                    console.warn('[Supabase][teamMembers.update] gagal, fallback create. Detail:', err);
                    const payload: Omit<TeamMember, 'id'> = {
                        ...selectedMember,
                        ...formData,
                    } as any;
                    const created = await createTeamMemberRow(payload);
                    setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? created : m));
                    showNotification(`Tim / Vendor baru ${created.name} berhasil dibuat (fallback).`);
                }
            }
            setIsFormOpen(false);
        } catch (err: any) {
            console.error('[Supabase][teamMembers.save] error:', err);
            alert(`Gagal menyimpan data Tim / Vendor. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleDelete = async (memberId: string) => {
        if (teamProjectPayments.some(p => p.teamMemberId === memberId && p.status === 'Unpaid')) {
            alert("Tim / Vendor ini memiliki pembayaran yang belum lunas dan tidak dapat dihapus.");
            return;
        }
        if (!window.confirm("Apakah Anda yakin ingin menghapus Tim / Vendor ini? Semua data terkait (Acara Pernikahan, pembayaran) juga akan dihapus.")) return;
        try {
            await deleteTeamMemberRow(memberId);
            // Remove from projects
            setProjects(prevProjects => prevProjects.map(p => ({
                ...p,
                team: p.team.filter(t => t.memberId !== memberId)
            })));
            // Remove related data
            setTeamProjectPayments(prevPayments => prevPayments.filter(p => p.teamMemberId !== memberId));
            setTeamPaymentRecords(prevRecords => prevRecords.filter(r => r.teamMemberId !== memberId));
            // no reward ledger to clean up
            setTeamMembers(prev => prev.filter(m => m.id !== memberId));
            showNotification('Tim / Vendor dan semua data terkait berhasil dihapus.');
        } catch (err: any) {
            console.error('[Supabase][teamMembers.delete] error:', err);
            alert(`Gagal menghapus Tim / Vendor di database. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleViewDetails = (member: TeamMember) => {
        setSelectedMember(member);
        setDetailTab('projects');
        setIsDetailOpen(true);
    };

    const handleCreatePayment = () => {
        if (!selectedMember || projectsToPay.length === 0) return;
        const totalToPay = selectedMemberUnpaidProjects
            .filter(p => projectsToPay.includes(p.id))
            .reduce((sum, p) => sum + p.fee, 0);
        setPaymentAmount(totalToPay);

        const budgetPocket = pockets.find(p => p.type === PocketType.EXPENSE);
        if (budgetPocket && budgetPocket.amount >= totalToPay) {
            setPaymentSourceId(`pocket-${budgetPocket.id}`);
        } else {
            setPaymentSourceId('');
        }

        setDetailTab('create-payment');
    };

    const handlePay = async () => {
        if (!selectedMember || !paymentAmount || paymentAmount <= 0 || !paymentSourceId) {
            alert('Harap isi jumlah dan pilih sumber dana.');
            return;
        }

        const actualPaidAmount = Number(paymentAmount);
        const totalDue = selectedMemberUnpaidProjects
            .filter(p => projectsToPay.includes(p.id))
            .reduce((sum, p) => sum + p.fee, 0);

        if (actualPaidAmount > totalDue) {
            alert(`Jumlah bayar (${formatCurrency(actualPaidAmount)}) melebihi total tagihan (${formatCurrency(totalDue)}).`);
            return;
        }

        const newTransaction: Transaction = {
            id: `TRN-PAY-FR-${crypto.randomUUID()}`,
            date: new Date().toISOString().split('T')[0],
            description: `Pembayaran Gaji Tim / Vendor: ${selectedMember.name} (${projectsToPay.length} Acara Pernikahan)`,
            amount: paymentAmount,
            type: TransactionType.EXPENSE,
            category: 'Gaji Tim / Vendor',
            method: 'Transfer Bank',
        };

        if (paymentSourceId.startsWith('card-')) {
            const cardId = paymentSourceId.replace('card-', '');
            const card = cards.find(c => c.id === cardId);
            if (!card || card.balance < paymentAmount) {
                alert(`Saldo di kartu ${card?.bankName} tidak mencukupi.`); return;
            }
            newTransaction.cardId = cardId;
            newTransaction.method = card.cardType === CardType.TUNAI ? 'Tunai' : 'Kartu';
            setCards(prev => prev.map(c => c.id === cardId ? { ...c, balance: c.balance - paymentAmount } : c));
            // Persist card balance change
            try { await updateCardBalanceApi(cardId, -paymentAmount); } catch (e) { console.warn('[Supabase] updateCardBalance failed:', e); }
        } else { // pocket
            const pocketId = paymentSourceId.replace('pocket-', '');
            const pocket = pockets.find(p => p.id === pocketId);
            if (!pocket || pocket.amount < paymentAmount) {
                alert(`Saldo di kantong ${pocket?.name} tidak mencukupi.`); return;
            }

            if (pocket.sourceCardId) {
                const sourceCard = cards.find(c => c.id === pocket.sourceCardId);
                if (!sourceCard || sourceCard.balance < paymentAmount) {
                    alert(`Saldo di kartu sumber (${sourceCard?.bankName}) yang terhubung ke kantong ini tidak mencukupi.`);
                    return;
                }
                setCards(prev => prev.map(c => c.id === pocket.sourceCardId ? { ...c, balance: c.balance - paymentAmount } : c));
                // Persist source card balance change
                try { await updateCardBalanceApi(sourceCard.id, -paymentAmount); } catch (e) { console.warn('[Supabase] updateCardBalance failed:', e); }
            }

            newTransaction.pocketId = pocketId;
            newTransaction.cardId = pocket.sourceCardId;
            newTransaction.method = 'Sistem';
            setPockets(prev => prev.map(p => p.id === pocketId ? { ...p, amount: p.amount - paymentAmount } : p));
        }

        const newRecordPayload = {
            recordNumber: `PAY-FR-${selectedMember.id.slice(-4)}-${Date.now()}`,
            teamMemberId: selectedMember.id,
            date: new Date().toISOString().split('T')[0],
            projectPaymentIds: projectsToPay,
            totalAmount: paymentAmount
        } as Omit<TeamPaymentRecord, 'id'>;

        // Optimistically update UI
        setTeamProjectPayments(prev => prev.map(p => projectsToPay.includes(p.id) ? { ...p, status: 'Paid' } : p));

        // Persist finance transactions PER PROJECT so they appear in each project's P&L
        try {
            let remainingToDistribute = actualPaidAmount;
            const selectedPayments = [...teamProjectPayments.filter(p => projectsToPay.includes(p.id))].sort((a, b) => a.date.localeCompare(b.date));

            for (const pay of selectedPayments) {
                if (remainingToDistribute <= 0) break;

                const payForThisProject = Math.min(pay.fee, remainingToDistribute);
                const isFullyPaid = payForThisProject >= pay.fee;
                remainingToDistribute -= payForThisProject;

                const proj = projects.find(pr => pr.id === pay.projectId);
                const tx: Omit<Transaction, 'id' | 'vendorSignature'> = {
                    date: newTransaction.date,
                    description: `Gaji Vendor - ${selectedMember.name}${proj ? ` (${proj.projectName})` : ''}${!isFullyPaid ? ' (Cicilan)' : ''}`,
                    amount: payForThisProject,
                    type: TransactionType.EXPENSE,
                    projectId: pay.projectId,
                    category: 'Gaji Tim / Vendor',
                    method: newTransaction.method,
                    pocketId: newTransaction.pocketId,
                    cardId: newTransaction.cardId,
                };
                await createTransactionApi(tx);

                // Update Project Payment Record
                if (isFullyPaid) {
                    await markTeamPaymentStatus(pay.id, 'Paid');
                } else {
                    await updateTeamPaymentFee(pay.id, pay.fee - payForThisProject, 'Unpaid');
                }
            }
            const freshTx = await listTransactionsApi();
            setTransactions(Array.isArray(freshTx) ? freshTx : []);
        } catch (e) {
            console.error('[Supabase] createTransaction (per-project) failed:', e);
        }
        try {
            // Persist: create payment record in DB
            const createdRecord = await createTeamPaymentRecord(newRecordPayload);
            setTeamPaymentRecords(prev => {
                const exists = prev.some(r => r.id === createdRecord.id);
                return exists ? prev.map(r => r.id === createdRecord.id ? createdRecord : r) : [...prev, createdRecord];
            });
            // Refresh payments from DB so statuses survive reload
            const freshPayments = await listAllTeamPayments();
            setTeamProjectPayments(Array.isArray(freshPayments) ? freshPayments : []);
        } catch (err) {
            console.error('[Supabase] Persist payment failed:', err);
        }

        showNotification(`Pembayaran untuk ${selectedMember.name} sebesar ${formatCurrency(paymentAmount)} berhasil dicatat.`);

        setProjectsToPay([]);
        setPaymentAmount('');
        setIsDetailOpen(false);
    };

    const selectedMemberUnpaidProjects = useMemo(() => {
        if (!selectedMember) return [];
        return teamProjectPaymentsInDateRange.filter(p => p.teamMemberId === selectedMember.id && p.status === 'Unpaid');
    }, [teamProjectPaymentsInDateRange, selectedMember]);

    // Performance Tab Handlers
    const handleSetRating = async (rating: number) => {
        if (!selectedMember) return;
        try {
            const updated = await updateTeamMemberRow(selectedMember.id, { rating });
            setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? updated : m));
            setSelectedMember(updated);
        } catch (err: any) {
            console.error('[Supabase][teamMembers.rating] error:', err);
            alert(`Gagal menyimpan rating. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleAddNote = async () => {
        if (!selectedMember || !newNote.trim()) return;
        const note: PerformanceNote = {
            id: `PN-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            note: newNote,
            type: newNoteType
        };
        const updatedNotes = [...selectedMember.performanceNotes, note];
        try {
            const updated = await updateTeamMemberRow(selectedMember.id, { performanceNotes: updatedNotes });
            setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? updated : m));
            setSelectedMember(updated);
            setNewNote('');
            setNewNoteType(PerformanceNoteType.GENERAL);
        } catch (err: any) {
            console.error('[Supabase][teamMembers.addNote] error:', err);
            alert(`Gagal menambah catatan. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!selectedMember) return;
        const updatedNotes = selectedMember.performanceNotes.filter(n => n.id !== noteId);
        try {
            const updated = await updateTeamMemberRow(selectedMember.id, { performanceNotes: updatedNotes });
            setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? updated : m));
            setSelectedMember(updated);
        } catch (err: any) {
            console.error('[Supabase][teamMembers.deleteNote] error:', err);
            alert(`Gagal menghapus catatan. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const monthlyBudgetPocket = useMemo(() => pockets.find(p => p.type === PocketType.EXPENSE), [pockets]);

    const filterUniqueMembers = (members: TeamMember[], query: string) => {
        const seen = new Set<string>();
        const q = query.trim().toLowerCase();
        return members.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);

            if (!q) return true;
            return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
        });
    };

    const uniqueTeamMembers = useMemo(() => filterUniqueMembers(memberGroups.team, teamSearchQuery), [memberGroups.team, teamSearchQuery]);
    const uniqueVendorMembers = useMemo(() => filterUniqueMembers(memberGroups.vendor, vendorSearchQuery), [memberGroups.vendor, vendorSearchQuery]);

    const uniqueTeamPaymentRecords = useMemo(() => {
        const seen = new Set<string>();
        return teamPaymentRecords.filter(r => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
        });
    }, [teamPaymentRecords]);



    const handleSaveSignature = (signatureDataUrl: string) => {
        if (paymentSlipToView) {
            onSignPaymentRecord(paymentSlipToView.id, signatureDataUrl);
            setPaymentSlipToView(prev => prev ? { ...prev, vendorSignature: signatureDataUrl } : null);
        }
        setIsSignatureModalOpen(false);
    };

    const renderPaymentSlipBody = (record: TeamPaymentRecord) => {
        const member = teamMembers.find(m => m.id === record.teamMemberId);
        if (!member) return null;
        const projectsBeingPaid = teamProjectPayments.filter(p => record.projectPaymentIds.includes(p.id));

        return (
            <div id={`payment-slip-content-${record.id}`} className="printable-content bg-white font-sans text-slate-900 printable-area avoid-break shadow-2xl border border-slate-200">
                {/* Accent Border Top */}
                <div className="h-2 bg-brand-accent w-full"></div>

                <div className="p-8 sm:p-12">
                    {/* Header Section */}
                    <header className="flex justify-between items-start mb-12 pb-8 border-b border-slate-100">
                        <div className="flex flex-col gap-4">
                            {userProfile.logoBase64 ? (
                                <img src={userProfile.logoBase64} alt="Company Logo" className="h-16 sm:h-20 object-contain self-start" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-brand-accent flex items-center justify-center">
                                        <span className="text-white font-bold text-xl">{userProfile.companyName?.charAt(0) || 'V'}</span>
                                    </div>
                                    <h1 className="text-xl font-bold text-slate-800">{userProfile.companyName}</h1>
                                </div>
                            )}
                            <div className="text-[11px] leading-relaxed text-slate-500 max-w-[250px]">
                                <p className="font-bold text-slate-700">{userProfile.companyName}</p>
                                <p>{userProfile.address}</p>
                                <p>{userProfile.phone} • {userProfile.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-black text-brand-accent tracking-tighter mb-2">SLIP GAJI</h2>
                            <div className="inline-block bg-slate-100 px-3 py-1 rounded-sm text-[12px] font-bold text-slate-600 mb-3">
                                #{record.recordNumber}
                            </div>
                            <div className="text-[11px] text-slate-500">
                                <p>Tanggal Bayar: <span className="font-bold text-slate-700">{formatDate(record.date)}</span></p>
                                <p className="mt-1">Metode: <span className="font-bold text-slate-700 uppercase">Transfer Bank</span></p>
                            </div>
                        </div>
                    </header>

                    {/* Recipient & Payer Info */}
                    <div className="grid grid-cols-2 gap-8 mb-12">
                        <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Penerima (Vendor/Tim)</h4>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-slate-800">{member.name}</p>
                                <div className="text-[12px] text-slate-600 space-y-0.5">
                                    <p className="font-medium text-brand-accent">{member.role}</p>
                                    <p>No. Rek: <span className="font-bold">{member.noRek || '-'}</span></p>
                                    <p className="text-[10px] italic">{(member as any).bankName || ''}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Sumber Dana</h4>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-slate-800">{userProfile.companyName}</p>
                                <div className="text-[12px] text-slate-600 space-y-0.5">
                                    <p>Rekening Bisnis: <span className="font-bold">{userProfile.bankAccount || '-'}</span></p>
                                    <p className="text-[10px] italic">Verified Business Payment</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Items Table */}
                    <div className="mb-12">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Rincian Pekerjaan & Honor</h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b-2 border-slate-200">
                                    <th className="px-5 py-4 text-[11px] font-black text-slate-600 uppercase tracking-widest w-[60%]">Deskripsi Acara Pernikahan / Tugas</th>
                                    <th className="px-5 py-4 text-[11px] font-black text-slate-600 uppercase tracking-widest text-center w-[15%]">Peran</th>
                                    <th className="px-5 py-4 text-[11px] font-black text-slate-600 uppercase tracking-widest text-right w-[25%]">Jumlah Fee</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {projectsBeingPaid.map(p => {
                                    const project = projects.find(proj => proj.id === p.projectId);
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-5">
                                                <p className="font-bold text-slate-800">{project?.projectName || 'Acara Pernikahan Selesai'}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
                                                    ID Sesi: {p.id.slice(-8).toUpperCase()} • Selesai: {formatDate(project?.date)}
                                                </p>
                                            </td>
                                            <td className="px-5 py-5 text-center">
                                                <span className="inline-block px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase">
                                                    {project?.team.find(t => t.memberId === member.id)?.role || member.role}
                                                </span>
                                            </td>
                                            <td className="px-5 py-5 text-right font-bold text-slate-800">{formatCurrency(p.fee)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50/50 border-t-2 border-slate-200">
                                    <td colSpan={2} className="px-5 py-5 text-right">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Honor Bersih</span>
                                    </td>
                                    <td className="px-5 py-5 text-right">
                                        <p className="text-2xl font-black text-brand-accent tracking-tighter">{formatCurrency(record.totalAmount)}</p>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="flex justify-between items-end pt-12 border-t border-slate-100">
                        <div className="flex-1 max-w-[350px]">
                            <div className="bg-brand-accent/5 border border-brand-accent/10 p-4 rounded-lg mb-4">
                                <p className="text-[10px] text-brand-accent font-bold mb-1 uppercase tracking-tight">Catatan Transaksi:</p>
                                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                    Pembayaran ini bersifat final untuk rincian pekerjaan yang tertera di atas. Jika terdapat ketidaksesuaian, silakan hubungi tim administrasi dalam 2x24 jam.
                                </p>
                            </div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
                                Dicetak Otomatis oleh Sistem {userProfile.companyName}
                            </p>
                        </div>

                        <div className="text-center min-w-[180px]">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Verifikator,</p>
                            <div className="h-20 flex items-center justify-center mb-1">
                                {record.vendorSignature ? (
                                    <img src={record.vendorSignature} alt="Tanda Tangan" className="max-h-full object-contain" />
                                ) : userProfile.signatureBase64 ? (
                                    <img src={userProfile.signatureBase64} alt="Tanda Tangan" className="max-h-full object-contain" />
                                ) : (
                                    <div className="h-px w-24 bg-slate-200 mx-auto mt-10" />
                                )}
                            </div>
                            <p className="text-sm font-bold text-slate-800 underline underline-offset-4 decoration-slate-300">
                                ({userProfile.authorizedSigner || userProfile.companyName})
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-tighter">
                                {userProfile.companyName}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const handleDownloadPDF = async () => {
        if (!paymentSlipToView) return;
        const element = document.getElementById(`payment-slip-content-${paymentSlipToView.id}`);
        if (!element) return;

        const opt = {
            margin: 10,
            filename: `Slip-Gaji-${paymentSlipToView.recordNumber}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4' as const, orientation: 'portrait' as const }
        };

        const html2pdf = (await import('html2pdf.js')).default;
        html2pdf().set(opt).from(element).save();
    };

    const handleDownloadTeam = () => {
    const headers = ['Nama', 'Role', 'Kategori', 'Email', 'Telepon', 'No. Rekening', 'Fee Belum Dibayar', 'Rating'];
    const data = teamMembers.map(member => {
        const unpaidFee = teamProjectPaymentsInDateRange
            .filter(p => p.teamMemberId === member.id && p.status === 'Unpaid')
            .reduce((sum, p) => sum + p.fee, 0);
        return [
            `"${member.name.replace(/"/g, '""')}"`,
            member.role,
            member.category || 'Tim',
            member.email,
            member.phone,
            member.noRek || '-',
            unpaidFee,
            member.rating.toFixed(1)
        ];
    });
    downloadCSV(headers, data, `data-Tim / Vendor-${new Date().toISOString().split('T')[0]}.csv`);
};

const modalTitles: { [key: string]: string } = {
    'team-total': 'Daftar Semua Tim',
    'team-unpaid': 'Rincian Fee Tim Belum Dibayar',
    'team-topRated': 'Peringkat Tim',
    'team-events': 'Rincian Acara Pernikahan (Tim)',
    'team-payments': 'Rincian Pembayaran (Tim)',
    'team-performance': 'Rincian Kinerja (Tim)',
    'vendor-total': 'Daftar Semua Vendor',
    'vendor-unpaid': 'Rincian Fee Vendor Belum Dibayar',
    'vendor-topRated': 'Peringkat Vendor',
    'vendor-events': 'Rincian Acara Pernikahan (Vendor)',
    'vendor-payments': 'Rincian Pembayaran (Vendor)',
    'vendor-performance': 'Rincian Kinerja (Vendor)'
};

return (
    <div className="space-y-6">
        <PageHeader title="Manajemen Tim / Vendor" subtitle="Kelola semua data Tim / Vendor, Acara Pernikahan, dan pembayaran." icon={<UsersIcon className="w-6 h-6" />}>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 sm:gap-3 mt-4 sm:mt-0">
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-hidden">
                    <CalendarIcon className="w-4 h-4 text-brand-text-secondary flex-shrink-0" />
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 text-sm w-full sm:w-36" title="Dari tanggal" />
                </div>
                <span className="text-brand-text-secondary text-sm hidden sm:inline">–</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 text-sm w-full sm:w-36" title="Sampai tanggal" />
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-sm text-brand-text-secondary hover:text-brand-text-primary mt-1 sm:mt-0 w-full sm:w-auto text-center">Reset</button>
                <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary justify-center text-xs sm:text-sm py-2">Pelajari Halaman Ini</button>
                <button onClick={handleDownloadTeam} className="button-secondary inline-flex items-center justify-center gap-2 text-xs sm:text-sm py-2">
                    <DownloadIcon className="w-4 h-4" /> Unduh Data
                </button>
                <button onClick={() => handleOpenForm('add')} className="button-primary inline-flex items-center justify-center gap-2 text-xs sm:text-sm py-2">
                    <PlusIcon className="w-5 h-5" />
                    Tambah Tim / Vendor
                </button>
            </div>
        </PageHeader>

        <div className="space-y-8">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-brand-text-light">Tim</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6">
                    <div onClick={() => setActiveStatModal({ group: 'team', stat: 'total' })} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '100ms' }}>
                        <StatCard icon={<UsersIcon className="w-6 h-6" />} title="Total Tim" value={teamSectionStats.totalMembers.toString()} subtitle="Anggota tim" colorVariant="blue" />
                    </div>
                    <div onClick={() => setActiveStatModal({ group: 'team', stat: 'unpaid' })} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '200ms' }}>
                        <StatCard icon={<AlertCircleIcon className="w-6 h-6" />} title="Fee Tim Belum Lunas" value={teamSectionStats.totalUnpaid} subtitle="Tagihan tim" colorVariant="pink" />
                    </div>
                    <div onClick={() => setActiveStatModal({ group: 'team', stat: 'topRated' })} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '300ms' }}>
                        <StatCard icon={<UserCheckIcon className="w-6 h-6" />} title="Top Tim" value={teamSectionStats.topRatedName} subtitle={`Rating: ${teamSectionStats.topRatedRating}`} colorVariant="green" />
                    </div>

                    <div className="widget-animate" style={{ animationDelay: '400ms' }}>
                        <div onClick={() => setActiveStatModal({ group: 'team', stat: 'events' })} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                            <StatCard icon={<CalendarIcon className="w-6 h-6" />} title="Acara Pernikahan" value={teamSectionStats.totalWeddingEvents.toString()} subtitle="Event terkait" colorVariant="purple" />
                        </div>
                    </div>
                    <div className="widget-animate" style={{ animationDelay: '500ms' }}>
                        <div onClick={() => setActiveStatModal({ group: 'team', stat: 'payments' })} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                            <StatCard icon={<DollarSignIcon className="w-6 h-6" />} title="Pembayaran Tim" value={teamSectionStats.totalPaid} subtitle={`Paid: ${teamSectionStats.totalPaidCount} | Unpaid: ${teamSectionStats.totalUnpaidCount}`} colorVariant="default" />
                        </div>
                    </div>
                    <div className="widget-animate" style={{ animationDelay: '600ms' }}>
                        <div onClick={() => setActiveStatModal({ group: 'team', stat: 'performance' })} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                            <StatCard icon={<StarIcon className="w-6 h-6" />} title="Kinerja Tim" value={teamSectionStats.avgRating} subtitle={`Catatan: ${teamSectionStats.performanceNotesCount}`} colorVariant="orange" />
                        </div>
                    </div>
                </div>

                <div className="bg-brand-surface/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                    <div className="relative flex-grow max-w-md">
                        <input
                            type="text"
                            placeholder="Cari nama atau posisi..."
                            value={teamSearchQuery}
                            onChange={(e) => setTeamSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-brand-text-light focus:outline-none focus:border-brand-accent/50 transition-all pl-10"
                        />
                        <UsersIcon className="w-4 h-4 text-brand-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="bg-brand-surface/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/10 transition-all duration-300">
                    <div className="md:hidden space-y-3">
                        {uniqueTeamMembers.map(member => {
                            const unpaidFee = teamProjectPaymentsInDateRange.filter(p => p.teamMemberId === member.id && p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);

                            return (
                                <div key={member.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5 shadow-lg group hover:border-brand-accent/50 transition-all duration-300">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-brand-text-light leading-tight">{member.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[11px] text-brand-text-secondary">{member.role}</p>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${member.category === 'Vendor' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                    {member.category || 'Tim'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right text-xs">
                                            <div className="inline-flex items-center gap-1 bg-brand-bg px-2 py-1 rounded-full"><StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-current" />{member.rating.toFixed(1)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                                        <span className="text-brand-text-secondary">Fee Belum Dibayar</span>
                                        <span className="text-right font-semibold text-red-400">{formatCurrency(unpaidFee)}</span>
                                    </div>
                                    <div className="mt-3 flex justify-end gap-2">
                                        <button onClick={() => handleViewDetails(member)} className="button-secondary !text-xs !px-3 !py-2">Detail</button>
                                        <button onClick={() => handleOpenForm('edit', member)} className="button-secondary !text-xs !px-3 !py-2">Edit</button>
                                        <button onClick={() => handleDelete(member.id)} className="button-secondary !text-xs !px-3 !py-2">Hapus</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-brand-text-secondary uppercase"><tr><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Vendor / Tim</th><th className="px-4 py-3">Fee Belum Dibayar</th><th className="px-4 py-3 text-center">Rating</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead>
                            <tbody className="divide-y divide-brand-border">
                                {uniqueTeamMembers.map(member => {
                                    const unpaidFee = teamProjectPaymentsInDateRange.filter(p => p.teamMemberId === member.id && p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);
                                    return (
                                        <tr key={member.id} className="hover:bg-brand-surface/50 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-brand-text-light">{member.name}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-brand-text-primary font-medium">{member.role}</span>
                                                    <span className={`text-[10px] w-fit px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${member.category === 'Vendor' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                        {member.category || 'Tim'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-red-400">{formatCurrency(unpaidFee)}</td>
                                            <td className="px-4 py-3"><div className="flex justify-center items-center gap-1"><StarIcon className="w-4 h-4 text-yellow-400 fill-current" />{member.rating.toFixed(1)}</div></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <button onClick={() => handleViewDetails(member)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Detail"><EyeIcon className="w-5 h-5" /></button>
                                                    <button onClick={() => handleOpenForm('edit', member)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-5 h-5" /></button>
                                                    <button onClick={() => handleDelete(member.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-5 h-5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-brand-text-light">Vendor</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6">
                    <div onClick={() => setActiveStatModal({ group: 'vendor', stat: 'total' })} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '100ms' }}>
                        <StatCard icon={<UsersIcon className="w-6 h-6" />} title="Total Vendor" value={vendorSectionStats.totalMembers.toString()} subtitle="Vendor terdaftar" colorVariant="blue" />
                    </div>
                    <div onClick={() => setActiveStatModal({ group: 'vendor', stat: 'unpaid' })} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '200ms' }}>
                        <StatCard icon={<AlertCircleIcon className="w-6 h-6" />} title="Fee Vendor Belum Lunas" value={vendorSectionStats.totalUnpaid} subtitle="Tagihan vendor" colorVariant="pink" />
                    </div>
                    <div onClick={() => setActiveStatModal({ group: 'vendor', stat: 'topRated' })} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '300ms' }}>
                        <StatCard icon={<UserCheckIcon className="w-6 h-6" />} title="Top Vendor" value={vendorSectionStats.topRatedName} subtitle={`Rating: ${vendorSectionStats.topRatedRating}`} colorVariant="green" />
                    </div>

                    <div className="widget-animate" style={{ animationDelay: '400ms' }}>
                        <div onClick={() => setActiveStatModal({ group: 'vendor', stat: 'events' })} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                            <StatCard icon={<CalendarIcon className="w-6 h-6" />} title="Acara Pernikahan" value={vendorSectionStats.totalWeddingEvents.toString()} subtitle="Event terkait" colorVariant="purple" />
                        </div>
                    </div>
                    <div className="widget-animate" style={{ animationDelay: '500ms' }}>
                        <div onClick={() => setActiveStatModal({ group: 'vendor', stat: 'payments' })} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                            <StatCard icon={<DollarSignIcon className="w-6 h-6" />} title="Pembayaran Vendor" value={vendorSectionStats.totalPaid} subtitle={`Paid: ${vendorSectionStats.totalPaidCount} | Unpaid: ${vendorSectionStats.totalUnpaidCount}`} colorVariant="default" />
                        </div>
                    </div>
                    <div className="widget-animate" style={{ animationDelay: '600ms' }}>
                        <div onClick={() => setActiveStatModal({ group: 'vendor', stat: 'performance' })} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                            <StatCard icon={<StarIcon className="w-6 h-6" />} title="Kinerja Vendor" value={vendorSectionStats.avgRating} subtitle={`Catatan: ${vendorSectionStats.performanceNotesCount}`} colorVariant="orange" />
                        </div>
                    </div>
                </div>

                <div className="bg-brand-surface/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                    <div className="relative flex-grow max-w-md">
                        <input
                            type="text"
                            placeholder="Cari nama atau posisi..."
                            value={vendorSearchQuery}
                            onChange={(e) => setVendorSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-brand-text-light focus:outline-none focus:border-brand-accent/50 transition-all pl-10"
                        />
                        <UsersIcon className="w-4 h-4 text-brand-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="bg-brand-surface/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/10 transition-all duration-300">
                    <div className="md:hidden space-y-3">
                        {uniqueVendorMembers.map(member => {
                            const unpaidFee = teamProjectPaymentsInDateRange.filter(p => p.teamMemberId === member.id && p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);

                            return (
                                <div key={member.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5 shadow-lg group hover:border-brand-accent/50 transition-all duration-300">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-brand-text-light leading-tight">{member.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[11px] text-brand-text-secondary">{member.role}</p>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${member.category === 'Vendor' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                    {member.category || 'Tim'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right text-xs">
                                            <div className="inline-flex items-center gap-1 bg-brand-bg px-2 py-1 rounded-full"><StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-current" />{member.rating.toFixed(1)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                                        <span className="text-brand-text-secondary">Fee Belum Dibayar</span>
                                        <span className="text-right font-semibold text-red-400">{formatCurrency(unpaidFee)}</span>
                                    </div>
                                    <div className="mt-3 flex justify-end gap-2">
                                        <button onClick={() => handleViewDetails(member)} className="button-secondary !text-xs !px-3 !py-2">Detail</button>
                                        <button onClick={() => handleOpenForm('edit', member)} className="button-secondary !text-xs !px-3 !py-2">Edit</button>
                                        <button onClick={() => handleDelete(member.id)} className="button-secondary !text-xs !px-3 !py-2">Hapus</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-brand-text-secondary uppercase"><tr><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Vendor / Tim</th><th className="px-4 py-3">Fee Belum Dibayar</th><th className="px-4 py-3 text-center">Rating</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead>
                            <tbody className="divide-y divide-brand-border">
                                {uniqueVendorMembers.map(member => {
                                    const unpaidFee = teamProjectPaymentsInDateRange.filter(p => p.teamMemberId === member.id && p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);
                                    return (
                                        <tr key={member.id} className="hover:bg-brand-surface/50 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-brand-text-light">{member.name}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-brand-text-primary font-medium">{member.role}</span>
                                                    <span className={`text-[10px] w-fit px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${member.category === 'Vendor' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                        {member.category || 'Tim'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-red-400">{formatCurrency(unpaidFee)}</td>
                                            <td className="px-4 py-3"><div className="flex justify-center items-center gap-1"><StarIcon className="w-4 h-4 text-yellow-400 fill-current" />{member.rating.toFixed(1)}</div></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <button onClick={() => handleViewDetails(member)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Detail"><EyeIcon className="w-5 h-5" /></button>
                                                    <button onClick={() => handleOpenForm('edit', member)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-5 h-5" /></button>
                                                    <button onClick={() => handleDelete(member.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-5 h-5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Widget 1: Komposisi */}
            <div className="bg-brand-surface/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10 flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gradient mb-5 flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-blue-400" /> Komposisi Tim
                    </h3>
                    <div className="space-y-4">
                        {(() => {
                            const timCount = teamMembers.filter(m => m.category !== 'Vendor').length;
                            const vendorCount = teamMembers.filter(m => m.category === 'Vendor').length;
                            const total = timCount + vendorCount || 1;
                            return (
                                <>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-brand-text-secondary text-[10px] font-bold uppercase tracking-widest">Internal</span>
                                            <span className="text-lg font-black text-blue-400">{timCount}</span>
                                        </div>
                                        <div className="w-full bg-slate-900/50 h-2.5 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(timCount / total) * 100}%`, backgroundColor: '#3b82f6' }}></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-brand-text-secondary text-[10px] font-bold uppercase tracking-widest">Vendor</span>
                                            <span className="text-lg font-black text-orange-400">{vendorCount}</span>
                                        </div>
                                        <div className="w-full bg-slate-900/50 h-2.5 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${(vendorCount / total) * 100}%`, backgroundColor: '#f97316' }}></div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Widget 2: Performa */}
            <div className="bg-brand-surface/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10">
                <h3 className="text-sm font-bold text-gradient mb-5 flex items-center gap-2">
                    <HistoryIcon className="w-5 h-5 text-brand-accent" /> Performa Tim
                </h3>
                <div className="space-y-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center group">
                        <div>
                            <p className="text-[9px] text-brand-text-secondary font-bold uppercase tracking-tighter">Total Payout</p>
                            <p className="text-lg font-black text-brand-text-light">{teamStats.totalPayout}</p>
                        </div>
                        <DollarSignIcon className="w-6 h-6 text-brand-text-secondary/20 group-hover:text-brand-accent/20" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[9px] text-brand-text-secondary font-bold uppercase tracking-tighter">Selesai</p>
                            <p className="text-lg font-black text-brand-text-light">{teamStats.totalProjectsHandled}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[9px] text-brand-text-secondary font-bold uppercase tracking-tighter">Rating</p>
                            <div className="flex items-center gap-1.5">
                                <p className="text-lg font-black text-yellow-400">{teamStats.avgRating}</p>
                                <StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Widget 3: Tren */}
            <div className="bg-brand-surface/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10">
                <div className="flex justify-between items-start mb-5">
                    <h3 className="text-sm font-bold text-gradient flex items-center gap-2">
                        <DollarSignIcon className="w-5 h-5" /> Tren
                    </h3>
                    <div className="text-right">
                        <p className="text-[9px] text-brand-text-secondary font-bold uppercase">6 Bulan</p>
                        <p className="text-sm font-black text-brand-accent">
                            {(() => {
                                const now = new Date();
                                const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                                const total = teamPaymentRecords
                                    .filter(r => new Date(r.date) >= sixMonthsAgo)
                                    .reduce((sum, r) => sum + r.totalAmount, 0);
                                return formatCurrency(total);
                            })()}
                        </p>
                    </div>
                </div>
                <div className="h-24 flex items-end gap-2 px-1">
                    {(() => {
                        const now = new Date();
                        const months: { name: string; year: number; month: number; total: number }[] = [];
                        for (let i = 5; i >= 0; i--) {
                            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                            months.push({
                                name: d.toLocaleString('id-ID', { month: 'short' }),
                                year: d.getFullYear(),
                                month: d.getMonth(),
                                total: 0
                            });
                        }
                        teamPaymentRecords.forEach(r => {
                            const rd = new Date(r.date);
                            const m = months.find(mo => mo.month === rd.getMonth() && mo.year === rd.getFullYear());
                            if (m) m.total += r.totalAmount;
                        });
                        const maxVal = Math.max(...months.map(m => m.total), 1);
                        return months.map((m, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center group relative">
                                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-accent text-white text-[9px] py-1 px-2 rounded-lg shadow-2xl z-20 whitespace-nowrap font-bold">
                                    {formatCurrency(m.total)}
                                </div>
                                <div className="w-full rounded-t-lg transition-all duration-300"
                                    style={{
                                        height: `${(m.total / maxVal) * 100}%`,
                                        minHeight: '4px',
                                        background: m.total > 0 ? 'linear-gradient(to top, #6366f1, #818cf8)' : '#1e293b',
                                        boxShadow: m.total > 0 ? '0 0 10px rgba(99,102,241,0.3)' : 'none'
                                    }}>
                                </div>
                                <span className="text-[9px] font-bold text-brand-text-secondary mt-2">{m.name}</span>
                            </div>
                        ));
                    })()}
                </div>
            </div>
        </div>

        <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Panduan Halaman Tim / Vendor">
            <div className="space-y-4 text-sm text-brand-text-primary">
                <p>Halaman ini adalah pusat untuk semua hal yang berkaitan dengan tim Tim / Vendor Anda.</p>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Tambah & Edit:</strong> Gunakan tombol di kanan atas untuk menambahkan Tim / Vendor baru atau klik ikon pensil di tabel untuk mengedit data yang ada.</li>
                    <li><strong>Lihat Detail (<EyeIcon className="w-4 h-4 inline-block" />):</strong> Buka panel detail untuk melihat semua Acara Pernikahan yang dikerjakan, riwayat pembayaran, dan catatan kinerja.</li>
                    <li><strong>Kelola Pembayaran:</strong> Di panel detail, Anda dapat memilih Acara Pernikahan yang belum dibayar, membuat slip pembayaran, dan mencatat transaksi pembayaran.</li>
                    <li><strong>Kinerja:</strong> Berikan peringkat, tambahkan catatan kinerja untuk setiap Tim / Vendor di tab masing-masing pada panel detail.</li>
                    <li><strong>Bagikan Portal:</strong> Setiap Tim / Vendor memiliki portal pribadi. Bagikan tautan unik melalui panel detail agar mereka dapat melihat jadwal dan tugas revisi mereka.</li>
                </ul>
            </div>
        </Modal>

        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formMode === 'add' ? 'Tambah Tim / Vendor' : 'Edit Tim / Vendor'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                        <UsersIcon className="w-4 h-4" />
                        Informasi Tim / Vendor
                    </h4>
                    <p className="text-xs text-brand-text-secondary">
                        Tambahkan data lengkap Tim / Vendor yang akan bekerja sama dengan Anda. Data ini akan digunakan untuk manajemen Acara Pernikahan dan pembayaran.
                    </p>
                </div>

                <div>
                    <h5 className="text-sm font-semibold text-brand-text-light mb-3">Data Pribadi</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="input-group">
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="name" className="input-label">Nama Pengantin</label>
                            <p className="text-xs text-brand-text-secondary mt-1">Nama Pengantin Tim / Vendor</p>
                        </div>
                        <div className="input-group">
                            <input type="text" id="role" name="role" value={formData.role} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="role" className="input-label">Role/Posisi</label>
                            <p className="text-xs text-brand-text-secondary mt-1">Contoh: Make-Up Artist, Dekorator, Musisi</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h5 className="text-sm font-semibold text-brand-text-light mb-3">Kontak</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="input-group">
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="email" className="input-label">Email</label>
                            <p className="text-xs text-brand-text-secondary mt-1">Email untuk komunikasi dan akses portal</p>
                        </div>
                        <div className="input-group">
                            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="phone" className="input-label">Nomor Telepon</label>
                            <p className="text-xs text-brand-text-secondary mt-1">Nomor WhatsApp/telepon aktif</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h5 className="text-sm font-semibold text-brand-text-light mb-3">Informasi Pembayaran</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="input-group">
                            <RupiahInput id="standardFee" value={formData.standardFee.toString()} onChange={(raw) => setFormData(prev => ({ ...prev, standardFee: Number(raw) }))} className="input-field" placeholder=" " required />
                            <label htmlFor="standardFee" className="input-label">Fee Standar (IDR)</label>
                            <p className="text-xs text-brand-text-secondary mt-1">Fee default per Acara Pernikahan dalam Rupiah</p>
                        </div>
                        <div className="input-group">
                            <input type="text" id="noRek" name="noRek" value={formData.noRek} onChange={handleFormChange} className="input-field" placeholder=" " />
                            <label htmlFor="noRek" className="input-label">Nomor Rekening</label>
                            <p className="text-xs text-brand-text-secondary mt-1">Untuk transfer pembayaran (opsional)</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h5 className="text-sm font-semibold text-brand-text-light mb-3">Kategori</h5>
                    <div className="input-group">
                        <select
                            id="category"
                            name="category"
                            value={formData.category} // @ts-ignore
                            onChange={handleFormChange}
                            className="input-field"
                        >
                            <option value="Tim">Tim Internal</option>
                            <option value="Vendor">Vendor Eksternal</option>
                        </select>
                        <label htmlFor="category" className="input-label">Pilih Kategori</label>
                        <p className="text-xs text-brand-text-secondary mt-1">Pilih "Tim" untuk tim internal Anda, atau "Vendor" untuk pihak ketiga.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-brand-border">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="button-secondary w-full sm:w-auto">Batal</button>
                    <button type="submit" className="button-primary w-full sm:w-auto">{formMode === 'add' ? 'Simpan' : 'Update'}</button>
                </div>
            </form>
        </Modal>

        {selectedMember && <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Detail Tim / Vendor: ${selectedMember.name}`} size="4xl">
            <div className="flex flex-col h-full">
                {/* Vendor Snapshot Cards (Suggested Feature) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 non-printable">
                    <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
                        <p className="text-xs text-brand-text-secondary uppercase font-bold mb-1">Total Acara Pernikahan</p>
                        <p className="text-2xl font-bold text-gradient">
                            {teamProjectPayments.filter(p => p.teamMemberId === selectedMember.id && p.status === 'Paid').length}
                        </p>
                        <p className="text-[10px] text-brand-text-secondary mt-1">Selesai Dibayar</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
                        <p className="text-xs text-brand-text-secondary uppercase font-bold mb-1">Total Pendapatan</p>
                        <p className="text-2xl font-bold text-gradient">
                            {formatCurrency(teamProjectPayments.filter(p => p.teamMemberId === selectedMember.id && p.status === 'Paid').reduce((sum, p) => sum + p.fee, 0))}
                        </p>
                        <p className="text-[10px] text-brand-text-secondary mt-1">Lifetime Earnings</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
                        <p className="text-xs text-brand-text-secondary uppercase font-bold mb-1">Rating Performansi</p>
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-gradient">{selectedMember.rating.toFixed(1)}</p>
                            <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                        </div>
                        <p className="text-[10px] text-brand-text-secondary mt-1">Berdasarkan feedback</p>
                    </div>
                </div>

                {/* Desktop Tab Navigation - Top */}
                <div className="hidden md:block mb-6">
                    <nav className="flex space-x-2 overflow-x-auto p-1 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 w-fit">
                        <button onClick={() => setDetailTab('projects')} className={`shrink-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${detailTab === 'projects' || detailTab === 'create-payment' ? 'bg-brand-accent text-white shadow-md' : 'text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5'}`}><FileTextIcon className="w-4 h-4" />Acara Pernikahan</button>
                        <button onClick={() => setDetailTab('payments')} className={`shrink-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${detailTab === 'payments' ? 'bg-brand-accent text-white shadow-md' : 'text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5'}`}><HistoryIcon className="w-4 h-4" />Pembayaran</button>
                        <button onClick={() => setDetailTab('performance')} className={`shrink-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${detailTab === 'performance' ? 'bg-brand-accent text-white shadow-md' : 'text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5'}`}><StarIcon className="w-4 h-4" />Kinerja</button>

                        <button onClick={() => handleOpenQrModal(selectedMember)} className={`shrink-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5`}><Share2Icon className="w-4 h-4" />Portal</button>
                    </nav>
                </div>

                {/* Mobile Tab Navigation - Top Pills */}
                <div className="md:hidden mb-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide py-1">
                        <button
                            onClick={() => setDetailTab('projects')}
                            className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${detailTab === 'projects' || detailTab === 'create-payment'
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30 scale-105'
                                : 'bg-white/5 backdrop-blur-md text-brand-text-secondary border border-white/10 hover:bg-white/10 active:scale-95'
                                }`}
                        >
                            <FileTextIcon className="w-4 h-4" />
                            <span>Acara Pernikahan</span>
                        </button>
                        <button
                            onClick={() => setDetailTab('payments')}
                            className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${detailTab === 'payments'
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30 scale-105'
                                : 'bg-white/5 backdrop-blur-md text-brand-text-secondary border border-white/10 hover:bg-white/10 active:scale-95'
                                }`}
                        >
                            <HistoryIcon className="w-4 h-4" />
                            <span>Pembayaran</span>
                        </button>
                        <button
                            onClick={() => setDetailTab('performance')}
                            className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${detailTab === 'performance'
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30 scale-105'
                                : 'bg-white/5 backdrop-blur-md text-brand-text-secondary border border-white/10 hover:bg-white/10 active:scale-95'
                                }`}
                        >
                            <StarIcon className="w-4 h-4" />
                            <span>Kinerja</span>
                        </button>
                        <button
                            onClick={() => handleOpenQrModal(selectedMember)}
                            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 bg-white/5 backdrop-blur-md text-brand-text-secondary border border-white/10 hover:bg-white/10 active:scale-95"
                        >
                            <Share2Icon className="w-4 h-4" />
                            <span>Portal</span>
                        </button>
                    </div>
                </div>

                <div className="pt-0 md:pt-5 max-h-[65vh] overflow-y-auto pr-2 pb-4">
                    {detailTab === 'projects' && <FreelancerProjects unpaidProjects={selectedMemberUnpaidProjects} projectsToPay={projectsToPay} onToggleProject={(id) => setProjectsToPay(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])} onProceedToPayment={handleCreatePayment} projects={projectsInDateRange} />}
                    {detailTab === 'payments' && <div className="tab-content-mobile">
                        <h4 className="text-sm md:text-base font-semibold text-brand-text-light mb-4">Riwayat Pembayaran</h4>
                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {uniqueTeamPaymentRecords.filter(r => r.teamMemberId === selectedMember.id).map(record => (
                                <div key={record.id} className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-brand-text-light">No: {record.recordNumber}</p>
                                            <p className="text-[11px] text-brand-text-secondary mt-0.5">{formatDate(record.date)}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-brand-success">{formatCurrency(record.totalAmount)}</p>
                                    </div>
                                    {expandedRecordId === record.id && (
                                        <div className="mt-3 bg-brand-bg rounded-lg p-3">
                                            <p className="text-sm font-medium mb-2 text-brand-text-light">Acara Pernikahan yang dibayar:</p>
                                            <ul className="list-disc list-inside text-sm space-y-1 pl-4">
                                                {record.projectPaymentIds.map(paymentId => {
                                                    const payment = teamProjectPayments.find(p => p.id === paymentId);
                                                    const project = projects.find(p => p.id === payment?.projectId);
                                                    return (
                                                        <li key={paymentId} className="text-brand-text-primary">{project?.projectName || 'Acara Pernikahan tidak ditemukan'} - <span className="font-semibold">{formatCurrency(payment?.fee || 0)}</span></li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="mt-3 flex justify-end gap-2">
                                        <button onClick={() => setExpandedRecordId(expandedRecordId === record.id ? null : record.id)} className="button-secondary !text-xs !px-3 !py-2">{expandedRecordId === record.id ? 'Tutup' : 'Rincian'}</button>
                                        <button onClick={() => setPaymentSlipToView(record)} className="button-secondary !text-xs !px-3 !py-2">Slip</button>
                                    </div>
                                </div>
                            ))}
                            {uniqueTeamPaymentRecords.filter(r => r.teamMemberId === selectedMember.id).length === 0 && (
                                <p className="text-center text-brand-text-secondary py-8">Tidak ada riwayat pembayaran untuk Tim / Vendor ini.</p>
                            )}
                        </div>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto border border-brand-border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-brand-bg text-xs text-brand-text-secondary uppercase">
                                    <tr>
                                        <th className="px-4 py-3 text-left">No. Pembayaran</th>
                                        <th className="px-4 py-3 text-left">Tanggal</th>
                                        <th className="px-4 py-3 text-right">Jumlah</th>
                                        <th className="px-4 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {uniqueTeamPaymentRecords.filter(r => r.teamMemberId === selectedMember.id).map(record => (
                                        <React.Fragment key={record.id}>
                                            <tr>
                                                <td className="px-4 py-3 font-mono text-brand-text-secondary">{record.recordNumber}</td>
                                                <td className="px-4 py-3 text-brand-text-primary">{formatDate(record.date)}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-brand-success">{formatCurrency(record.totalAmount)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => setExpandedRecordId(expandedRecordId === record.id ? null : record.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title={expandedRecordId === record.id ? 'Tutup Rincian' : 'Lihat Rincian'}><EyeIcon className="w-5 h-5" /></button>
                                                        <button onClick={() => setPaymentSlipToView(record)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Lihat Slip Pembayaran"><FileTextIcon className="w-5 h-5" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedRecordId === record.id && (
                                                <tr className="bg-brand-bg">
                                                    <td colSpan={4} className="p-4">
                                                        <p className="text-sm font-medium mb-2 text-brand-text-light">Acara Pernikahan yang dibayar:</p>
                                                        <ul className="list-disc list-inside text-sm space-y-1 pl-4">
                                                            {record.projectPaymentIds.map(paymentId => {
                                                                const payment = teamProjectPayments.find(p => p.id === paymentId);
                                                                const project = projects.find(p => p.id === payment?.projectId);
                                                                return (
                                                                    <li key={paymentId} className="text-brand-text-primary">
                                                                        {project?.projectName || 'Acara Pernikahan tidak ditemukan'} - <span className="font-semibold">{formatCurrency(payment?.fee || 0)}</span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>}
                    {detailTab === 'performance' && <PerformanceTab member={selectedMember} onSetRating={handleSetRating} newNote={newNote} setNewNote={setNewNote} newNoteType={newNoteType} setNewNoteType={setNewNoteType} onAddNote={handleAddNote} onDeleteNote={handleDeleteNote} />}

                    {detailTab === 'create-payment' && selectedMember && (
                        <CreatePaymentTab
                            member={selectedMember}
                            paymentDetails={{
                                projects: selectedMemberUnpaidProjects.filter(p => projectsToPay.includes(p.id)),
                                total: typeof paymentAmount === 'number' ? paymentAmount : 0
                            }}
                            paymentAmount={paymentAmount}
                            setPaymentAmount={setPaymentAmount}
                            isInstallment={isInstallment}
                            setIsInstallment={setIsInstallment}
                            onPay={handlePay}
                            onSetTab={() => setDetailTab('projects')}
                            renderPaymentDetailsContent={() => renderPaymentSlipBody({ id: `TEMP-${Date.now()}`, recordNumber: `PAY-FR-${selectedMember.id.slice(-4)}-${Date.now()}`, teamMemberId: selectedMember.id, date: new Date().toISOString(), projectPaymentIds: projectsToPay, totalAmount: typeof paymentAmount === 'number' ? paymentAmount : 0 })}
                            cards={cards}
                            monthlyBudgetPocket={monthlyBudgetPocket}
                            paymentSourceId={paymentSourceId}
                            setPaymentSourceId={setPaymentSourceId}
                            onSign={() => { setIsSignatureModalOpen(true); }}
                        />
                    )}
                </div>
            </div>
        </Modal>}

        {paymentSlipToView && (
            <Modal isOpen={!!paymentSlipToView} onClose={() => setPaymentSlipToView(null)} title={`Slip Pembayaran: ${paymentSlipToView.recordNumber}`} size="3xl">
                <div className="printable-area">
                    {renderPaymentSlipBody(paymentSlipToView)}
                </div>
                <div className="mt-6 text-right non-printable space-x-2">
                    <button type="button" onClick={() => {
                        setIsSignatureModalOpen(true);
                    }} className="button-secondary inline-flex items-center gap-2">
                        <PencilIcon className="w-4 h-4" />
                        {userProfile?.signatureBase64 ? 'Ganti TTD Manual' : 'Bubuhkan TTD'}
                    </button>
                    <button type="button" onClick={handleDownloadPDF} className="button-primary inline-flex items-center gap-2 px-6">
                        <DownloadIcon className="w-5 h-5" />
                        Unduh PDF
                    </button>
                </div>
            </Modal>
        )}

        {isSignatureModalOpen && (
            <Modal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} title="Bubuhkan Tanda Tangan Anda">
                <SignaturePad onClose={() => setIsSignatureModalOpen(false)} onSave={handleSaveSignature} />
            </Modal>
        )}

        <Modal isOpen={!!activeStatModal} onClose={() => setActiveStatModal(null)} title={activeStatModal ? modalTitles[`${activeStatModal.group}-${activeStatModal.stat}`] : ''} size="3xl">
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {activeStatModal?.stat === 'total' && (
                    <div className="space-y-3">
                        {(activeStatModal.group === 'team' ? uniqueTeamMembers : uniqueVendorMembers).map(member => (
                            <div key={member.id} className="p-3 bg-brand-bg rounded-lg">
                                <p className="font-semibold text-brand-text-light">{member.name}</p>
                                <p className="text-sm text-brand-text-secondary">{member.role}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeStatModal?.stat === 'unpaid' && (
                    <div className="space-y-3">
                        {(() => {
                            const memberIds = new Set(
                                (activeStatModal.group === 'team' ? memberGroups.team : memberGroups.vendor).map(m => m.id)
                            );
                            const unpaid = teamProjectPaymentsInDateRange.filter(p => p.status === 'Unpaid' && memberIds.has(p.teamMemberId));
                            if (unpaid.length === 0) return <p className="text-center py-8 text-brand-text-secondary">Tidak ada fee yang belum dibayar.</p>;
                            return unpaid.map(payment => (
                                <div key={payment.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{payment.teamMemberName}</p>
                                        <p className="text-sm text-brand-text-secondary">Acara Pernikahan: {projects.find(proj => proj.id === payment.projectId)?.projectName || 'N/A'}</p>
                                    </div>
                                    <p className="font-semibold text-brand-danger">{formatCurrency(payment.fee)}</p>
                                </div>
                            ));
                        })()}
                    </div>
                )}

                {activeStatModal?.stat === 'topRated' && (
                    <div className="space-y-3">
                        {[...(activeStatModal.group === 'team' ? memberGroups.team : memberGroups.vendor)]
                            .sort((a, b) => b.rating - a.rating)
                            .map(member => (
                                <div key={member.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{member.name}</p>
                                        <p className="text-sm text-brand-text-secondary">{member.role}</p>
                                    </div>
                                    <div className="flex items-center gap-1 font-semibold text-brand-text-light"><StarIcon className="w-4 h-4 text-yellow-400 fill-current" />{member.rating.toFixed(1)}</div>
                                </div>
                            ))}
                    </div>
                )}

                {activeStatModal?.stat === 'events' && (
                    <div className="space-y-3">
                        {(() => {
                            const memberIds = new Set(
                                (activeStatModal.group === 'team' ? memberGroups.team : memberGroups.vendor).map(m => m.id)
                            );
                            const payments = teamProjectPaymentsInDateRange.filter(p => memberIds.has(p.teamMemberId));
                            const projectIds = new Set(payments.map(p => p.projectId));
                            const relatedProjects = projectsInDateRange
                                .filter(p => projectIds.has(p.id))
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                            if (relatedProjects.length === 0) return <p className="text-center py-8 text-brand-text-secondary">Belum ada acara terkait.</p>;

                            return relatedProjects.map(p => (
                                <div key={p.id} className="p-3 bg-brand-bg rounded-lg">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-brand-text-light">{p.projectName}</p>
                                            <p className="text-sm text-brand-text-secondary">{p.clientName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-brand-text-secondary">{formatDate(p.date)}</p>
                                            <p className="text-xs text-brand-text-secondary">{p.location}</p>
                                        </div>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}

                {activeStatModal?.stat === 'payments' && (
                    <div className="space-y-4">
                        {(() => {
                            const memberIds = new Set(
                                (activeStatModal.group === 'team' ? memberGroups.team : memberGroups.vendor).map(m => m.id)
                            );
                            const payments = teamProjectPaymentsInDateRange
                                .filter(p => memberIds.has(p.teamMemberId))
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                            if (payments.length === 0) return <p className="text-center py-8 text-brand-text-secondary">Belum ada data pembayaran.</p>;

                            const paid = payments.filter(p => p.status === 'Paid');
                            const unpaid = payments.filter(p => p.status === 'Unpaid');
                            const totalPaid = paid.reduce((sum, p) => sum + p.fee, 0);
                            const totalUnpaid = unpaid.reduce((sum, p) => sum + p.fee, 0);
                            const projectMap = new Map(projects.map(p => [p.id, p] as const));

                            return (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 bg-brand-bg rounded-lg">
                                            <p className="text-xs text-brand-text-secondary">Total Paid</p>
                                            <p className="font-bold text-brand-text-light">{formatCurrency(totalPaid)}</p>
                                            <p className="text-xs text-brand-text-secondary mt-1">Item: {paid.length}</p>
                                        </div>
                                        <div className="p-3 bg-brand-bg rounded-lg">
                                            <p className="text-xs text-brand-text-secondary">Total Unpaid</p>
                                            <p className="font-bold text-brand-text-light">{formatCurrency(totalUnpaid)}</p>
                                            <p className="text-xs text-brand-text-secondary mt-1">Item: {unpaid.length}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {payments.slice(0, 100).map(pay => {
                                            const prj = projectMap.get(pay.projectId);
                                            return (
                                                <div key={pay.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-start gap-3">
                                                    <div>
                                                        <p className="font-semibold text-brand-text-light">{pay.teamMemberName}</p>
                                                        <p className="text-sm text-brand-text-secondary">Acara Pernikahan: {prj ? prj.projectName : 'N/A'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClass(pay.status)}`}>{pay.status}</span>
                                                        <p className="font-semibold text-brand-text-light mt-1">{formatCurrency(pay.fee)}</p>
                                                        <p className="text-xs text-brand-text-secondary">{formatDate(pay.date)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {payments.length > 100 && (
                                            <p className="text-center text-xs text-brand-text-secondary pt-2">Menampilkan 100 data terbaru dari {payments.length} total data.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {activeStatModal?.stat === 'performance' && (
                    <div className="space-y-4">
                        {(() => {
                            const members = activeStatModal.group === 'team' ? memberGroups.team : memberGroups.vendor;
                            if (members.length === 0) return <p className="text-center py-8 text-brand-text-secondary">Belum ada data kinerja.</p>;
                            const avg = members.reduce((sum, m) => sum + (m.rating || 0), 0) / members.length;
                            const notesCount = members.reduce((sum, m) => sum + (m.performanceNotes?.length || 0), 0);
                            const sorted = [...members].sort((a, b) => (b.rating || 0) - (a.rating || 0));

                            return (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 bg-brand-bg rounded-lg">
                                            <p className="text-xs text-brand-text-secondary">Rating Rata-rata</p>
                                            <p className="font-bold text-brand-text-light">{avg.toFixed(1)}</p>
                                        </div>
                                        <div className="p-3 bg-brand-bg rounded-lg">
                                            <p className="text-xs text-brand-text-secondary">Total Catatan</p>
                                            <p className="font-bold text-brand-text-light">{notesCount}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {sorted.map(member => (
                                            <div key={member.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center gap-3">
                                                <div>
                                                    <p className="font-semibold text-brand-text-light">{member.name}</p>
                                                    <p className="text-sm text-brand-text-secondary">{member.role}</p>
                                                    <p className="text-xs text-brand-text-secondary mt-1">Catatan: {member.performanceNotes?.length || 0}</p>
                                                </div>
                                                <div className="flex items-center gap-1 font-semibold text-brand-text-light"><StarIcon className="w-4 h-4 text-yellow-400 fill-current" />{(member.rating || 0).toFixed(1)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

            </div>
        </Modal>
        {qrModalContent && (
            <Modal isOpen={!!qrModalContent} onClose={() => setQrModalContent(null)} title={qrModalContent.title} size="sm">
                <div className="text-center p-4">
                    <QrCodeDisplay value={qrModalContent.url} size={200} wrapperId="Tim / Vendor-portal-qrcode" />
                    <p className="text-xs text-brand-text-secondary mt-4 break-all">{qrModalContent.url}</p>
                    <div className="flex items-center gap-2 mt-6">
                        <button onClick={() => { navigator.clipboard.writeText(qrModalContent.url); showNotification('Tautan berhasil disalin!'); }} className="button-secondary w-full">Salin Tautan</button>
                        <button onClick={() => {
                            const canvas = document.querySelector('#Tim / Vendor-portal-qrcode canvas') as HTMLCanvasElement;
                            if (canvas) {
                                const link = document.createElement('a');
                                link.download = 'Tim / Vendor-portal-qr.png';
                                link.href = canvas.toDataURL();
                                link.click();
                            }
                        }} className="button-primary w-full">Unduh QR</button>
                    </div>
                </div>
            </Modal>
        )}
    </div>
);
};

export default Freelancers;