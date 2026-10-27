import { nextTick, type Directive } from 'vue';
// Some Arco components put aria attributes on wrappers rather than the actual controls.
const labelInputs = (el: HTMLElement, label: string) => {
  void nextTick(() =>
    el
      .querySelectorAll('input, textarea')
      .forEach((input) => input.setAttribute('aria-label', label)),
  );
};
export const vFieldLabel: Directive<HTMLElement, string> = {
  mounted: (el, binding) => labelInputs(el, binding.value),
  updated: (el, binding) => labelInputs(el, binding.value),
};
