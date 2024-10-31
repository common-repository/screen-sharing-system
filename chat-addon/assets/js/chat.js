document.addEventListener('DOMContentLoaded', function() {
  // Initialisation des éléments
  const chatHeader = document.getElementById('chat-header');
  const toggleChatButton = document.getElementById('toggle-chat');
  const floatingChatButton = document.getElementById('floating-chat-button');
  const chatContainer = document.getElementById('chat-container');

  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatInputField = document.getElementById('chat-input-field');
  const sendButton = chatInput.querySelector('button');
  const fileAttachment = document.getElementById('file-attachment');
  const autoScrollCheckbox = document.getElementById('auto-scroll-checkbox');
  const filePreviewContainer = document.getElementById('file-preview-container');
  const fileThumbnail = document.getElementById('file-thumbnail');
  const progressBar = document.getElementById('progress-bar');
  const acceptFileButton = document.getElementById('accept-file');
  const rejectFileButton = document.getElementById('reject-file');
  const fileStatus = document.getElementById('file-status');

  let dataChannel;
	let blobChannel;
  let fileTransferInProgress = false;
  const isLoggingEnabled = true;
  let peerConnection;
  let connected_tochat = false;
	window.trackMetadataMap = new Map();
	let wasVideoOpen = false;

  let receivedChunks = [];
  let receivedFileSize = 0;
  let fileName = '';
  let expectedFileSize = 0;
  const fileStorage = {}; // Store files with filenames as keys

  function log(...args) {
    if (isLoggingEnabled) {
      console.log(...args);
    }
  }

  function listenDataChannel() {
    if (dataChannel) {
      log('DataChannel is ready:', dataChannel.readyState);

      dataChannel.onmessage = (event) => {
        //log('DataChannel onmessage event:', event);

        if (event.data instanceof ArrayBuffer) {
          log('Received ArrayBuffer data.');
          receiveFileChunk(event.data);
        } else if (event.data instanceof Blob) {
          //log('Received Blob data.');
          const reader = new FileReader();
          reader.onload = () => {
            try {
              //log('Attempting to parse message data:', reader.result);
              const parsedData = JSON.parse(reader.result);
              handleIncomingMessage(parsedData);
            } catch (e) {
				receiveFileChunk(event.data);
              //console.error('Error parsing message data:', e);
              //console.log('Raw data received:', reader.result);
            }
          };
          reader.readAsText(event.data);
        } else {
          //log('Received non-ArrayBuffer/Blob data:', event.data);
          try {
            //log('Attempting to parse message data:', event.data);
            const parsedData = JSON.parse(event.data);
            handleIncomingMessage(parsedData);
          } catch (e) {
            console.error('Error parsing message data:', e);
            //console.log('Raw data received:', event.data);
          }
        }
      };
    } else {
      log('DataChannel is not yet initialized.');
    }
  }
	
	function listenBlobChannel() {
    if (blobChannel) {
      log('BlobChannel is ready:', blobChannel.readyState);

      blobChannel.onmessage = (event) => {
        //log('BlobChannel onmessage event:', event);

        if (event.data instanceof ArrayBuffer) {
          log('Received ArrayBuffer data.');
          receiveFileChunk(event.data);
        } else if (event.data instanceof Blob) {
          //log('Received Blob data.');
          const reader = new FileReader();
          reader.onload = () => {
            try {
              //log('Attempting to parse message data:', reader.result);
              const parsedData = JSON.parse(reader.result);
              handleIncomingMessage(parsedData);
            } catch (e) {
				receiveFileChunk(event.data);
              //console.error('Error parsing message data:', e);
              //console.log('Raw data received:', reader.result);
            }
          };
          reader.readAsText(event.data);
        } else {
          log('Received non-ArrayBuffer/Blob data:', event.data);
          try {
            log('Attempting to parse message data:', event.data);
            const parsedData = JSON.parse(event.data);
            handleIncomingMessage(parsedData);
          } catch (e) {
            console.error('Error parsing message data:', e);
            //console.log('Raw data received:', event.data);
          }
        }
      };
    } else {
      log('BlobChannel is not yet initialized.');
    }
  }

  function preinitialize() {
    log("Initializing DataChannel");
    dataChannel = window.dataChannel;
    if (dataChannel && dataChannel.isOfferer) {
      log('DataChannel is offerer.');
      listenDataChannel();
    } else {
      log('DataChannel is not offerer or not initialized.');
      listenDataChannel();
    }
	  log("Initializing BlobChannel");
    blobChannel = window.blobChannel;
    if (blobChannel && blobChannel.isOfferer) {
      log('BlobChannel is offerer.');
      listenBlobChannel();
    } else {
      log('BlobChannel is not offerer or not initialized.');
      listenBlobChannel();
    }
	  log('Pre-initializing...');
    // Set up signaling
    /*const signaling = {
      send: (message) => {
        log('Sending signaling message:', message);
        if (dataChannel && dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify(message));
        }
      },
      onmessage: (message) => {
        log('Received signaling message:', message);
        if (message.type === 'offer') {
          peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer))
            .then(() => peerConnection.createAnswer())
            .then((answer) => peerConnection.setLocalDescription(answer))
            .then(() => signaling.send({ type: 'answer', answer: peerConnection.localDescription }));
        } else if (message.type === 'answer') {
          peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.type === 'candidate') {
          peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      }
    };*/
  }

  function initializeChat() {
    sendButton.addEventListener('click', () => {
      log('Send button clicked.');
      sendMessage(true);
    });
    chatInputField.addEventListener('input', () => {
      log('Chat input field changed.');
      sendTyping();
    });
    chatInputField.addEventListener('keydown', handleKeydown);
    fileAttachment.addEventListener('click', handleFileAttachment);
    chatHeader.addEventListener('click', () => {
      log('Chat header clicked.');
      chatContainer.classList.toggle('collapsed');
    });
    floatingChatButton.addEventListener('click', toggleChatVisibility);
    toggleChatButton.addEventListener('click', toggleChatVisibility);

    autoScrollCheckbox.addEventListener('change', () => {
      log('Auto-scroll checkbox changed:', autoScrollCheckbox.checked);
      if (autoScrollCheckbox.checked) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    });
  }

  function handleKeydown(event) {
    log('Keydown event:', event);
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        chatInputField.value += '\n';
        event.preventDefault();
      } else {
        event.preventDefault();
        log('Enter key pressed without Shift.');
        sendMessage(true);
      }
    }
  }

  function handleFileAttachment() {
    log('File attachment clicked.');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      log('File selected:', file);
      if (file && blobChannel && blobChannel.readyState === 'open') {
        fileStorage[file.name] = file; // Store file in fileStorage
        const fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type
        };
		filePreviewContainer.style.display = 'block';
    fileThumbnail.src = ''; // Set a default image or file icon
    fileThumbnail.alt = `Preview of ${fileInfo.name}`;
		  acceptFileButton.style.display = 'none';
			  rejectFileButton.style.display = 'none';
        const fileInfoBlob = new Blob([JSON.stringify(fileInfo)], { type: 'application/json' });
        blobChannel.send(fileInfoBlob);
      }
    });
    fileInput.click();
  }

  function displayFilePreview(fileInfo) {
    log('Displaying file preview:', fileInfo);
    filePreviewContainer.style.display = 'block';
    fileThumbnail.src = ''; // Set a default image or file icon
    fileThumbnail.alt = `Preview of ${fileInfo.name}`;

    fileStatus.textContent = `File: ${fileInfo.name} (${Math.round(fileInfo.size / 1024)} KB)`;
	  
	  acceptFileButton.disabled = acceptFileButton.disabled ? false : acceptFileButton.disabled;
		rejectFileButton.disabled = rejectFileButton.disabled ? false : acceptFileButton.disabled;
    acceptFileButton.style.display = 'inline-block';
    rejectFileButton.style.display = 'inline-block';

    acceptFileButton.onclick = () => {
		acceptFileButton.disabled = true;
		rejectFileButton.disabled = true;
      log('Accept file button clicked.');
      fileStatus.textContent = `Receiving file '${fileInfo.name}'...`;
      // Notify the sender to start sending the file with the filename
      sendMessageToSender('accept', fileInfo.name);
      // Set fileName and expectedFileSize for handling file chunks
      fileName = fileInfo.name;
      expectedFileSize = fileInfo.size;
      fileTransferInProgress = true;
    };
    rejectFileButton.onclick = () => {
      log('Reject file button clicked.');
      fileStatus.textContent = 'File rejected.';
      filePreviewContainer.style.display = 'none';
    };
  }

  function sendMessageToSender(type, content) {
    if (dataChannel && dataChannel.readyState === 'open') {
      const messageData = {
        type: type,
        content: content
      };
      log('Sending message to sender:', messageData);
      try {
        dataChannel.send(JSON.stringify(messageData));
      } catch (error) {
        console.error('Error sending message to sender:', error);
      }
    } else {
      console.warn('Data channel is not open.');
    }
  }
