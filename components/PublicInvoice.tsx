import React, { useState, useEffect } from 'react';
import { Project, Profile, Package, Client } from '../types';
import InvoiceDocument from './InvoiceDocument';
import { DownloadIcon } from '../constants';
import { getProjectWithRelations } from '../services/projects';
import { getClient } from '../services/clients';
import { listPackages } from '../services/packages';
import { getProfile } from '../services/profile';

interface PublicInvoiceProps {
    projectId: string;
    // These props are kept for backward compatibility but the component
    // now fetches its own data from Supabase directly.
    projects?: Project[];
    profile?: Profile;
    packages?: Package[];
    clients?: Client[];
}

const PublicInvoice: React.FC<PublicInvoiceProps> = ({ projectId }) => {
    const [project, setProject] = useState<Project | null>(null);
    const [client, setClient] = useState<Client | null | undefined>(undefined);
    const [packages, setPackages] = useState<Package[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            setError('ID invoice tidak valid.');
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch everything in parallel
                const [fetchedProject, fetchedPackages, fetchedProfile] = await Promise.all([
                    getProjectWithRelations(projectId),
                    listPackages(),
                    getProfile(),
                ]);

                if (cancelled) return;

                if (!fetchedProject) {
                    setError('Invoice tidak ditemukan.');
                    setLoading(false);
                    return;
                }

                setProject(fetchedProject);
                setPackages(fetchedPackages);
                setProfile(fetchedProfile);

                // Fetch client after we have the project
                if (fetchedProject.clientId) {
                    const fetchedClient = await getClient(fetchedProject.clientId);
                    if (!cancelled) setClient(fetchedClient);
                } else {
                    setClient(null);
                }
            } catch (err: any) {
                if (!cancelled) {
                    console.error('[PublicInvoice] Fetch error:', err);
                    setError('Terjadi kesalahan saat memuat invoice. Coba lagi nanti.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [projectId]);

    const handleDownloadPDF = async () => {
        const element = document.getElementById('invoice-document');
        if (!element) return;

        const opt = {
            margin: 10,
            filename: `invoice-${project?.clientName?.replace(/\s+/g, '-').toLowerCase()}-${project?.id.slice(-8)}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 3,
                useCORS: true,
                letterRendering: true,
                windowWidth: 1200,
                onclone: (clonedDoc: any) => {
                    const el = clonedDoc.getElementById('invoice-document');
                    if (el) el.classList.add('force-desktop');
                }
            },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        const html2pdf = (await import('html2pdf.js')).default;
        html2pdf().set(opt).from(element).save();
    };

    // --- Loading state ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative flex justify-center items-center">
                        <div className="absolute border-4 border-brand-accent/20 rounded-full w-16 h-16"></div>
                        <div className="animate-spin border-4 border-transparent border-t-brand-accent rounded-full w-16 h-16"></div>
                    </div>
                    <p className="text-sm font-medium text-brand-text-secondary animate-pulse">Memuat invoice...</p>
                </div>
            </div>
        );
    }

    // --- Error / Not Found state ---
    if (error || !project || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 py-12">
                <div className="max-w-md w-full bg-brand-surface p-8 rounded-2xl border border-brand-border/50 shadow-xl text-center">
                    <div className="w-16 h-16 bg-brand-danger/10 text-brand-danger rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-brand-text-light tracking-tight mb-2">Invoice Tidak Ditemukan</h2>
                    <p className="text-brand-text-secondary mb-6 leading-relaxed">
                        {error || 'Mohon maaf, data invoice tidak dapat ditemukan. Pastikan link yang Anda gunakan sudah benar atau hubungi kami jika masalah berlanjut.'}
                    </p>
                    <button
                        onClick={() => window.location.hash = '#/'}
                        className="w-full py-3 px-6 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all"
                    >
                        Kembali ke Beranda
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-bg py-6 sm:py-12 px-4 print:bg-white print:p-0">
            <div className="max-w-4xl mx-auto">
                {/* Actions bar - hidden when printing */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 no-print">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-brand-accent rounded-full" />
                        <div>
                            <h1 className="text-xl font-black text-brand-text-light tracking-tight">Invoice Resmi</h1>
                            <p className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">{profile.companyName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 px-6 py-3 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all group"
                        >
                            <DownloadIcon className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                            <span>Unduh PDF</span>
                        </button>
                    </div>
                </div>

                {/* The shared invoice document */}
                <InvoiceDocument
                    project={project}
                    profile={profile}
                    packages={packages}
                    client={client ?? undefined}
                />

                {/* Footer info - hidden when printing */}
                <div className="mt-8 text-center no-print">
                    <p className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">
                        &copy; {new Date().getFullYear()} {profile.companyName} • Professional Document
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PublicInvoice;
