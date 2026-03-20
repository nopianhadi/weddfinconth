import React from 'react';
import { Contract, Project, Profile } from '../types';

interface ContractDocumentProps {
    contract: Contract;
    project: Project;
    profile: Profile;
    id?: string;
    hideSignatures?: boolean;
}

const ContractDocument: React.FC<ContractDocumentProps> = ({ contract, project, profile, id, hideSignatures = false }) => {
    // Vendor signature: prefer saved contract signature, fallback to profile's stored signature
    const vendorSig = contract.vendorSignature || profile.signatureBase64;
    const meteraiUrl = '/assets/images/meterai/matrai10rb.jpg';

    const effectiveVendorSig = hideSignatures ? undefined : vendorSig;
    const effectiveClientSig = hideSignatures ? undefined : contract.clientSignature;

    const shouldShowMeteraiVendor = !!contract.includeMeterai && (contract.meteraiPlacement === 'both');
    const shouldShowMeteraiClient = !!contract.includeMeterai && ((contract.meteraiPlacement || 'client') === 'client' || contract.meteraiPlacement === 'both');

    const formatDate = (dateString: string) => {
        if (!dateString) return '[Tanggal belum diisi]';
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formatDocumentCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Terbilang helper (simple)
    const toWords = (n: number): string => {
        const ones = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
            'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas',
            'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
        const tens = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
            'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'];
        if (n === 0) return 'Nol';
        if (n < 0) return 'Minus ' + toWords(-n);
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Ratus' + (n % 100 ? ' ' + toWords(n % 100) : '');
        if (n < 1000000) return toWords(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
        if (n < 1000000000) return toWords(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 ? ' ' + toWords(n % 1000000) : '');
        return toWords(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 ? ' ' + toWords(n % 1000000000) : '');
    };
    const terbilang = (amount: number) => toWords(amount) + ' Rupiah';

    const clientDisplay = contract.clientName2
        ? `${contract.clientName1} DAN ${contract.clientName2}`
        : contract.clientName1;

    const styles: Record<string, React.CSSProperties> = {
        page: { background: 'white', color: '#0f172a', fontFamily: '"Inter", "Outfit", "Segoe UI", sans-serif', fontSize: '10pt', lineHeight: '1.6', padding: '30pt 20pt', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box' as const },
        centerBold: { textAlign: 'center' as const, fontWeight: '700' },
        title: { textAlign: 'center' as const, fontWeight: '900', fontSize: '18pt', letterSpacing: '0.5px', marginBottom: '4pt', color: '#0f172a' },
        subtitle: { textAlign: 'center' as const, fontWeight: '600', fontSize: '11pt', letterSpacing: '0.5px', marginBottom: '8pt', color: '#475569' },
        hr: { border: 'none', borderTop: '2px solid #e2e8f0', margin: '20pt 0' },
        hrThin: { border: 'none', borderTop: '1px solid #e2e8f0', margin: '10pt 0' },
        sectionTitle: { fontWeight: '800', fontSize: '11pt', borderBottom: '2px solid #3b82f6', paddingBottom: '6pt', marginBottom: '12pt', marginTop: '24pt', pageBreakInside: 'avoid' as const, pageBreakAfter: 'avoid' as const, color: '#1e3a8a', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
        partyBox: { border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12pt 16pt', marginBottom: '12pt', pageBreakInside: 'avoid' as const, backgroundColor: '#f8fafc' },
        partyLabel: { fontWeight: '800', fontSize: '10pt', color: '#64748b', marginBottom: '4pt', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
        p: { textAlign: 'justify' as const, marginBottom: '6pt', color: '#334155' },
        pIndent: { textAlign: 'justify' as const, marginBottom: '6pt', marginLeft: '16pt', color: '#334155' },
        bold: { fontWeight: '700', color: '#0f172a' },
        sigGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30pt', marginTop: '24pt', pageBreakInside: 'avoid' as const },
        sigBox: { textAlign: 'center' as const, pageBreakInside: 'avoid' as const },
        sigLabel: { fontWeight: '800', fontSize: '10pt', color: '#64748b', marginBottom: '4pt', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
        sigName: { fontStyle: 'italic', fontWeight: '600', color: '#0f172a', fontSize: '11pt', marginBottom: '4pt' },
        sigImg: { height: '60pt', maxWidth: '160pt', objectFit: 'contain' as const, margin: '4pt auto', display: 'block' },
        sigLine: { borderTop: '1px solid #cbd5e1', marginTop: '50pt', paddingTop: '6pt', textAlign: 'center' as const, fontSize: '11pt', fontWeight: '600', color: '#0f172a' },
        noSig: { display: 'block', height: '50pt', lineHeight: '50pt', color: '#94a3b8', fontStyle: 'italic', fontSize: '10pt', textAlign: 'center' as const },
    };

    const renderCustomContent = (content: string | undefined, fallback: React.ReactNode) => {
        if (!content) return fallback;
        return content.split('\n').map((line, idx) => (
            line.trim() 
                ? <p key={idx} style={styles.p}>{line}</p> 
                : <div key={idx} style={{ height: '4pt' }}></div>
        ));
    };

    return (
        <div id={id} style={{...styles.page, borderTop: '8px solid #3b82f6'}} className="contract-document bg-white">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8pt', position: 'relative' }}>
                {/* Logo Area */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
                    {profile.logoBase64 && (
                        <img src={profile.logoBase64} alt="Company Logo" style={{ height: '50pt', maxWidth: '120pt', objectFit: 'contain' }} />
                    )}
                </div>

                {/* Title Area */}
                <div style={{ flex: 2, textAlign: 'center' }}>
                    <div style={styles.title}>SURAT PERJANJIAN KERJA SAMA</div>
                    <div style={styles.subtitle}>{contract.serviceTitle || `JASA ${project.projectType.toUpperCase()}`}</div>
                </div>

                {/* Contract Number Badge */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div className="text-[12px] font-bold text-slate-700 bg-slate-100 border border-slate-200" style={{ padding: '6pt 10pt', borderRadius: '4px', textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '2pt', fontWeight: 'normal', textTransform: 'uppercase', letterSpacing: '1px' }}>Nomor Kontrak</span>
                        {contract.contractNumber || `CTR-${contract.id.slice(-6).toUpperCase()}`}
                    </div>
                </div>
            </div>
            <hr style={styles.hr} />

            <p style={styles.p}>
                Pada hari ini, <strong>{formatDate(contract.signingDate)}</strong>, bertempat di <strong>{contract.signingLocation}</strong>,
                telah dibuat dan disepakati <strong>Perjanjian Kerja Sama {contract.serviceTitle || `JASA ${project.projectType.toUpperCase()}`}</strong> antara:
            </p>

            {/* Pihak Pertama */}
            <div style={styles.partyBox}>
                <div style={styles.partyLabel}>PIHAK PERTAMA</div>
                <hr style={styles.hrThin} />
                <p style={{ ...styles.p, marginBottom: '0' }}>
                    <strong>{profile.companyName}</strong><br />
                    yang diwakili oleh: {profile.authorizedSigner || '________________________'}<br />
                    {profile.address && <>Alamat: {profile.address}<br /></>}
                    {profile.phone && <>Telepon: {profile.phone}</>}
                </p>
                <p style={{ marginTop: '6pt', marginBottom: '0', fontStyle: 'italic', color: '#555', fontSize: '11pt' }}>
                    Selanjutnya disebut <strong>PIHAK PERTAMA</strong>.
                </p>
            </div>

            {/* Pihak Kedua */}
            <div style={styles.partyBox}>
                <div style={styles.partyLabel}>PIHAK KEDUA</div>
                <hr style={styles.hrThin} />
                <p style={{ ...styles.p, marginBottom: '0' }}>
                    <strong>{clientDisplay}</strong><br />
                    Nomor Telepon: {contract.clientPhone1}{contract.clientPhone2 ? ` / ${contract.clientPhone2}` : ''}<br />
                    Alamat: {contract.clientAddress1}{contract.clientAddress2 && contract.clientAddress2 !== contract.clientAddress1 ? ` / ${contract.clientAddress2}` : ''}
                </p>
                <p style={{ marginTop: '6pt', marginBottom: '0', fontStyle: 'italic', color: '#555', fontSize: '11pt' }}>
                    Selanjutnya disebut <strong>PIHAK KEDUA</strong>.
                </p>
            </div>

            {/* Pasal 1 */}
            <div style={styles.sectionTitle}>PASAL 1 — RUANG LINGKUP PEKERJAAN</div>
            {renderCustomContent(contract.pasal1Content, (
                <>
                    <p style={styles.p}>
                        1.1 PIHAK PERTAMA sepakat untuk memberikan jasa <strong>{(contract.serviceTitle || `dokumentasi ${project.projectType}`).toLowerCase()}</strong> kepada PIHAK KEDUA.
                    </p>
                    <p style={styles.p}>1.2 Pelaksanaan pekerjaan dilakukan pada:</p>
                    <p style={styles.pIndent}>• <strong>Tanggal Acara</strong> : {formatDate(project.date)}</p>
                    <p style={styles.pIndent}>• <strong>Lokasi Acara</strong> : {project.location}</p>
                    {contract.shootingDuration && (
                        <p style={styles.p}>1.3 Rincian layanan yang diberikan oleh PIHAK PERTAMA meliputi:</p>
                    )}
                    {contract.shootingDuration && <p style={styles.pIndent}>• {contract.shootingDuration}</p>}
                    {contract.guaranteedPhotos && <p style={styles.pIndent}>• {contract.guaranteedPhotos}</p>}
                    {contract.albumDetails && <p style={styles.pIndent}>• {contract.albumDetails}</p>}
                    {contract.otherItems && (
                        <p style={styles.p}>1.4 Layanan tambahan yang disepakati:</p>
                    )}
                    {contract.otherItems && <p style={styles.pIndent}>• <strong>{contract.otherItems}</strong></p>}
                    <p style={styles.p}>
                        1.5 Segala perubahan layanan di luar yang tercantum dalam perjanjian ini harus disepakati oleh kedua belah pihak.
                    </p>
                </>
            ))}

            {/* Pasal 2 */}
            <div style={styles.sectionTitle}>PASAL 2 — BIAYA DAN SISTEM PEMBAYARAN</div>
            {renderCustomContent(contract.pasal2Content, (
                <>
                    <p style={styles.p}>
                        2.1 Total biaya jasa yang disepakati oleh kedua belah pihak adalah sebesar:
                    </p>
                    <p style={{ ...styles.centerBold, fontSize: '13pt', margin: '8pt 0' }}>
                        {formatDocumentCurrency(project.totalCost)}<br />
                        <span style={{ fontSize: '10pt', fontWeight: 'normal', fontStyle: 'italic' }}>({terbilang(project.totalCost)})</span>
                    </p>
                    <p style={styles.p}>2.2 Sistem pembayaran dilakukan dengan ketentuan sebagai berikut:</p>
                    <p style={styles.pIndent}>
                        <strong>a. Uang Muka (DP)</strong><br />
                        Sebesar <strong>{formatDocumentCurrency(project.amountPaid || 0)}</strong> dibayarkan pada tanggal <strong>{formatDate(contract.dpDate)}</strong>.
                    </p>
                    <p style={styles.pIndent}>
                        <strong>b. Pelunasan</strong><br />
                        Sisa pembayaran wajib dilunasi paling lambat pada tanggal <strong>{formatDate(contract.finalPaymentDate)}</strong> atau sebelum hari pelaksanaan acara.
                    </p>
                    <p style={styles.p}>2.3 Pembayaran dianggap sah setelah dana diterima oleh PIHAK PERTAMA.</p>
                </>
            ))}

            {/* Pasal 3 */}
            <div style={styles.sectionTitle}>PASAL 3 — KETENTUAN PEMBATALAN</div>
            {renderCustomContent(contract.pasal3Content, (
                <>
                    {contract.cancellationPolicy.split('\n').map((line, idx) => (
                        line.trim() && <p key={idx} style={styles.p}>{`3.${idx + 1} `}{line}</p>
                    ))}
                    <p style={styles.p}>
                        3.{contract.cancellationPolicy.split('\n').filter(l => l.trim()).length + 1} Apabila pembatalan dilakukan oleh PIHAK PERTAMA karena alasan yang tidak dapat dihindari,
                        maka PIHAK PERTAMA wajib mengembalikan seluruh pembayaran yang telah diterima.
                    </p>
                </>
            ))}

            {/* Pasal 4 */}
            <div style={styles.sectionTitle}>PASAL 4 — KETENTUAN PELAKSANAAN PEKERJAAN</div>
            {renderCustomContent(contract.pasal4Content, (
                <>
                    <p style={styles.p}>
                        4.1 Waktu pengerjaan dan pengiriman hasil dokumentasi adalah maksimal <strong>{contract.deliveryTimeframe}</strong> setelah acara berlangsung.
                    </p>
                    {contract.personnelCount && (
                        <p style={styles.p}>4.2 Tim yang akan bertugas pada acara PIHAK KEDUA: <strong>{contract.personnelCount}</strong>.</p>
                    )}
                    <p style={styles.p}>
                        4.3 PIHAK PERTAMA berhak menggunakan sebagian hasil dokumentasi sebagai portofolio atau media promosi,
                        kecuali apabila PIHAK KEDUA menyatakan keberatan secara tertulis.
                    </p>
                </>
            ))}

            {/* Pasal 5 */}
            <div style={styles.sectionTitle}>PASAL 5 — KETENTUAN UMUM</div>
            {renderCustomContent(contract.pasal5Content, (
                <>
                    <p style={styles.p}>5.1 Perjanjian ini berlaku sejak tanggal ditandatangani oleh kedua belah pihak.</p>
                    <p style={styles.p}>5.2 Segala hal yang belum diatur dalam perjanjian ini akan diselesaikan secara musyawarah dan mufakat.</p>
                    <p style={styles.p}>
                        5.3 Apabila terjadi perselisihan yang tidak dapat diselesaikan secara musyawarah, maka kedua belah pihak
                        sepakat untuk menyelesaikannya melalui jalur hukum di wilayah <strong>{contract.jurisdiction}</strong>.
                    </p>
                </>
            ))}

            {/* Penutup */}
            <hr style={styles.hr} />
            <div style={{ ...styles.p, textAlign: 'center', fontStyle: 'italic', fontSize: '11pt' }}>
                {renderCustomContent(contract.closingText, (
                    <>
                        Demikian Surat Perjanjian Kerja Sama ini dibuat dengan sebenar-benarnya dalam keadaan sadar dan tanpa paksaan.
                        Perjanjian ini dibuat dalam <strong>dua rangkap</strong> yang masing-masing mempunyai kekuatan hukum yang sama.
                    </>
                ))}
            </div>

            {/* Tanda Tangan */}
            <div style={{ marginTop: '24pt' }}>
                <div style={{ ...styles.centerBold, fontSize: '13pt', marginBottom: '16pt' }}>TANDA TANGAN PARA PIHAK</div>
                <div style={styles.sigGrid}>
                    {/* Vendor */}
                    <div style={styles.sigBox}>
                        <div style={styles.sigLabel}>PIHAK PERTAMA</div>
                        <div style={styles.sigName}>{profile.companyName}</div>
                        <div style={{ height: '64pt', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {shouldShowMeteraiVendor && (
                                <img
                                    src={meteraiUrl}
                                    alt="Meterai"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        margin: 'auto',
                                        height: '64pt',
                                        width: '64pt',
                                        objectFit: 'contain',
                                        opacity: 0.95,
                                        zIndex: 1,
                                    }}
                                />
                            )}
                            {effectiveVendorSig
                                ? <img src={effectiveVendorSig} alt="TTD Vendor" style={{ ...styles.sigImg, position: 'relative', zIndex: 2 }} />
                                : (hideSignatures
                                    ? <span style={{ display: 'block', height: '50pt' }} />
                                    : <span style={{ ...styles.noSig, position: 'relative', zIndex: 2 }}>Belum Ditandatangani</span>
                                )
                            }
                        </div>
                        <hr style={{ borderTop: '1px solid #555', marginTop: '0', marginBottom: '4pt' }} />
                        <div style={{ fontSize: '11pt' }}>{profile.authorizedSigner || profile.companyName}</div>
                    </div>
                    {/* Client */}
                    <div style={styles.sigBox}>
                        <div style={styles.sigLabel}>PIHAK KEDUA</div>
                        <div style={styles.sigName}>{clientDisplay}</div>
                        <div style={{ height: '64pt', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {shouldShowMeteraiClient && (
                                <img
                                    src={meteraiUrl}
                                    alt="Meterai"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        margin: 'auto',
                                        height: '64pt',
                                        width: '64pt',
                                        objectFit: 'contain',
                                        opacity: 0.95,
                                        zIndex: 1,
                                    }}
                                />
                            )}
                            {effectiveClientSig
                                ? <img src={effectiveClientSig} alt="TTD Klien" style={{ ...styles.sigImg, position: 'relative', zIndex: 2 }} />
                                : (hideSignatures
                                    ? <span style={{ display: 'block', height: '50pt' }} />
                                    : <span style={{ ...styles.noSig, position: 'relative', zIndex: 2 }}>Belum Ditandatangani</span>
                                )
                            }
                        </div>
                        <hr style={{ borderTop: '1px solid #555', marginTop: '0', marginBottom: '4pt' }} />
                        <div style={{ fontSize: '11pt' }}>{clientDisplay}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractDocument;
