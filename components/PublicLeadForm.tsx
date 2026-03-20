import React, { useState } from 'react';
import { LeadStatus, ContactChannel, PublicLeadFormProps } from '../types';
import { createLead } from '../services/leads';
import { cleanPhoneNumber } from '../constants';

const PublicLeadForm: React.FC<PublicLeadFormProps> = ({ setLeads, userProfile, showNotification }) => {
    const [formState, setFormState] = useState({
        name: '',
        whatsapp: '',
        eventLocation: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const notes = `Lead baru dari formulir website. Kota: ${formState.eventLocation}. Menunggu diskusi lebih lanjut.`;

        try {
            const created = await createLead({
                name: formState.name,
                whatsapp: formState.whatsapp,
                contactChannel: ContactChannel.WEBSITE,
                location: formState.eventLocation,
                status: LeadStatus.DISCUSSION,
                date: new Date().toISOString(),
                notes,
            });
            setLeads(prev => [created, ...prev]);
            setIsSubmitted(true);

            if ((window as any).addNotification) {
                (window as any).addNotification({
                    title: 'Calon Pengantin Baru',
                    message: `${formState.name} telah mengisi formulir lead.`,
                    type: 'info',
                    action: { view: 'Calon Pengantin' }
                });
            }

            showNotification('Informasi Anda telah kami terima. Terima kasih!');
        } catch (err: any) {
            console.error('Submit error:', err);
            alert('Gagal mengirim formulir. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    React.useEffect(() => {
        if (userProfile.companyName) {
            document.title = `Inquiry | ${userProfile.companyName}`;
        }
    }, [userProfile.companyName]);

    const Logo = ({ size = "h-24" }: { size?: string }) => (
        userProfile.logoBase64 ? (
            <img
                src={userProfile.logoBase64}
                alt={userProfile.companyName}
                className={`${size} w-auto object-contain mx-auto transition-all duration-700 hover:scale-110`}
            />
        ) : (
            <div className="text-3xl font-serif tracking-[0.2em] text-slate-800 uppercase animate-fade-in">
                {userProfile.companyName}
            </div>
        )
    );

    if (isSubmitted) {
        return (
            <div className="min-h-screen relative flex items-center justify-center p-4 bg-slate-50 font-['Tenor_Sans',sans-serif]">
                {/* Background with parallax effect */}
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] scale-110"
                    style={{ 
                        backgroundImage: 'url("/assets/images/backgrounds/wedding_form_bg.png")',
                        filter: 'brightness(0.9) contrast(1.1)'
                    }}
                />
                <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px]" />

                <div className="relative z-20 w-full max-w-xl p-6 sm:p-12 text-center bg-white/80 backdrop-blur-2xl rounded-3xl sm:rounded-[3rem] shadow-[0_22px_70px_4px_rgba(0,0,0,0.15)] border border-white/40 animate-scale-in">
                    <div className="mb-10">
                        <Logo />
                    </div>
                    <div className="mb-8">
                        <div className="w-20 h-20 mx-auto bg-slate-900 text-white rounded-full flex items-center justify-center animate-bounce-subtle">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-normal text-slate-900 mb-4 tracking-wide leading-tight">
                        Terima Kasih
                    </h1>
                    <p className="text-slate-500 font-normal uppercase tracking-[0.3em] text-[10px] mb-8">
                        {userProfile.companyName || 'Wedding Consultant'}
                    </p>
                    <p className="text-lg text-slate-700 leading-relaxed mb-10 font-light">
                        Pesan Anda telah kami terima dengan penuh hormat. <br/>
                        Tim konsultan kami akan segera menghubungi Anda untuk mewujudkan pernikahan impian Anda.
                    </p>
                    <a
                        href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=Halo%20${encodeURIComponent(userProfile.companyName || '')}%2C%20saya%20sudah%20mengisi%20formulir%20Calon Pengantin.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 sm:gap-4 px-6 py-3 sm:px-12 sm:py-5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all duration-300 shadow-[0_20px_50px_-8px_rgba(15,23,42,0.3)] hover:shadow-[0_25px_60px_-10px_rgba(15,23,42,0.5)] hover:-translate-y-1.5 active:scale-95 group font-['Manrope'] font-bold tracking-wide text-xs sm:text-base"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Hubungi Kami di WhatsApp
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 md:p-8 font-['Tenor_Sans',sans-serif]">
            {/* Background Image Layer */}
            <div 
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-[20s] scale-110"
                style={{ 
                    backgroundImage: 'url("/assets/images/backgrounds/wedding_form_bg.png")',
                    filter: 'brightness(0.95)'
                }}
            />
            {/* Sophisticated Overlay */}
            <div className="fixed inset-0 z-10 bg-white/40 backdrop-blur-[1px]" />

            <div className="relative z-20 w-full max-w-2xl bg-white/70 backdrop-blur-2xl rounded-3xl sm:rounded-[3.5rem] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.12)] border border-white/50 overflow-hidden animate-slide-up">
                {/* Decorative Accent */}
                <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-slate-200 via-slate-800 to-slate-200"></div>
                
                <div className="p-4 sm:p-14 md:p-20">
                    <header className="text-center mb-8 sm:mb-16">
                        <div className="mb-6 sm:mb-10 transform transition-all duration-1000">
                            <Logo size="h-14 sm:h-24" />
                        </div>
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-normal text-slate-900 tracking-tight leading-tight mb-2 sm:mb-4">
                            {userProfile.companyName || 'Registrasi Pernikahan'}
                        </h1>
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-px w-8 bg-slate-300"></div>
                            <span className="text-[11px] font-normal text-slate-400 tracking-[0.4em] uppercase">
                                Konsultasi & Inquiry
                            </span>
                            <div className="h-px w-8 bg-slate-300"></div>
                        </div>
                    </header>

                    <form className="space-y-5 sm:space-y-10" onSubmit={handleSubmit}>
                        <div className="space-y-6 sm:space-y-12">
                            {/* Input Group: Name */}
                            <div className="relative group">
                                <label 
                                    htmlFor="name" 
                                    className="block text-[9px] sm:text-[10px] font-normal text-slate-400 uppercase tracking-[0.2em] mb-2 sm:mb-4 transition-all group-focus-within:text-slate-900 group-focus-within:translate-x-1"
                                >
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formState.name}
                                    onChange={handleFormChange}
                                    className="w-full bg-white/40 border-2 border-slate-200/80 px-4 py-2.5 sm:px-8 sm:py-5 rounded-xl sm:rounded-[1.5rem] text-sm sm:text-xl font-light text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-slate-800 focus:bg-white/80 transition-all duration-300 shadow-sm"
                                    placeholder="Nama Pengantin"
                                    required
                                />
                            </div>

                            {/* Input Group: WhatsApp */}
                            <div className="relative group">
                                <label 
                                    htmlFor="whatsapp" 
                                    className="block text-[10px] font-normal text-slate-400 uppercase tracking-[0.2em] mb-4 transition-all group-focus-within:text-slate-900 group-focus-within:translate-x-1"
                                >
                                    Nomor WhatsApp
                                </label>
                                <div className="flex items-center bg-white/40 border-2 border-slate-200/80 px-4 sm:px-8 rounded-xl sm:rounded-[1.5rem] focus-within:border-slate-800 focus-within:bg-white/80 transition-all duration-300 shadow-sm overflow-hidden">
                                    <span className="text-sm sm:text-xl font-light text-slate-400 mr-2">+62</span>
                                    <input
                                        type="tel"
                                        id="whatsapp"
                                        name="whatsapp"
                                        value={formState.whatsapp}
                                        onChange={handleFormChange}
                                        className="w-full bg-transparent py-2.5 sm:py-5 text-sm sm:text-xl font-light text-slate-900 placeholder:text-slate-300 focus:outline-none"
                                        placeholder="812 3456 7890"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Input Group: Location */}
                            <div className="relative group">
                                <label 
                                    htmlFor="eventLocation" 
                                    className="block text-[10px] font-normal text-slate-400 uppercase tracking-[0.2em] mb-4 transition-all group-focus-within:text-slate-900 group-focus-within:translate-x-1"
                                >
                                    Rencana Lokasi Acara
                                </label>
                                <input
                                    type="text"
                                    id="eventLocation"
                                    name="eventLocation"
                                    value={formState.eventLocation}
                                    onChange={handleFormChange}
                                    className="w-full bg-white/40 border-2 border-slate-200/80 px-4 py-2.5 sm:px-8 sm:py-5 rounded-xl sm:rounded-[1.5rem] text-sm sm:text-xl font-light text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-slate-800 focus:bg-white/80 transition-all duration-300 shadow-sm"
                                    placeholder="Kota / Venue"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Action */}
                        <div className="pt-6 sm:pt-10 flex flex-col items-center gap-4 sm:gap-8">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full relative group overflow-hidden px-4 py-3 sm:px-8 sm:py-6 rounded-full bg-slate-900 text-white font-['Manrope'] font-bold tracking-[0.2em] text-[11px] sm:text-[13px] uppercase transition-all duration-500 shadow-[0_20px_50px_-8px_rgba(15,23,42,0.4)] hover:shadow-[0_25px_60px_-10px_rgba(15,23,42,0.6)] hover:-translate-y-1.5 active:scale-95 disabled:opacity-50 border border-white/10"
                            >
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                <span className="flex items-center justify-center gap-3">
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    )}
                                    Kirim Informasi
                                </span>
                            </button>

                            <p className="text-[10px] text-slate-400 text-center font-light tracking-wide italic">
                                Informasi Anda akan kami jaga kerahasiaannya dan hanya digunakan untuk keperluan konsultasi pernikahan.
                            </p>
                            
                            <div className="w-12 h-px bg-slate-200"></div>

                            <a
                                href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=Halo%20${encodeURIComponent(userProfile.companyName || '')}%2C%20saya%20tertarik%20dengan%20layanan%20Anda.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-3 text-slate-500 text-xs font-normal tracking-[0.1em] hover:text-slate-900 transition-all group font-['Manrope']"
                            >
                                <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Konsultasi langsung via WhatsApp
                            </a>
                        </div>
                    </form>
                </div>
            </div>
            
            <style>{`
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-scale-in {
                    animation: scale-in 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                .animate-slide-up {
                    animation: slide-up 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                input::placeholder {
                    opacity: 0.5;
                }
            `}</style>
        </div>
    );
};

export default PublicLeadForm;

