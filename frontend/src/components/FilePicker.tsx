/**
 * One treatment for "open a file you were sent".
 *
 * A hidden input inside a label rather than a restyled native control, because
 * the native one renders its own "no file chosen" text that cannot be replaced.
 * Keyboard access survives: a label wrapping a focusable input is still
 * reachable and still activates on Enter.
 *
 * It hands over the `File` and reads nothing. An earlier version called
 * `.text()` for the caller, which is right for a payslip and wrong for a roster
 * workbook — picking a file and decoding one are different jobs, and only the
 * caller knows which decoding applies.
 *
 * ── Confirmation is a line, not a relabelled button ────────────────────────
 *
 * It used to swap its own label for "✓ <what loaded>" and say nothing else.
 * That was a defensible call while a page had one picker on it, and it stopped
 * being one at three: with a bundle, a payslip and a claim key stacked in a
 * numbered list, every button carries a different sentence, the "choose"
 * affordance disappears exactly where someone might want to re-pick, and there
 * is no single place to look to answer "what have I actually loaded?".
 *
 * So the button keeps a stable label and the confirmation sits beneath it,
 * carrying BOTH the filename and what the file was recognised as. Both, because
 * they fail differently: the filename catches picking the wrong file from a
 * downloads folder full of near-identical JSON, and the recognised description
 * catches picking a real file of the wrong KIND — a termination opening for a
 * claim bundle, or last month's payslip for this month's.
 */
export function FilePicker({
  label,
  loaded,
  filename,
  accept = "application/json,.json",
  disabled,
  onFile,
}: {
  /** What the button says. Constant — it does not become the confirmation. */
  label: string;
  /**
   * What the file was recognised as, once it parsed. Null while empty.
   *
   * Describe the CONTENT, not the act: "claim bundle for March 2026" tells
   * someone they loaded the right thing, where "Loaded" tells them only that
   * the click registered.
   */
  loaded?: string | null;
  /** The name it had on disk. Shown beside `loaded`. */
  filename?: string | null;
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void | Promise<void>;
}) {
  return (
    <div className="file-slot">
      <label className={loaded ? "file-picker done" : "file-picker"}>
        {loaded ? "Choose a different file…" : label}
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
      {loaded ? (
        <p className="file-loaded">
          <span className="file-loaded-mark" aria-hidden="true">✓</span>
          <span className="file-loaded-body">
            <strong>{loaded}</strong>
            {filename ? <span className="file-loaded-name">{filename}</span> : null}
          </span>
        </p>
      ) : null}
    </div>
  );
}
