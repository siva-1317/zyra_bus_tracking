const listeners = new Set();

export const toast = {
  show: ({ type = "info", title = "", message = "" }) => {
    listeners.forEach((fn) => fn({ type, title, message }));
  },
};

export const onToast = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
