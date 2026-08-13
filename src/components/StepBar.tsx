interface StepBarProps {
  step: 1 | 2 | 3
}

const STEPS = [
  { n: 1 as const, label: 'Choose' },
  { n: 2 as const, label: 'Customize' },
  { n: 3 as const, label: 'Checkout' },
]

export function StepBar({ step }: StepBarProps) {
  return (
    <ol className="step-bar" aria-label="Invitation steps">
      {STEPS.map((item) => (
        <li
          key={item.n}
          className={`step-item${step === item.n ? ' current' : ''}${step > item.n ? ' done' : ''}`}
        >
          <span className="step-num">{item.n}</span>
          <span className="step-label">{item.label}</span>
        </li>
      ))}
    </ol>
  )
}
