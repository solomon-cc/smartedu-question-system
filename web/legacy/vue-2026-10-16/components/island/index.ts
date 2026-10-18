/** Vue adapters for the MIT Animal Island design language.
 * Keep Vuetify's form validation, model events, keyboard support and focus management.
 * All adapters forward existing props/events/slots; styling activates only for STUDENT.
 */
import { computed, defineComponent, h, inject, type Component, type ComputedRef } from 'vue';
import {
  VBtn,
  VCard,
  VChip,
  VTextField,
  VTextarea,
  VSelect,
  VProgressLinear,
  VDialog,
  VAvatar,
} from 'vuetify/components';
import { auth } from '../../stores/auth';
function adapt(name: string, base: Component, kind: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const islandTheme = inject<ComputedRef<string>>(
        'studentIslandTheme',
        computed(() => 'studentIsland'),
      );
      return () =>
        h(
          base,
          {
            ...attrs,
            class: [attrs.class, auth.user?.role === 'STUDENT' && ['island-ui', 'island-' + kind]],
            ...(auth.user?.role === 'STUDENT' && kind === 'overlay'
              ? { theme: islandTheme.value }
              : {}),
          },
          slots,
        );
    },
  });
}
export const IslandButton = adapt('IslandButton', VBtn, 'button');
export const IslandCard = adapt('IslandCard', VCard, 'card');
export const IslandTag = adapt('IslandTag', VChip, 'tag');
export const IslandInput = adapt('IslandInput', VTextField, 'input');
export const IslandTextarea = adapt('IslandTextarea', VTextarea, 'textarea');
export const IslandSelect = adapt('IslandSelect', VSelect, 'select');
export const IslandProgress = adapt('IslandProgress', VProgressLinear, 'progress');
export const IslandDialog = adapt('IslandDialog', VDialog, 'overlay');
export const IslandAvatar = adapt('IslandAvatar', VAvatar, 'avatar');
