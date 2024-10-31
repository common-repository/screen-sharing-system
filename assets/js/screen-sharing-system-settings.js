document.addEventListener('DOMContentLoaded', () => {
    const testWsConnectionButton = document.getElementById('test-ws-connection');
    const testIceConnectionButton = document.getElementById('test-ice-connection');
    const resultMessage = document.getElementById('result-message');

    testWsConnectionButton.addEventListener('click', async () => {
        event.preventDefault();
        const wsServer = document.getElementById('ws_server').value;
        const wsPort = document.getElementById('ws_port').value;
        const url = `${wsServer}:${wsPort}/socket.io`;

        resultMessage.textContent = SSSSettings.testing;
        resultMessage.className = 'result-message';
        
        try {
            const socket = new WebSocket(url);
            
            socket.onopen = () => {
                resultMessage.textContent = SSSSettings.okConnection.replace('%s', url);
                resultMessage.className = 'result-message success';
                socket.close();
            };

            socket.onerror = () => {
                resultMessage.textContent = SSSSettings.nokConnection.replace('%s', url);
                resultMessage.className = 'result-message error';
            };
        } catch (error) {
            resultMessage.textContent = SSSSettings.connectionError.replace('%s', error.message);
            resultMessage.className = 'result-message error';
        }
    });

    testIceConnectionButton.addEventListener('click', () => {
        event.preventDefault();
        window.open('https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/', '_blank');
    });

    const toggleLockButton = document.getElementById('toggle-lock');
    const settingsForm = document.querySelector('.settings-form');
    let isLocked = true; // Initial state is locked

    function updateFormState() {
        settingsForm.classList.toggle('unlocked', !isLocked);
        const inputs = settingsForm.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.disabled = isLocked;
        });
    }

    updateFormState();

    toggleLockButton.addEventListener('click', () => {
        event.preventDefault();
        isLocked = !isLocked;
        updateFormState();
    });
});