document.addEventListener('DOMContentLoaded', () => {
  const eyeOpen = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const eyeClosed = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 3 18 18"></path><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15.7 15.7 0 0 1-3.1 3.9"></path><path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a10.6 10.6 0 0 0 4.2-.9"></path><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path></svg>';

  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.closest('.password-field')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'password-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(input);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.setAttribute('aria-label', 'Mostrar senha');
    toggle.setAttribute('aria-controls', input.id);
    toggle.setAttribute('aria-pressed', 'false');
    toggle.innerHTML = eyeOpen;
    wrapper.append(toggle);

    const hidePassword = () => {
      input.type = 'password';
      toggle.setAttribute('aria-label', 'Mostrar senha');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.innerHTML = eyeOpen;
    };

    toggle.addEventListener('click', () => {
      const showPassword = input.type === 'password';
      input.type = showPassword ? 'text' : 'password';
      toggle.setAttribute('aria-label', showPassword ? 'Ocultar senha' : 'Mostrar senha');
      toggle.setAttribute('aria-pressed', String(showPassword));
      toggle.innerHTML = showPassword ? eyeClosed : eyeOpen;
    });

    input.form?.addEventListener('reset', hidePassword);
  });
});
