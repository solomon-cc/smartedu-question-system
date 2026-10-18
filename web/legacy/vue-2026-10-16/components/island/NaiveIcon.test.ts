import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createVuetify } from 'vuetify';
const global = { plugins: [createVuetify()] };
import { StudentIcon, NaiveIcon } from './NaiveIcon';
import { auth } from '../../stores/auth';
import type { Role } from '../../lib/types';

function role(value: Role) {
  auth.user = { id: 'test', name: 'Test', username: 'test', role: value };
}
afterEach(() => (auth.user = null));
describe('student SVG icon boundary', () => {
  it('switches a shared icon only for the student role and preserves caller attributes', async () => {
    role('TEACHER');
    const icon = mount(StudentIcon, {
      global,
      props: { icon: 'mdi-notebook-outline', tag: 'i' },
      attrs: { class: 'v-icon', 'aria-hidden': 'true' },
    });
    expect(icon.classes()).toContain('mdi-notebook-outline');
    expect(icon.find('svg').exists()).toBe(false);
    role('STUDENT');
    await nextTick();
    expect(icon.attributes('data-naive-icon')).toBe('book');
    expect(icon.attributes('aria-hidden')).toBe('true');
    expect(icon.find('svg').attributes('viewBox')).toBe('0 0 48 48');
    role('ADMIN');
    await nextTick();
    expect(icon.find('svg').exists()).toBe(false);
    expect(icon.classes()).toContain('mdi-notebook-outline');
    icon.unmount();
  });
  it('keeps unmapped form controls and unknown icons in the original icon set', () => {
    role('STUDENT');
    for (const name of ['mdi-radiobox-marked', 'mdi-checkbox-blank-outline', 'mdi-unknown']) {
      const icon = mount(StudentIcon, { global, props: { icon: name, tag: 'i' } });
      expect(icon.classes()).toContain(name);
      expect(icon.find('svg').exists()).toBe(false);
      icon.unmount();
    }
  });
  it('keeps sadness, neutral and happiness visually distinct', () => {
    const faces = ['mood-cry', 'mood-sad', 'mood-neutral', 'smile', 'mood-excited'].map((name) => {
      const icon = mount(NaiveIcon, { global, props: { icon: name, tag: 'i' } });
      const svg = icon.find('svg').html();
      expect(icon.find('svg').attributes('aria-hidden')).toBe('true');
      icon.unmount();
      return svg;
    });
    expect(new Set(faces).size).toBe(5);
  });
});
