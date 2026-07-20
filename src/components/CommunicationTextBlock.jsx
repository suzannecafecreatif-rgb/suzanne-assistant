import CopyButton from "./CopyButton.jsx";

const INSTAGRAM_CAPTION_MAX = 2200;

/**
 * Zone de texte communication avec bouton Copier et compteur optionnel.
 */
export default function CommunicationTextBlock({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  showCharCount = false,
  maxChars = INSTAGRAM_CAPTION_MAX
}) {
  const charCount = (value || "").length;

  return (
    <div className="comm-text-block">
      <div className="comm-text-block-header">
        <span className="label">{label}</span>
        <CopyButton text={value} />
      </div>
      <textarea
        className="input fiche-catalogue-textarea comm-textarea"
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {showCharCount && (
        <p className={`comm-char-count${charCount > maxChars ? " is-over" : ""}`}>
          {charCount.toLocaleString("fr-FR")} / {maxChars.toLocaleString("fr-FR")} caractères
        </p>
      )}
    </div>
  );
}

export { INSTAGRAM_CAPTION_MAX };
