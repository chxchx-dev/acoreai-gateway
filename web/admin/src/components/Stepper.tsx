import { NavLink } from 'react-router-dom';

export interface StepDef {
  label: string;
  to?: string;
}

interface StepperProps {
  steps: StepDef[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, i) => {
        const stepNumber = i + 1;
        const isDone = stepNumber < current;
        const isActive = stepNumber === current;
        const circleClass = isActive
          ? 'bg-brand-600 text-white ring-4 ring-brand-100'
          : isDone
            ? 'bg-brand-100 text-brand-700'
            : 'bg-slate-100 text-slate-400';

        const content = (
          <div className="flex items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${circleClass}`}>
              {isDone ? '✓' : stepNumber}
            </span>
            <span className={`text-sm font-medium ${isActive ? 'text-brand-700' : isDone ? 'text-slate-600' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
        );

        return (
          <li key={step.label} className="flex items-center gap-2">
            {step.to !== undefined ? (
              <NavLink to={step.to} end className="cursor-pointer">
                {content}
              </NavLink>
            ) : (
              content
            )}
            {i < steps.length - 1 && <span className={`h-px w-8 ${isDone ? 'bg-brand-200' : 'bg-slate-200'}`} />}
          </li>
        );
      })}
    </ol>
  );
}
