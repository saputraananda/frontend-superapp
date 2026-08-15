import Swal from "sweetalert2";

export const showSuccess = (message) => {
  return Swal.fire({
    toast: true,
    position: "top",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "#ffffff",
    color: "#0f172a",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100",
      container: "z-[10005]",
    },
  });
};

export const showError = (message) => {
  return Swal.fire({
    toast: true,
    position: "top",
    icon: "error",
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "#ffffff",
    color: "#0f172a",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100",
      container: "z-[10005]",
    },
  });
};

export const showConfirm = (title, text, confirmButtonText = "Ya, Hapus") => {
  return Swal.fire({
    title: title,
    text: text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626", // red-600
    cancelButtonColor: "#64748b", // slate-500
    confirmButtonText: confirmButtonText,
    cancelButtonText: "Batal",
    customClass: {
      popup: "rounded-2xl shadow-xl",
      container: "z-[10005]",
    },
  }).then((result) => result.isConfirmed);
};