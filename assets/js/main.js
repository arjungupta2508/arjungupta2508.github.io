/* Theme toggle. Follows the system setting until the visitor chooses. */
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function current() {
    return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light');
  }
  function announce() { document.dispatchEvent(new Event('themechange')); }

  if (btn) {
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      announce();
    });
  }
  if (mq.addEventListener) mq.addEventListener('change', announce);
})();
