declare module "node-notifier" {
  const notifier: {
    notify(options: { title: string; message: string; sound?: boolean }): void;
  };
  export default notifier;
}
