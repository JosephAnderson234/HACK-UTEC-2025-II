import React from "react";

type Props = {
    open: boolean;
    title?: string;
    children?: React.ReactNode;
    onClose: () => void;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
};

/**
 * Modal estilizado con la paleta solicitada:
 * - #231F20 (texto/encabezado)
 * - #00BFFE / #11C4FC / #00BAF5 (botón confirmar / acentos)
 * - #FFFFFF (fondo)
 * - #000000 (texto oscuro)
 * - #EDEDED / #DADADA (bordes / fondo light)
 */
const Modal = ({ open, title, children, onClose, onConfirm, confirmLabel = "Confirmar", cancelLabel = "Cancelar" }: Props) => {
    if (!open) return null;

    const headerColor = '#231F20';
    const confirmGradient = 'linear-gradient(90deg, #11C4FC 0%, #00BAF5 100%)';
    const white = '#FFFFFF';
    const blackText = '#000000';
    const borderLight = '#DADADA';
    const cancelBorder = '#EDEDED';

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
            <div style={{ position: 'relative', background: white, color: blackText, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', maxWidth: 720, width: '100%', padding: 20, border: `1px solid ${borderLight}` }}>
                {title && <h3 style={{ color: headerColor, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</h3>}
                <div style={{ marginBottom: 16 }}>{children}</div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 14px',
                            borderRadius: 8,
                            background: 'transparent',
                            border: `1px solid ${cancelBorder}`,
                            color: headerColor,
                            cursor: 'pointer'
                        }}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '8px 14px',
                            borderRadius: 8,
                            background: confirmGradient,
                            color: white,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
