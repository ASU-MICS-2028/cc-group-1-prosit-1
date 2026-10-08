/**
 * "Hello, Akwaaba! Choose your language" (Figma 01): the greeting is the same in every language, so it
 * is fixed text beside the people picture. Decorative: the question below it is the real heading.
 */
export function LanguageBanner({
  lines = ["Hello,", "Akwaaba!", "Choose your language"],
}: {
  /** Above, highlighted, below (Figma P2 · 01 uses "Welcome!", "Where", "do you farm?") */
  lines?: [string, string, string]
}) {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-358/160 w-full items-center gap-2 overflow-hidden rounded-[30px] bg-cream pl-5"
    >
      <p className="flex shrink-0 flex-col items-start gap-1 text-primary">
        <span className="text-sm font-medium">{lines[0]}</span>
        <span className="rounded-md bg-primary px-2 py-0.5 text-base font-semibold text-primary-foreground">
          {lines[1]}
        </span>
        <span className="text-sm font-medium">{lines[2]}</span>
      </p>
      <img
        src="/illustrations/language-people.svg"
        alt=""
        decoding="async"
        className="h-full min-w-0 flex-1 object-contain"
      />
    </div>
  )
}
