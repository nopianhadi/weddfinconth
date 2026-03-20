import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { WhatsappIcon } from '../constants';
import { cleanPhoneNumber } from '../utils/whatsapp';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    initialMessage: string;
    phone?: string | null;
    showNotification?: (message: string) => void;
};

export default function ShareMessageModal({ isOpen, onClose, title, initialMessage, phone, showNotification }: Props) {
    const [message, setMessage] = useState(initialMessage || '');

    useEffect(() => {
        if (isOpen) setMessage(initialMessage || '');
    }, [isOpen, initialMessage]);

    const canNativeShare = useMemo(() => {
        return typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';
    }, []);

    const notify = (text: string) => {
        if (showNotification) return showNotification(text);
        alert(text);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            notify('Pesan disalin.');
        } catch {
            notify('Gagal menyalin pesan.');
        }
    };

    const handleNativeShare = async () => {
        try {
            await (navigator as any).share({ text: message });
        } catch {
            // ignore user cancel
        }
    };

    const handleOpenWhatsApp = () => {
        if (!message.trim()) {
            notify('Pesan tidak boleh kosong.');
            return;
        }

        const cleaned = cleanPhoneNumber(phone);
        const encoded = encodeURIComponent(message);
        const waUrl = cleaned
            ? `https://wa.me/${cleaned}?text=${encoded}`
            : `https://wa.me/?text=${encoded}`;

        window.open(waUrl, '_blank');
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="2xl"
            footer={
                <>
                    <button type="button" onClick={handleCopy} className="button-secondary">
                        Salin
                    </button>
                    {canNativeShare && (
                        <button type="button" onClick={handleNativeShare} className="button-secondary">
                            Share
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="button-primary inline-flex items-center gap-2 !bg-green-500 hover:!bg-green-600"
                    >
                        <WhatsappIcon className="w-5 h-5" /> Kirim via WhatsApp
                    </button>
                </>
            }
        >
            <div className="space-y-3">
                <div className="input-group">
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={14}
                        className="input-field"
                    />
                    <label className="input-label">Preview Pesan (bisa diedit)</label>
                </div>
            </div>
        </Modal>
    );
}
