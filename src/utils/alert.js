import Swal from "sweetalert2";

export const showSuccess = (message) => {
  Swal.fire({
    toast: true,
    position: "top",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "#ffffff",
    color: "#065f46",
    customClass: {
      popup: "rounded-2xl shadow-xl",
    },
  });
};