/*
  function sendFile(file) {
    log('Sending file:', file);
    const chunkSize = 1048576; // 1 MB
    let offset = 0;
    const reader = new FileReader();

    reader.onload = function(event) {
      //log('Sending chunk:', event.target.result);
      dataChannel.send(event.target.result);
      offset += event.target.result.byteLength;
      const progress = Math.min(100, (offset / file.size) * 100);
      progressBar.style.width = progress + '%';

      if (offset >= file.size) {
        fileTransferInProgress = false;
        fileStatus.textContent = 'File sent successfully.';
    filePreviewContainer.style.display = 'none';
		  // Display the status message in the chat in italic
  displayStatusMessageInChat(fileStatus.textContent);
		  
      } else {
        readNextChunk();
      }
    };

    function readNextChunk() {
      const slice = file.slice(offset, offset + chunkSize);
      //log('Reading next chunk:', slice);
      reader.readAsArrayBuffer(slice);
    }

    readNextChunk();
  }
*/
	
	async function sendFile(file) {
    log('Sending file:', file);
    const chunkSize = 256 * 1024; // 256 KB
    let offset = 0;

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(chunk);
      });

      if (blobChannel.readyState === 'open') {
        blobChannel.send(arrayBuffer);
        offset += arrayBuffer.byteLength;
        const progress = Math.min(100, (offset / file.size) * 100);
        progressBar.style.width = progress + '%';
      } else {
        log('BlobChannel is closed. Aborting file send.');
        break;
      }

      // Yield to the event loop to allow other messages to be processed
      //await new Promise(requestAnimationFrame);?
      // Yield to the event loop to allow other messages to be processed
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (offset >= file.size) {
      fileTransferInProgress = false;
      fileStatus.textContent = 'File sent successfully.';
	  filePreviewContainer.style.display = 'none';
	  displayStatusMessageInChat(fileStatus.textContent);
    }
  }
	
  function receiveFileChunk(chunk) {
    //log('Receiving file chunk.');
    receivedChunks.push(chunk);
    receivedFileSize += chunk.size; //byteLength;
	  
	  const progress = Math.min(100, (receivedFileSize / expectedFileSize) * 100);
	  progressBar.style.width = progress + '%';

    if (receivedFileSize >= expectedFileSize) {
      saveReceivedFile();
    }
  }

  function saveReceivedFile() {
    log('Saving received file.');
    const blob = new Blob(receivedChunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    receivedChunks = [];
    receivedFileSize = 0;
    fileStatus.textContent = `File received and saved as '${fileName}'`;
	  
	   // Hide the file preview container
  filePreviewContainer.style.display = 'none';

  // Display the status message in the chat in italic
  displayStatusMessageInChat(fileStatus.textContent);
  }
	
	function displayStatusMessageInChat(message) {
  const statusMessageElement = document.createElement('div');
  statusMessageElement.textContent = message;
  statusMessageElement.style.fontStyle = 'italic';
  chatMessages.appendChild(statusMessageElement);

  if (autoScrollCheckbox.checked) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}


  function handleIncomingMessage(data) {
    log('Handling incoming message:', data);
    if (data.name && data.size) {
      // Display file preview and accept/reject options
      fileName = data.name;
      displayFilePreview(data);
    } else if (data.type === 'accept') {
      // Start sending file chunks when file is accepted
      if (data.content) { // This should be the filename
        const file = fileStorage[data.content]; // Retrieve the file by name
        if (file) {
          sendFile(file);
        } else {
          console.error('File not found:', data.content);
        }
      }
    } else if (data.type === 'typing') {
      updateTypingMessage(data.content);
    } else if (data.type === 'message') {
      if (data.final) {
        displayFinalMessage(data.content, true);
      } else {
        updateTypingMessage(data.content);
      }
    } else if (data.type === 'answer' || data.type === 'candidate' || data.type === 'offer') {
		receivedSignalingMessage(data);
	} else if (data.type === 'trackMetadata') {
    	console.log(`Received metadata for track ${data.trackId}: kind=${data.kind}, contentHint=${data.contentHint}`);
    	window.trackMetadataMap = window.trackMetadataMap.set(data.trackId, data.contentHint);
		// Envoyer un accusé de réception
  		sendAcknowledgment();
	} else if (data.type === 'metadata-ack') {
    onTrackMetadataReceived();
  } else {
      console.warn('Unknown message type:', data.type);
    }
  }
	
	function sendAcknowledgment() {
  // Envoyer une réponse pour indiquer que les métadonnées ont été reçues
  sendSignalingMessage({ type: 'metadata-ack' });
}

  function updateTypingMessage(content) {
    log('Updating typing message:', content);
    let typingMessage = document.getElementById('typing-message');
    if (!typingMessage) {
      typingMessage = document.createElement('div');
      typingMessage.id = 'typing-message';
      chatMessages.appendChild(typingMessage);
    }
    typingMessage.textContent = content;
  }

  function displayFinalMessage(content, isOpponent = false) {
    log('Displaying final message:', content);
    const message = document.createElement('div');
    message.textContent = content;
    message.classList.add('final-message');
    if (isOpponent) {
      message.classList.add('opponent-message');
    } else {
      message.classList.add('my-message');
    }
    chatMessages.appendChild(message);

    let typingMessage = document.getElementById('typing-message');
    if (typingMessage) typingMessage.remove();

    if (autoScrollCheckbox.checked) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    setTimeout(() => message.classList.add('bubble'), 0);
  }

  function sendMessage(final = false) {
    const messageContent = chatInputField.value.trim();
    if (messageContent && dataChannel && dataChannel.readyState === 'open') {
      const messageData = {
        type: 'message',
        content: messageContent,
        final: final
      };
      log('Sending message:', messageData);
      try {
        dataChannel.send(JSON.stringify(messageData));
        displayFinalMessage(messageContent, false);
        chatInputField.value = '';
        log('Input field reset after final message.');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.warn('Message content is empty or data channel is closed.');
    }
  }

  function sendTyping() {
    if (dataChannel && dataChannel.readyState === 'open') {
      const messageData = {
        type: 'typing',
        content: chatInputField.value
      };
      log('Sending typing message:', messageData);
      dataChannel.send(JSON.stringify(messageData));
    }
  }

  function checkLicense() {
    log('Checking license...');
    return fetch('/wp-json/myplugin/v1/check-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        license_key: 'user-specific-license-key'
      }),
    })
    .then(response => response.json());
  }

  function toggleChatVisibility() {
    preinitialize();
    initializeChat();
    log('Toggling chat visibility.');
    //chatContainer.classList.toggle('open');
     if (chatContainer.classList.contains('open')) {
      chatContainer.classList.remove('open');
      chatContainer.classList.add('closed');
      if (videoContainer.style.display === 'block') {
        videoContainer.style.display = 'none';
        wasVideoOpen = true;
      }
    } else {
      chatContainer.classList.remove('closed');
      chatContainer.classList.add('open');
      if (wasVideoOpen) {
        videoContainer.style.display = 'block';
        wasVideoOpen = false;
      }
    }
  }

  checkLicense().then(license => {
    log('License check response:', license);
    if (!license.valid) {
      //preinitialize();
      //initializeChat();
    } else {
      console.error('License is invalid or expired.');
    }
  }).catch(error => {
    console.error('Error checking license:', error);
  });
	preinitialize();
	initializeChat();
	
	let localStreamFace = new MediaStream();
