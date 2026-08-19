export const relayKeyRules = (editing: boolean) => [{
  required: !editing,
  message: '请输入 API Key',
  trigger: 'blur',
}]
