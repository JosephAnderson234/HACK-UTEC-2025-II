"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { themeBuilder } from "@/utils/notification";

export default function Notification({ message, visible, onClose, status }: { message: string, visible: boolean, onClose: () => void, status: "success" | "error" | "info" }) {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(onClose, 3500);
            return () => clearTimeout(timer);
        }
    }, [visible, onClose]);

    const theme = themeBuilder(status);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 80, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className={`fixed left-1/2 -translate-x-1/2 bottom-8 z-50 bg-linear-to-br ${theme} backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-xs md:max-w-sm`}
                >
                    <motion.div
                        initial={{ rotate: -20 }}
                        animate={{ rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="28"
                            height="28"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className="text-white"
                        >
                            <motion.path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.7 }}
                            />
                        </svg>
                    </motion.div>
                    <span className="flex-1 text-base font-medium">{message}</span>
                    <motion.button
                        aria-label="Cerrar notificación"
                        onClick={onClose}
                        whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.25)" }}
                        whileTap={{ scale: 0.95 }}
                        className="ml-2 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white"
                        style={{ backdropFilter: "blur(2px)" }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className="text-white"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </motion.button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}