let isAudioEnabled = false;
let isVideoEnabled = false;

const microphoneToggle = document.getElementById('microphone-toggle');
const cameraToggle = document.getElementById('camera-toggle');
const videoContainer = document.getElementById('video-container-face');
const refreshViewButton = document.getElementById('refresh-view');
const chatWrapper = document.getElementById('chat-wrapper');

microphoneToggle.addEventListener('click', toggleMicrophone);
cameraToggle.addEventListener('click', toggleCamera);
refreshViewButton.addEventListener('click', handleViewChange);
	
 // Fonction pour rafraîchir la vue des vidéos
  function refreshVideoLayout() {
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    
    // Inverser les positions des vidéos
    if (localVideo.style.order === '1') {
      localVideo.style.order = '0';
      remoteVideo.style.order = '1';
    } else {
      localVideo.style.order = '1';
      remoteVideo.style.order = '0';
    }
  }
	
	function handleViewChange() {
  const windowWidth = window.innerWidth;
		refreshViewButton.classList.add('animate');
    setTimeout(() => {
        refreshViewButton.classList.remove('animate');
    }, 1000); // Stop l'animation après une rotation complète
  if (windowWidth >= 768) {
    // Comportement pour plus de 768px de large
    refreshVideoLayout();
  } else {
	
refreshVideoLayout();
 /* if (videoContainer.nextElementSibling === chatContainer) {
    chatWrapper.insertBefore(chatContainer, videoContainer);
  } else {
    chatWrapper.insertBefore(videoContainer, chatContainer);
  } */
	  /*console.log(videoContainer.style.right);
	  videoContainer.style.right = '-125%';
	  chatContainer.style.left = '-85%';*/
	  /*videoContainer.classList.add('rotate-view');
	  chatContainer.classList.add('rotate-view');*/
	  // Retirer la classe collapsed avant d'initier la rotation
    //chatContainer.classList.remove('collapsed');
    //setTimeout(() => {
      
    //}, 500); // Temps correspondant à la durée de votre transition CSS

        // Basculer la visibilité pour correspondre à l'état de rotation
       /* if (videoContainer.classList.contains('rotate-view')) {
            videoContainer.style.visibility = 'hidden';
            chatContainer.style.visibility = 'visible';
        } else {
            videoContainer.style.visibility = 'visible';
            chatContainer.style.visibility = 'hidden';
        }*/
  }
}

