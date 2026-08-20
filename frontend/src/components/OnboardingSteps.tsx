/**
 * The three-step path to a first payroll run. This lives on the app side rather
 * than the landing page: a visitor who has not launched the app yet is better
 * served by seeing what the product outputs than by reading its onboarding.
 *
 * `current` is 1-based and drives the "you are here" state. Pass null while the
 * answer is still being read from chain — an unmarked list is honest, a list
 * marking the wrong step is not.
 */
export function OnboardingSteps({ current }: { current: 1 | 2 | 3 | null }) {
  const steps = [
    {
      title: "Register employer",
      body: "Connect your own wallet. It generates your keys — we never see a private key, which is what makes the next step meaningful.",
    },
    {
      title: "Deploy payroll contract",
      body: "You are assigned your own payroll contract, once and permanently. After that not even the platform can write to it or take it back.",
    },
    {
      title: "Upload payroll roster",
      body: "A spreadsheet of names, addresses and salaries — parsed on your machine. Only the salaries enter the proof, and only their sum is published.",
    },
  ];

  return (
    <section className="steps">
      {steps.map((step, i) => {
        const n = i + 1;
        const done = current !== null && n < current;
        const active = current === n;
        return (
          <article
            key={step.title}
            className={done ? "done" : active ? "current" : undefined}
            aria-current={active ? "step" : undefined}
          >
            <div className="step-n">{done ? "✓" : n}</div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        );
      })}
    </section>
  );
}
