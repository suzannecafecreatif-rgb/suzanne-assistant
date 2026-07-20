import { useState } from "react";
import { Copy } from "lucide-react";

/**
 * Copie un texte dans le presse-papier et affiche « Copié » brièvement.
 */
export default function CopyButton({ text, disabled = false, className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text || disabled) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencieux si le presse-papier est indisponible.
    }
  };

  return (
    <div className={`copy-button-wrap${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="btn btn-ghost btn-small"
        onClick={handleCopy}
        disabled={disabled || !text}
      >
        <Copy size={13} aria-hidden="true" />
        Copier
      </button>
      {copied && <span className="copy-button-feedback" aria-live="polite">Copié</span>}
    </div>
  );
}