async function toggleMicrophone() {
  if (isAudioEnabled) {
    disableAudio();
  } else {
    await enableAudio();
  }
}

async function toggleCamera() {
  const videoContainer = document.getElementById('video-container-face');
  const chatContainer = document.getElementById('chat-container');
  const chatWrapper = document.getElementById('chat-wrapper');

  if (isVideoEnabled) {
    await disableVideo();
    if (window.innerWidth < 768) { // Logic for mobile
      /*videoContainer.style.display = 'none';*/
      // chatContainer.style.display = 'block'; // Ou ajustez selon votre design
      chatWrapper.classList.remove('video-active');
		 if (videoContainer.nextElementSibling === chatContainer) {
      chatWrapper.insertBefore(chatContainer, videoContainer);
      // Passer le chat en relative pour le repositionnement
      chatContainer.style.position = 'relative';
      // Animation pour le conteneur vidéo si nécessaire
      videoContainer.style.transition = 'transform 0.3s ease';
      videoContainer.style.transform = 'translateY(0)'; // Ajustez selon besoin
		  //chatContainer.style.position = 'fixed';
    } else {
      chatWrapper.insertBefore(videoContainer, chatContainer);
      // Repasser en fixed si nécessaire, mais vous pourriez vouloir garder 'relative' pour la cohérence
      // chatContainer.style.position = 'fixed';
      // Optionnel: remettre la position de la vidéo à sa place initiale
      videoContainer.style.transform = 'translateY(100%)';
    }
    }
	  else {
		  videoContainer.style.display = 'none';
    chatWrapper.classList.remove('video-active'); 
	  }
  } else {
	  //if (peerConnection)
    await enableVideo();
    if (window.innerWidth < 768) { // Mobile-specific logic
      /*videoContainer.style.display = 'block';*/
      // chatContainer.style.display = 'none'; // Ou ajustez selon votre design
      chatWrapper.classList.add('video-active');
	  if (videoContainer.nextElementSibling === chatContainer) {
    // Cacher temporairement le chat
    chatContainer.style.visibility = 'hidden';
    chatContainer.style.opacity = '0';
    
    // Laisser le temps au conteneur vidéo de se déployer
    setTimeout(() => {
      chatWrapper.insertBefore(chatContainer, videoContainer);
		// Avant de repasser en relative, calculez et appliquez la position une sorte de preparation rouge à lèvres
const rect = chatContainer.getBoundingClientRect();
		// Avant de changer la position
chatContainer.style.margin = '0';
		chatContainer.style.marginTop = '-7vh';
chatContainer.style.padding = '0';
		//chatContainer.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
chatContainer.style.left = rect.left + 'px';
chatContainer.style.top = rect.top + 'px';
      chatContainer.style.position = 'relative';
      videoContainer.style.transition = 'transform 0.3s ease';
      videoContainer.style.transform = 'translateY(-100%)';
		
		// Écouteur pour la fin de la transition
      videoContainer.addEventListener('transitionend', function onTransitionEnd() {
        // On s'assure de n'exécuter ce code qu'une seule fois
        videoContainer.removeEventListener('transitionend', onTransitionEnd);
        // Ici, on augmente le z-index après la transition
        videoContainer.style.zIndex = '10'; // Ou toute autre valeur supérieure à celle du chat
      });
      

      // Animation du chat pour qu'il réapparaisse
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          chatContainer.style.visibility = 'visible';
          chatContainer.style.opacity = '1';
          
          // Attendre la fin de la transition du vidéo pour repasser le chat en fixed
          setTimeout(() => {
            chatContainer.style.position = 'fixed';
			    //chatContainer.style.top = '0'; // Ou la position souhaitée par rapport au haut
  chatContainer.style.top = '80%'; // Enlever ou ne pas définir si vous utilisez top
            // Ajustez la position si nécessaire après être repassé en fixed
            // chatContainer.style.top = '0px'; // Ou toute autre valeur appropriée
            // chatContainer.style.left = '0px'; // Si besoin
          }, 300); // Correspond à la durée de transition de videoContainer
        });
      });
    }, 0); // Ce setTimeout permet de s'assurer que cette logique s'exécute après le rendu initial
  } else {
      chatWrapper.insertBefore(videoContainer, chatContainer);
      // Repasser en fixed si nécessaire, mais vous pourriez vouloir garder 'relative' pour la cohérence
      // chatContainer.style.position = 'fixed';
      // Optionnel: remettre la position de la vidéo à sa place initiale
      videoContainer.style.transform = 'translateY(100%)';
    }
    }
	  else {
		  videoContainer.style.display = 'block';
    chatWrapper.classList.add('video-active'); 
	  }
  }
}
	
