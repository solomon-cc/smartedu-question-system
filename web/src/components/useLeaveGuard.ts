import { onBeforeUnmount } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { Modal } from '@arco-design/web-vue';
export function useLeaveGuard(dirty: () => boolean, busy: () => boolean = () => false) {
  let pending = false;
  function confirm(): Promise<boolean> {
    if (busy()) return Promise.resolve(false);
    if (!dirty()) return Promise.resolve(true);
    if (pending) return Promise.resolve(false);
    pending = true;
    return new Promise((resolve) => {
      Modal.warning({
        title: '放弃未保存的修改？',
        content: '输入内容尚未保存，可以继续编辑或放弃本次修改。',
        okText: '放弃修改',
        cancelText: '继续编辑',
        hideCancel: false,
        onOk: () => {
          pending = false;
          resolve(true);
        },
        onCancel: () => {
          pending = false;
          resolve(false);
        },
      });
    });
  }
  onBeforeRouteLeave(confirm);
  const unload = (e: BeforeUnloadEvent) => {
    if (dirty() || busy()) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', unload);
  onBeforeUnmount(() => window.removeEventListener('beforeunload', unload));
  return { confirm };
}
