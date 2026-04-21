const toggleButton = document.getElementById('toggleButton');
const statusText = document.getElementById('status');

let isRunning = false;

toggleButton.addEventListener('click', () => {
  isRunning = !isRunning;
  statusText.textContent = isRunning ? 'Visualizing...' : 'Ready';
  toggleButton.textContent = isRunning ? 'Stop' : 'Start';
});
