// Run after the confirmation overlay has left, so it cannot reclaim focus.
export function editingControl(event: FocusEvent) {
  const target = event.target;
  return target instanceof HTMLElement &&
    target.matches(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
    )
    ? target
    : undefined;
}

export function focusEditingControl(selector: string, previous?: HTMLElement) {
  const root = document.querySelector<HTMLElement>(selector);
  const control =
    previous?.isConnected && root?.contains(previous)
      ? previous
      : root?.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
        );
  control?.focus({ preventScroll: true });
}
