const configuredQueues = new WeakSet<object>();

export const markProcessorConfigured = (queue: object): boolean => {
  if (configuredQueues.has(queue)) return false;
  configuredQueues.add(queue);
  return true;
};
