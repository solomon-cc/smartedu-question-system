import { defineComponent, h } from 'vue';
import { mdi } from 'vuetify/iconsets/mdi';
import { makeIconProps } from 'vuetify/lib/composables/icons.js';
import { auth } from '../../stores/auth';
import { naiveIcons, studentIconNames } from './naiveIcons';

/** Keep staff icons intact; reuse the official SVGs throughout the student UI. */
export const NaiveIcon = defineComponent({
  name: 'NaiveIcon',
  props: makeIconProps(),
  setup(props) {
    return () => {
      const name = typeof props.icon === 'string' ? props.icon : '';
      const markup = naiveIcons[name];
      if (!markup) return h(mdi.component, props);
      const illustrated =
        ['cat', 'rabbit', 'bear', 'heart', 'smile', 'snail'].includes(name) ||
        name.startsWith('mood-');
      return h(props.tag, { class: 'naive-v-icon', 'data-naive-icon': name }, [
        h('svg', {
          viewBox: '0 0 48 48',
          xmlns: 'http://www.w3.org/2000/svg',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 3.5,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: illustrated ? { color: 'var(--island-sticker-ink, #315e4c)' } : undefined,
          // Static, validated repository SVG primitives, never user content.
          innerHTML: markup,
        }),
      ]);
    };
  },
});

export const StudentIcon = defineComponent({
  name: 'StudentIcon',
  props: makeIconProps(),
  setup(props) {
    return () => {
      const name =
        auth.user?.role === 'STUDENT' &&
        typeof props.icon === 'string' &&
        studentIconNames[props.icon];
      return name ? h(NaiveIcon, { ...props, icon: name }) : h(mdi.component, props);
    };
  },
});
