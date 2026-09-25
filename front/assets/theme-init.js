// Runs before first paint (blocking, in <head>) so the saved theme never flashes.
(function () {
  try {
    var dark = localStorage.getItem('pixelstart_theme') === 'dark';
    var root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.classList.toggle('dark', dark);
  } catch (e) {}
})();
