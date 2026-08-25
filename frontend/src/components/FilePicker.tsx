/**
 * One treatment for "open a file you were sent".
 *
 * It appears three times — a payslip on Employee, a bundle and a payslip on
 * Claim — and was two different controls: a native `<input type="file">` on one
 * page and a styled label on the other. Same act, same document, two looks.
 *
 * A hidden input inside a label rather than a restyled native control, because
 * the native one renders its own "no file chosen" text that cannot be replaced,
 * and here the useful confirmation is *which period* loaded rather than a
 * filename. Keyboard access survives: a label wrapping a focusable input is
 * still reachable and still activates on Enter.
 *
 * It hands over the `File` and reads nothing. An earlier version called
 * `.text()` for the caller, which is right for a payslip and wrong for a
 * roster workbook — picking a file and decoding one are different jobs, and
 * only the caller knows which decoding applies.
 */
export function FilePicker({
  label,
  loaded,
  accept = "application/json,.json",
  disabled,
  onFile,
}: {
  /** What to show before anything is chosen. */
  label: string;
  /** What to show once something is, or null while empty. */
  loaded?: string | null;
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void | Promise<void>;
}) {
  return (
    <label className={loaded ? "file-picker done" : "file-picker"}>
      {loaded ? `✓ ${loaded}` : label}
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void onFile(file);
          // Cleared so choosing the same file twice still fires a change —
          // which is exactly what someone does after a failed read.
          event.target.value = "";
        }}
      />
    </label>
  );
}