async function enableAudio() {
	console.log("enable audio");
    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!localStreamFace) {
			console.log("new audio media stream");
            localStreamFace = new MediaStream();
        }
        
        // Vérifier si la piste audio est déjà ajoutée
        const existingAudioTrack = localStreamFace.getAudioTracks()[0];
        if (!existingAudioTrack) {
			audioStream.getAudioTracks()[0].contentHint = 'webcam';
            localStreamFace.addTrack(audioStream.getAudioTracks()[0]);
            peerConnection.addTrack(audioStream.getAudioTracks()[0], localStreamFace);
			//renegotiate();
			console.log("new audio track sended to mapping " + audioStream.getAudioTracks()[0].id);
			sendTrackMetadata(/*audioStream.getAudioTracks()[0]*/localStreamFace, 'webcam');
        }

        isAudioEnabled = true;
        microphoneToggle.textContent = '🔇'; // Change icon to indicate audio is enabled

        // Désactiver la sortie audio locale
        /*const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(audioStream);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        peerConnection.addTrack(destination.stream.getAudioTracks()[0], destination.stream);*/
    } catch (error) {
        console.error('Error accessing microphone:', error);
    }
}

	/*
async function enableAudio() {
  try {
    // Utiliser await pour obtenir le stream audio
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Ajouter le track audio au stream local
    localStreamFace.addTrack(stream.getAudioTracks()[0]);
	peerConnection = window.peerConnection;
    // Ajouter le stream local à la connexion peer
    peerConnection.addStream(localStreamFace);

    // Mettre à jour l'état pour indiquer que l'audio est activé
    isAudioEnabled = true;
    microphoneToggle.textContent = '🔇'; // Change icon to indicate audio is enabled

    // Désactiver la sortie audio locale
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    peerConnection.addTrack(destination.stream.getAudioTracks()[0], destination.stream);
  } catch (error) {
    // Gestion des erreurs avec try...catch
    console.error('Error accessing microphone:', error);
  }
}
*/
/*
async function enableAudio() {
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    addStreamToConnection(audioStream);
    isAudioEnabled = true;
    microphoneToggle.textContent = '🔇'; // Change icon to indicate audio is enabled
  } catch (error) {
    console.error('Error accessing microphone:', error);
  }
}

async function enableVideo() {
  try {
	videoContainer.style.display = 'block';
    chatWrapper.classList.add('video-active'); // Ajoutez la classe pour faire coulisser le chat
    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    addStreamToConnection(videoStream);
    isVideoEnabled = true;
    cameraToggle.textContent = '📴'; // Change icon to indicate video is enabled
  } catch (error) {
    console.error('Error accessing camera:', error);
  }
}
*/
	
	// 3. Fonction pour vérifier la réception des métadonnées
