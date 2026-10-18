import { vi } from 'vitest';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { dataTableDefaults } from '../lib/uiDefaults';

export function uiPlugin(width = 1024) {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('visualViewport', { addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  return createVuetify({
    components,
    directives,
    defaults: { VDataTable: dataTableDefaults, VDataTableServer: dataTableDefaults },
  });
}

export function bodyButton(label: string) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === label,
  );
  if (!button) throw new Error('Missing button: ' + label);
  button.click();
}
