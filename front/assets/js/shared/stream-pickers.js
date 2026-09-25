// Every select[data-stream-select] lists the curator's own streams. A picker with
// data-stream-reload="X" reloads block X (its [data-load-target="X"] button) on change.
const streamPickers = document.querySelectorAll('select[data-stream-select]');

const streamPickersReady = streamPickers.length
  ? api.get('/users/me/streams').then(streams => {
    streamPickers.forEach(select => {
      select.replaceChildren(...streams.map(stream => new Option(stream.stream_name, stream.stream_id)));

      if (!streams.length) select.append(new Option('У вас пока нет потоков', ''));
    });
  }).catch(error => showMessage(errorText(error), true))
  : Promise.resolve();

document.addEventListener('DOMContentLoaded', () => {
  streamPickersReady.then(() => {
    document.querySelectorAll('select[data-stream-reload]').forEach(select => {
      const reload = () => document.querySelector(`[data-load-target="${select.dataset.streamReload}"]`)?.click();

      select.addEventListener('change', reload);
      reload();
    });
  });
});