function onTrackMetadataReceived() {
  console.log('Track metadata has been received by the peer.');
  // 4. Lancer la renégociation
  renegotiate();
}

async function enableVideo() {
  try {

    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
	peerConnection = window.peerConnection;
    // Ajoutez uniquement la piste vidéo si elle n'est pas déjà ajoutée
    const videoTrack = videoStream.getVideoTracks()[0];
	videoTrack.contentHint = 'webcam';
    const senders = peerConnection.getSenders();
    const existingVideoSender = senders.find(sender => sender.track && sender.track.kind === 'video' && sender.track.contentHint === 'webcam');
/*	  
	  	peerConnection.ontrack = (event) => {
		console.log("HOOOOOOOOOOOOOO");
		console.warn(event.track.kind);
  const stream = event.streams[0];
  if (event.track.kind === 'video') {
    const remoteVideo = document.querySelector('#chat-wrapper #video-container-face #remote-video');//document.createElement('video');
    remoteVideo.srcObject = stream;
    remoteVideo.autoplay = true;
    document.body.appendChild(remoteVideo);
  } else if (event.track.kind === 'audio') {
    const remoteAudio = document.createElement('audio');
    remoteAudio.srcObject = stream;
    remoteAudio.autoplay = true;
    document.body.appendChild(remoteAudio);
  }
};
*/
    if (existingVideoSender) {
      existingVideoSender.replaceTrack(videoTrack);
    } else {
      peerConnection.addTrack(videoTrack, videoStream);
		console.log("ENvoi du video track pour mapping: " + videoTrack.id);
		sendTrackMetadata(/*videoTrack*/videoStream, 'webcam'); // Vraiment important que le compatriote sait ce qu'il reçoit
		//renegotiate(); // onTrackMetadataReceived
    }

    // Ajouter la piste vidéo au localStream (si nécessaire)
    if (!localStreamFace) {
      localStreamFace = new MediaStream();
		console.log("nouveau local stream video");
    }
    localStreamFace.addTrack(videoTrack);

    // Mettez à jour l'interface utilisateur pour refléter l'état de la caméra activée
    const localVideo = document.getElementById('local-video');
    localVideo.srcObject = videoStream;
    isVideoEnabled = true;
    cameraToggle.textContent = '📷'; // Change icon to indicate video is enabled
  } catch (error) {
	  //console.log("peer not ready");
    console.error('Error accessing camera:', error);
  }
}

