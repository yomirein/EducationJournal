bind('[data-form="broadcast"]', form => run(async () => {
  await api.post(`/streams/${form.stream_id.value}/broadcasts`, { text: form.text.value });
  form.text.value = '';

  // Show the list of the stream the message was just posted to.
  const listPicker = document.querySelector('[data-stream-reload="broadcasts"]');

  if (listPicker) listPicker.value = form.stream_id.value;

  await refreshPageData();
}, 'Объявление опубликовано.'));

bind('[data-form="reject-file"]', form => run(async () => {
  await api.delete(
    `/streams/${form.stream_id.value}/tasks/${form.task_id.value}/submissions/${form.submission_id.value}/file?reason=${encodeURIComponent(form.reason.value)}`
  );

  form.reason.value = '';
  await refreshPageData();
}, 'Файл удалён, причина сохранена.'));
