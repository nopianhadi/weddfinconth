import React, { useState, useEffect } from 'react';
import { Transaction, Profile, Project, Client, TransactionType } from '../types';
import { DownloadIcon } from '../constants';
import { getTransaction } from '../services/transactions';
import { getProjectWithRelations } from '../services/projects';
import { getProfile } from '../services/profile';
import { getClient } from '../services/clients';

interface PublicReceiptProps {
    transactionId: string;
}

const PublicReceipt: React.FC<PublicReceiptProps> = ({ transactionId }) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!transactionId) {
            setError('ID transaksi tidak valid.');
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [fetchedTx, fetchedProfile] = await Promise.all([
                    getTransaction(transactionId),
                    getProfile()
                ]);

                if (cancelled) return;

                if (!fetchedTx) {
                    setError('Data transaksi tidak ditemukan.');
                    setLoading(false);
                    return;
                }

                setTransaction(fetchedTx);
                setProfile(fetchedProfile);

                // Fetch project if related
                if (fetchedTx.projectId) {
                    const fetchedProj = await getProjectWithRelations(fetchedTx.projectId);
                    if (!cancelled) {
                        setProject(fetchedProj);
                        // Fetch client from project's clientId
                        if (fetchedProj?.clientId) {
                            const fetchedClient = await getClient(fetchedProj.clientId);
                            if (!cancelled) setClient(fetchedClient);
                        }
                    }
                }
            } catch (err: any) {
                if (!cancelled) {
                    console.error('[PublicReceipt] Fetch error:', err);
                    setError('Terjadi kesalahan saat memuat data. Coba lagi nanti.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [transactionId]);

    const handleDownloadPDF = async () => {
        const element = document.getElementById('receipt-document');
        if (!element) return;

        const opt = {
            margin: 10,
            filename: `Tanda_Terima-${transaction?.id.slice(0, 8)}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 3,
                useCORS: true,
                letterRendering: true,
                windowWidth: 1200,
                onclone: (clonedDoc: any) => {
                    const el = clonedDoc.getElementById('receipt-document');
                    if (el) el.classList.add('force-desktop');
                }
            },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        const html2pdf = (await import('html2pdf.js')).default;
        html2pdf().set(opt).from(element).save();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative flex justify-center items-center">
                        <div className="absolute border-4 border-brand-accent/20 rounded-full w-16 h-16"></div>
                        <div className="animate-spin border-4 border-transparent border-t-brand-accent rounded-full w-16 h-16"></div>
                    </div>
                    <p className="text-sm font-medium text-brand-text-secondary animate-pulse">Memuat data...</p>
                </div>
            </div>
        );
    }

    if (error || !transaction || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 py-12">
                <div className="max-w-md w-full bg-brand-surface p-8 rounded-2xl border border-brand-border/50 shadow-xl text-center">
                    <div className="w-16 h-16 bg-brand-danger/10 text-brand-danger rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-brand-text-light tracking-tight mb-2">Data Tidak Ditemukan</h2>
                    <p className="text-brand-text-secondary mb-6 leading-relaxed">{error || 'Maaf, data yang Anda cari tidak tersedia.'}</p>
                    <button onClick={() => window.location.hash = '#/'} className="w-full py-3 px-6 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all">
                        Kembali ke Beranda
                    </button>
                </div>
            </div>
        );
    }

    const isExpense = transaction.type === TransactionType.EXPENSE;
    const documentTitle = isExpense ? 'Bukti Pengeluaran' : 'Tanda Terima';
    const statusText = isExpense ? 'Telah Dibayarkan Secara Sah' : 'Telah Diterima Secara Sah';
    const statusColor = isExpense ? 'text-blue-600' : 'text-green-600';

    let targetName = client?.name || 'Klien';
    if (isExpense) {
        if (transaction.category === 'Gaji Tim / Vendor') {
            const match = transaction.description?.match(/Gaji Vendor - (.+?) \(/);
            targetName = match && match[1] ? match[1] : 'Vendor / Tim';
        } else {
            targetName = 'Pihak Lain';
        }
    }

    return (
        <div className="min-h-screen bg-brand-bg py-6 sm:py-12 px-4 print:bg-white print:p-0">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 no-print">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-brand-accent rounded-full" />
                        <div>
                            <h1 className="text-xl font-black text-brand-text-light tracking-tight">{documentTitle}</h1>
                            <p className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">{profile.companyName}</p>
                        </div>
                    </div>
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-6 py-3 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all group">
                        <DownloadIcon className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                        <span>Unduh PDF</span>
                    </button>
                </div>

                <div id="receipt-document" className="bg-white border border-slate-200 shadow-xl mx-auto p-8 sm:p-12 font-sans text-slate-900 print:shadow-none print:border-none print:bg-white print:max-w-none">
                    <div className="flex justify-between items-start mb-12 pb-8 border-b-2 border-brand-accent">
                        <div>
                            {profile.logoBase64 ? (
                                <img src={profile.logoBase64} alt="Company Logo" className="h-20 object-contain mb-4" />
                            ) : (
                                <h2 className="text-2xl font-bold text-brand-accent mb-2">{profile.companyName}</h2>
                            )}
                            <div className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                                <p className="font-bold text-slate-700">{profile.companyName}</p>
                                <p>{profile.address}</p>
                                <p>{profile.phone} • {profile.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-4xl font-black text-slate-200 uppercase tracking-tighter leading-none mb-4">{documentTitle}</h1>
                            <div className="inline-block bg-slate-100 px-3 py-1 rounded text-[10px] font-mono text-slate-500 uppercase">
                                REF: #{transaction.id.slice(0, 8).toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-2xl mb-12 border border-slate-100">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status Konfirmasi</p>
                                <p className={`text-sm font-black ${statusColor} uppercase`}>{statusText}</p>
                            </div>
                            <div className="text-center sm:text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Jumlah Pembayaran</p>
                                <p className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(transaction.amount)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-1">Pihak Terkait</h4>
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-slate-800">{targetName}</p>
                                    <p className="text-xs text-slate-500">{isExpense ? 'Penerima Pembayaran' : 'Pemberi Pembayaran'}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-1">Metode & Waktu</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Metode</span>
                                        <span className="font-bold text-slate-800">{transaction.method}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Tanggal</span>
                                        <span className="font-bold text-slate-800">{formatDate(transaction.date)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-1">Keterangan</h4>
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{transaction.description}</p>
                                </div>
                            </div>
                            {project && (
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-1">Informasi Acara</h4>
                                    <div className="p-4 bg-brand-accent/5 rounded-xl border border-brand-accent/10">
                                        <p className="text-xs font-bold text-brand-accent mb-2">{project.projectName}</p>
                                        <div className="grid grid-cols-2 gap-4 text-[11px]">
                                            <div>
                                                <p className="text-slate-400 uppercase tracking-tighter mb-0.5">Total Tagihan</p>
                                                <p className="font-bold text-slate-700">{formatCurrency(project.totalCost)}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 uppercase tracking-tighter mb-0.5">Sisa Tagihan</p>
                                                <p className="font-bold text-brand-accent">{formatCurrency(project.totalCost - project.amountPaid)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-end pt-12 border-t border-slate-100">
                        <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black max-w-[200px]">
                            Dokumen ini diterbitkan secara resmi melalui sistem manajemen {profile.companyName}
                        </div>
                        <div className="text-center w-56 shrink-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 font-mono">Tanda Tangan Authorized</p>
                            <div className="h-20 flex items-center justify-center mb-4">
                                {transaction.vendorSignature ? (
                                    <img src={transaction.vendorSignature} alt="Tanda Tangan" className="max-h-full object-contain grayscale" />
                                ) : profile.signatureBase64 ? (
                                    <img src={profile.signatureBase64} alt="Authorized" className="max-h-full object-contain grayscale" />
                                ) : (
                                    <div className="h-px w-32 bg-slate-200 mx-auto" />
                                )}
                            </div>
                            <p className="text-sm font-black text-slate-800 underline underline-offset-8 decoration-slate-200">{profile.authorizedSigner || profile.companyName}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center no-print">
                    <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest opacity-50">
                        &copy; {new Date().getFullYear()} {profile.companyName} • Professional Receipt
                    </p>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 10mm; size: A4 portrait; }
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    #receipt-document { 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 0 !important; 
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                    }
                    .force-desktop { width: 1200px !important; }
                }
            ` }} />
        </div>
    );
};

export default PublicReceipt;