function disableAudio() {
	console.log("disable audio 1/2");
  if (localStreamFace) {
	console.log("effectively disable audio 2/2");
    localStreamFace.getAudioTracks().forEach(track => track.stop());
    removeStreamFromConnection('audio');
    isAudioEnabled = false;
    microphoneToggle.textContent = '🎤'; // Change icon to indicate audio is disabled
	  renegotiate();
  }
}
/*
function disableVideo() {
	videoContainer.style.display = 'none';
      chatWrapper.classList.remove('video-active'); // Supprimez la classe pour rétablir la position du chat
  if (localStreamFace) {
    localStreamFace.getVideoTracks().forEach(track => track.stop());
    removeStreamFromConnection('video');
    isVideoEnabled = false;
    cameraToggle.textContent = '📷'; // Change icon to indicate video is disabled
  }
}
*/
	
function disableVideo() {
	console.log("disable video 1/2");
  if (localStreamFace) {
    const videoTrack = localStreamFace.getVideoTracks()[0];
    if (videoTrack) {
	  console.log("effectively disable video 2/3 cause theres a video track");
      videoTrack.stop();
      localStreamFace.removeTrack(videoTrack);
      const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
		  console.log("and remove sender c koi le sender fry");
        peerConnection.removeTrack(sender);
		  renegotiate();
      }
    }
  }
  isVideoEnabled = false;
  cameraToggle.textContent = '📷'; // Change icon to indicate video is disabled
}

