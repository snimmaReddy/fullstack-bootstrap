import { Button, Group, Stepper } from '@mantine/core';
import { useState, type ReactNode } from 'react';

export interface WizardStep {
  label: string;
  description?: string;
  content: ReactNode;
  /** Return false (or throw) to stay on this step, e.g. () => !form.validate().hasErrors */
  validate?: () => boolean | Promise<boolean>;
}

/**
 * Multi-step flow with Back / Next / Finish.
 * <Wizard steps={[{ label: 'Details', content: <DetailsFields />, validate: () => … }, …]} onFinish={save} />
 */
export function Wizard({ steps, onFinish, finishLabel = 'Finish' }: {
  steps: WizardStep[];
  onFinish: () => void | Promise<void>;
  finishLabel?: string;
}) {
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const last = active === steps.length - 1;

  const next = async () => {
    setBusy(true);
    try {
      if ((await steps[active].validate?.()) === false) return;
      if (last) await onFinish();
      else setActive(active + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stepper active={active} onStepClick={(i) => i < active && setActive(i)} size="sm">
        {steps.map((s) => (
          <Stepper.Step key={s.label} label={s.label} description={s.description}>{s.content}</Stepper.Step>
        ))}
      </Stepper>
      <Group justify="flex-end" mt="xl">
        {active > 0 && <Button variant="default" onClick={() => setActive(active - 1)} disabled={busy}>Back</Button>}
        <Button onClick={next} loading={busy}>{last ? finishLabel : 'Next'}</Button>
      </Group>
    </>
  );
}
