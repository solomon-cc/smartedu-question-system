import { nextTick } from 'vue';
export type FormSubmit = Promise<{ valid: boolean }> & { target?: EventTarget | null };
export async function validateForm(event: FormSubmit) {
  const { valid } = await event;
  if (!valid) {
    await nextTick();
    const form = event.target instanceof HTMLElement ? event.target : null;
    const field = form?.querySelector<HTMLElement>(
      'input[aria-invalid="true"]:not([type="hidden"]):not([disabled]), textarea[aria-invalid="true"]:not([disabled]), select[aria-invalid="true"]:not([disabled]), .v-input--error input:not([type="hidden"]):not([disabled]), .v-input--error textarea:not([disabled]), .v-input--error select:not([disabled])',
    );
    field?.focus();
    field?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
  }
  return valid;
}
export async function focusFormAlert(event: FormSubmit) {
  await nextTick();
  const form = event.target instanceof HTMLElement ? event.target : null;
  const alert = form?.querySelector<HTMLElement>('[data-form-error]');
  alert?.focus();
  alert?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
}
