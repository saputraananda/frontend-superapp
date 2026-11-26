import { useState } from "react";
import { HiOutlinePhoto } from "react-icons/hi2";
import { resolveImageSrc } from "../utils/resolveImageSrc";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Foto dari route berlogin (cookie sesi ikut terkirim). Memakai <img src> langsung,
 * bukan fetch + blob, karena CDN menambah `Access-Control-Allow-Origin: *` yang ditolak
 * browser untuk fetch berkredensial. Jangan menambah atribut crossOrigin pada <img>.
 */
export function AuthenticatedImage({ path, alt, className, onClick, iconSize = "h-5 w-5", objectFit = "cover" }) {
  const [failedPath, setFailedPath] = useState(null);

  const imgCls = objectFit === "contain" ? "h-full w-full object-contain" : "h-full w-full object-cover";

  if (!path || failedPath === path) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100 text-slate-400", className)}>
        <HiOutlinePhoto className={cn("opacity-50", iconSize)} />
      </div>
    );
  }

  const image = <img src={resolveImageSrc(path)} alt={alt} className={imgCls} onError={() => setFailedPath(path)} />;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("block overflow-hidden p-0", className)}>
        {image}
      </button>
    );
  }

  return <div className={cn("overflow-hidden", className)}>{image}</div>;
}
