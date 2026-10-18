import { afterEach, describe, expect, it } from 'vitest';
import { editableOptions } from './questionEditor';
import { validateForm, focusFormAlert } from './forms';
import type { Question } from './types';

afterEach(() => document.body.replaceChildren());
describe('question editing', () => {
  it('allows extending a legacy two-option question without changing its saved options', () => {
    const question = {
      options: [
        { value: 'A', text: '5' },
        { value: 'B', image: '/six.png' },
      ],
    } as Question;
    const options = editableOptions(question);
    expect(options.map((option) => option.value)).toEqual(['A', 'B', 'C', 'D']);
    expect(options[1].image).toBe('/six.png');
    options[0].text = 'edited';
    expect(question.options?.[0].text).toBe('5');
  });
  it('preserves additional legacy options', () => {
    expect(editableOptions({ options: [{ value: 'E', text: 'extra' }] } as Question)[4].text).toBe(
      'extra',
    );
  });
});
describe('form error recovery', () => {
  function formEvent(valid: boolean) {
    const form = document.createElement('form');
    form.innerHTML =
      '<input aria-label="valid"><textarea aria-invalid="true"></textarea><input aria-invalid="true"><div tabindex="-1" data-form-error>Save failed</div>';
    document.body.append(form);
    return { form, event: Object.assign(Promise.resolve({ valid }), { target: form }) };
  }
  it('moves focus to the first invalid field', async () => {
    const { form, event } = formEvent(false);
    expect(await validateForm(event)).toBe(false);
    expect(document.activeElement).toBe(form.querySelector('textarea'));
  });
  it('leaves focus alone after successful validation', async () => {
    const { form, event } = formEvent(true);
    form.querySelector('input')!.focus();
    expect(await validateForm(event)).toBe(true);
    expect(document.activeElement).toBe(form.querySelector('input'));
  });
  it('makes a server error accessible without clearing the form', async () => {
    const { form, event } = formEvent(true);
    form.querySelector('textarea')!.value = 'unsaved content';
    await focusFormAlert(event);
    expect(document.activeElement).toBe(form.querySelector('[data-form-error]'));
    expect(form.querySelector('textarea')!.value).toBe('unsaved content');
  });
});

it('skips hidden Vuetify autocomplete inputs when focusing an invalid field', async () => {
  const form = document.createElement('form');
  form.innerHTML = '<div class="v-input--error"><input type="hidden"><input role="combobox"></div>';
  document.body.append(form);
  const event = Object.assign(Promise.resolve({ valid: false }), { target: form });
  expect(await validateForm(event)).toBe(false);
  expect(document.activeElement).toBe(form.querySelector('[role="combobox"]'));
});
