const params = new URLSearchParams(window.location.search);
const error = params.get('error');
if (error) {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = error;
  errorMessage.hidden = false;
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', (event) => {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword) {
      event.preventDefault();
      const errorMessage = document.getElementById('errorMessage');
      errorMessage.textContent = 'Les mots de passe ne correspondent pas.';
      errorMessage.hidden = false;
    }
  });
}
