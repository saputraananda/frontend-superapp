let modalResolver = null;
let modalListeners = [];

export function showModal(config) {
  return new Promise((resolve) => {
    modalResolver = resolve;
    modalListeners.forEach((fn) => fn({ ...config, open: true }));
  });
}

export function customConfirm(title, message, confirmLabel = "Ya, Lanjutkan", danger = true) {
  return showModal({ type: "confirm", title, message, confirmLabel, danger });
}

export { modalListeners, modalResolver };

// Setter helper agar ModalDialog bisa update resolver
export function resolveModal(val) {
  if (modalResolver) { modalResolver(val); modalResolver = null; }
  modalListeners.forEach((fn) => fn({ open: false }));
}