function addStreamToConnection(stream) {
  if (!localStreamFace) {
    localStreamFace = new MediaStream();
  }

  stream.getTracks().forEach(track => localStreamFace.addTrack(track));
	peerConnection = window.peerConnection;
  peerConnection.addStream(localStreamFace);
}

function removeStreamFromConnection(type) {
  if (!localStreamFace) return;

  const tracksToRemove = localStreamFace.getTracks().filter(track => track.kind === type);
  tracksToRemove.forEach(track => {
    localStreamFace.removeTrack(track);
	  peerConnection = window.peerConnection;
    peerConnection.removeTrack(peerConnection.getSenders().find(sender => sender.track === track));
  });
}
	
	
	 async function renegotiate() {
		  if (!(peerConnection.signalingState === "stable" || peerConnection.signalingState === "have-local-offer")) {
			   console.log("Cannot add or replace track, signaling state is:", peerConnection.signalingState);
			  return;
		  }
    log('Starting renegotiation.');
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      log('Offer created and set as local description:', offer);

      sendSignalingMessage({ type: 'offer', offer: offer });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessage({ type: 'candidate', candidate: event.candidate });
        }
      };

      /*peerConnection.ontrack = (event) => {
        log('Received track event:', event);
        const [stream] = event.streams;
		const remoteVideo = document.getElementById('remote-video');
        remoteVideo.srcObject = stream;
      };

      peerConnection.ondatachannel = (event) => {
        log('DataChannel received:', event.channel);
        if (event.channel.label === 'dataChannel') {
          dataChannel = event.channel;
          listenDataChannel();
        } else if (event.channel.label === 'blobChannel') {
          blobChannel = event.channel;
          listenBlobChannel();
        }
      };*/
    } catch (error) {
      console.error('Error during renegotiation:', error);
    }
  }
	
	
	function sendSignalingMessage(message) {
    if (dataChannel && dataChannel.readyState === 'open') {
      log('Sending signaling message via DataChannel:', message);
      dataChannel.send(JSON.stringify(message));
    } else {
      log('DataChannel is not open, cannot send signaling message.');
    }
  }
	
	function receivedSignalingMessage(message) {
		peerConnection = window.peerConnection;
		log('Received signaling message via DataChannel:', message);
		if (message.type === 'offer') {
          peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer))
            .then(() => peerConnection.createAnswer())
            .then((answer) => peerConnection.setLocalDescription(answer))
            .then(() => sendSignalingMessage({ type: 'answer', answer: peerConnection.localDescription }));
        } else if (message.type === 'answer') {
          peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.type === 'candidate') {
          peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
	}
	
	// Fonction pour envoyer les métadonnées du flux via le DataChannel
function sendTrackMetadata(track, hint) {
  const trackMetadata = {
    type: 'trackMetadata',
    trackId: track.id,
    //kind: track.kind,
    contentHint: hint// A FUCKING LIE track.contentHint
  };
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify(trackMetadata));
  }
}


});
