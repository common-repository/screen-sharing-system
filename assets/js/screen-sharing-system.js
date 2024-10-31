document.addEventListener('DOMContentLoaded', () => {
    const signalingServerUrl = SSSSettings.signalingServerUrl;
    const iceServerUrl = SSSSettings.iceServerUrl;

    const localScreenVideo = document.getElementById('local-screen');
    const remoteScreenVideo = document.getElementById('remote-screen');
    const confirmationPanel = document.getElementById('confirmation-panel');
    const confirmSharingButton = document.getElementById('confirm-sharing');
    const cancelSharingButton = document.getElementById('cancel-sharing');
    const viewingPopup = document.getElementById('viewing-popup');
    const startViewingButton = document.getElementById('start-viewing');
    const stopViewingButton = document.getElementById('stop-viewing');
    const cancelViewingButton = document.getElementById('cancel-viewing');
    const viewingForm = document.getElementById('viewing-form');
    const viewingIdInput = document.getElementById('viewing-id');
    const viewingPasswordInput = document.getElementById('viewing-password');
    const localIdElement = document.getElementById('local-id');
    const remoteIdElement = document.getElementById('remote-id');
    const connectionStatusElement = document.getElementById('connection-status');
    const passwordContainer = document.getElementById('password-container');
    const sharePasswordElement = document.getElementById('share-password');
    const copyPasswordButton = document.getElementById('copy-password');
    const startSharingButton = document.getElementById('start-sharing');
    const stopSharingButton = document.getElementById('stop-sharing');

    let localStream;
    let peerConnection;
    let targetId = null;
    let sharedPassword = null;
    let iceCandidatesQueue = []; // File d'attente pour les candidats ICE
	let ws_connected = false;
	let isWebRTCConnected = false;
	let dataChannel;
	let blobChannel;

    const configuration = {
        iceServers: [{ urls: iceServerUrl }]
    };

    const uniqueId = generateUniqueId();

    if (localIdElement) {
        localIdElement.textContent = uniqueId;
        console.log('ID local affiché:', uniqueId);
    } else {
        console.error('Élément avec l\'ID local-id non trouvé.');
    }/*if (peerConnection){
peerConnection.addEventListener('iceconnectionstatechange', () => {
    console.log('ICE Connection State Changed');
});

peerConnection.addEventListener('iceconnectionstatechange', () => {
    console.log('Another Handler for ICE Connection State Change');
});}*/

    const socket = new WebSocket(signalingServerUrl);

    socket.onopen = () => {
		ws_connected = true;
        console.log('Connexion WebSocket établie.');
        socket.send(JSON.stringify({ type: 'register', id: uniqueId }));
        console.log('Message de registre envoyé avec id:', uniqueId);

        socket.send(JSON.stringify({ type: 'getClients' }));
    };

    socket.onclose = () => {
        console.log('Connexion WebSocket fermée.');
		if (!checkWebRTCConnection()) {
        	//alert('Connection avec le Match maker terminée, veuillez rafraîchir pour récolter un nouvel identifiant');
        	updateViewingStatus('', 'Connection expirée. Veuillez rafraîchir le navigateur.', false);
			updateSharingStatus('', 'Connection expirée. Veuillez rafraîchir le navigateur', '', false);
    	}
		ws_connected = false;
    };

    socket.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
    };

    socket.onmessage = async (message) => {
        try {
            const data = JSON.parse(message.data);
            console.log('Message reçu via WebSocket:', data);

            if (!data || !data.type) {
                console.error('Message WebSocket invalide:', data);
                return;
            }

            switch (data.type) {
                case 'clients':
                    handleClientsList(data.clients);
                    break;
                case 'offer':
                    console.log('Offre reçue:', data);
                    targetId = data.target;
                    remoteIdElement.textContent = targetId;
                    console.log('targetId mis à jour:', targetId);
                    await handleOffer(data);
                    break;
                case 'answer':
                    console.log('Réponse reçue:', data);
                    targetId = data.target;
                    remoteIdElement.textContent = targetId;
                    console.log('targetId mis à jour:', targetId);
                    await handleAnswer(data);
                    break;
                case 'candidate':
                    console.log('Candidate ICE reçue:', data);
                    handleCandidate(data);
                    break;
                case 'clientDisconnected':
                    console.log('Client déconnecté:', data.id);
                    if (data.id === targetId) {
                        // updateConnectionStatus('Non encore connecté', 'not-connected');
                        if (!checkWebRTCConnection()){
         					updateViewingStatus(uniqueId, targetId + ' s\'est déconnecté', false);
							updateSharingStatus(uniqueId, targetId + ' s\'est déconnecté', '', false);
						}
						
                    }
                    break;
                case 'offerRequest':
                    await handleOfferRequest(data);
                    break;
                case 'viewingApproved':
                    console.log('Demande de visionnage approuvée.');
                    startReceiving();
                    break;
                case 'viewingDenied':
                    alert('ID ou mot de passe incorrect.');
                    break;
                case 'viewRequest':
                    // Demande de visionnage à traiter
                    break;
                case 'viewResponse':
                    await handleViewResponse(data);
                    break;
                default:
                    console.warn('Type de message inconnu:', data.type);
            }
        } catch (error) {
            console.error('Erreur lors du traitement du message WebSocket:', error);
        }
    };
	
	function checkWebRTCConnection() {
    if (peerConnection) {
        return peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed';
    }
    return false;
}

    function generateUniqueId() {
        return Math.floor(Math.random() * 1000000).toString();
    }

    function handleClientsList(clients) {
        console.log('Liste des clients:', clients);
    }
	
	// Fonction pour demander confirmation avant de quitter
    function handleBeforeUnload(event) {
        if (isWebRTCConnected) {
            const message = 'Vous avez une connexion active. Êtes-vous sûr de vouloir quitter ?';
            event.returnValue = message; // Standard
            return message; // Pour les navigateurs plus anciens
        }
    }

    // Ajouter l'écouteur pour l'événement beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // N'oubliez pas de retirer l'écouteur si la connexion WebRTC est terminée
    function cleanup() {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    }


function handleConnectionStateChange(event, isOfferer) {
	//console.log("HHUIUHIUHIU8");
    const iceState = peerConnection.iceConnectionState; // ou event.target.iceConnectionState
    const connectionState = peerConnection.connectionState;
	//let id;

	//id = isOfferer ? uniqueId / 100 : targetId / 100;
	if (iceState === 'connected' || connectionState === 'connected') {
		isWebRTCConnected = true;
		//window.peerConnection = peerConnection;
            // Créez le DataChannel ici si la connexion est établie
            /*try {
                if (!dataChannel) { // || dataChannel.readyState !== 'open') {
                    dataChannel = peerConnection.createDataChannel({ negotiated: true, id: 20 });
                    console.log("DataChannel créé:", dataChannel.readyState, "Avec Id:", id, "Offerer:", isOfferer);
					window.screenSharingDataChannel = dataChannel;
                }
            } catch (error) {
                handleDataChannelError(error);
            }*/
			updateViewingStatus(uniqueId, 'Connection établie avec homologue distant '+targetId, true);
			updateSharingStatus(uniqueId, 'Connection établie avec homologue distant '+targetId, '', true );
        }
	
    if (iceState === 'disconnected' || connectionState === 'disconnected') {
		isWebRTCConnected = false;
        console.log('WebRTC connection disconnected');
        //if (dataChannel && dataChannel.readyState === 'open') {
          //  dataChannel.send(JSON.stringify({ type: 'disconnect', message: 'Connection lost' }));
        //}
        // Update UI to show disconnected state
        //document.getElementById('sharing-status').style.display = 'none';
        //document.getElementById('viewing-status').style.display = 'none';
        //alert('Connection with the remote peer has been lost, please refresh to get a new ID.');
		updateViewingStatus(uniqueId, 'Votre homologue '+targetId+' s\'est déconnecté', false);
		updateSharingStatus(uniqueId, 'Votre homologue '+targetId+' s\'est déconnecté', '', false);
		if (!ws_connected){
			updateViewingStatus('', 'Connection terminée par le pair. Rafraichissez avant d\'entamer un nouveau partage' , false);
			updateSharingStatus('', 'Connection terminée par le pair. Rafraîchissez avant d\'entamer un nouveau partage', '', false);
			}
    }
}
	
function handleDataChannelError(error) {
    if (error.name === 'InvalidStateError') {
        console.error('InvalidStateError: The RTCPeerConnection is closed.', error);
    } else if (error.name === 'TypeError') {
        console.error('TypeError: ', error.message);
    } else if (error.name === 'SyntaxError') {
        console.error('SyntaxError: Both maxPacketLifeTime and maxRetransmits cannot be specified.', error);
    } else if (error.name === 'ResourceInUse') {
        console.error('ResourceInUse: The specified id is already in use.', error);
    } else if (error.name === 'OperationError') {
        console.error('OperationError: RTCDataChannel creation failed. This may be due to an invalid or unsupported configuration.', error);
    } else {
        console.error('Unexpected error during RTCDataChannel creation:', error);
    }
}
/*
function handleDataChannelMessage(message) {
    const data = JSON.parse(message);
    if (data.type === 'disconnect') {
        console.log('Received disconnect message from remote peer');
        // Update UI to show disconnected state
        //document.getElementById('sharing-status').style.display = 'none';
        //document.getElementById('viewing-status').style.display = 'none';
        //alert('The remote peer has disconnected, please refresh to get a new ID.');
		updateViewingStatus(uniqueId, 'Votre homologue s\'est déconnecté', false);
		updateSharingStatus(uniqueId, 'Votre homologue s\'est déconnecté', '', false);
    }
}
*/
    async function handleOffer(data) {
        if (peerConnection) {
            peerConnection.close();
        }

        peerConnection = new RTCPeerConnection(configuration);
		window.peerConnection = peerConnection;
				peerConnection.ondatachannel = (event) => {
  const chan = event.channel;
if (chan.label === "chat"){					
					window.dataChannel = chan;
					window.dataChannel.isOfferer = false;
  chan.onopen = (event) => {
    chan.send("Hi back!");
  };
  chan.onmessage = (event) => {
    console.log(event.data);
  };
} else if (chan.label === "blob") {
					window.blobChannel = chan;
					window.blobChannel.isOfferer = false;
  chan.onopen = (event) => {
    chan.send("Hi back!");
  };
  chan.onmessage = (event) => {
    console.log(event.data);
  };
}
			//setInterval(() => {
      //console.log('DataChannel readyState answeranswer:', chan.readyState);
    //}, 1000);
};

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({
                    type: 'candidate',
                    candidate: event.candidate,
                    target: targetId
                }));
            }
        };
		peerConnection.ontrack = (event) => {
    const track = event.track;
			const stream = event.streams[0];
    const hint = window.trackMetadataMap.get(/*track.id*/ stream.id);//const hint = track.contentHint.toLowerCase() || ''; // Convertir en minuscules pour comparaison insensible à la casse
console.log("HOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO" , hint, "origin", track);
    if (!remoteScreenVideo.srcObject && !hint){//!hint || hint.includes('screen') || hint.includes('monitor') || hint === '') {
        // Flux de partage d'écran
        remoteScreenVideo.srcObject = event.streams[0];
    } else if (hint.includes('cam') || hint.includes('camera')) {
		if (track.kind === 'video') {
        // Flux de caméra
        const remoteCamVideo = document.getElementById('remote-video');
        remoteCamVideo.srcObject = event.streams[0];
		}
		else if (track.kind === 'audio') {
			let audioElement = document.getElementById('remote-audio');
			if (!audioElement) {
			audioElement = document.createElement('audio');
				audioElement.id = 'remote-audio';
				document.body.appendChild(audioElement);
			}
			audioElement.srcObject = event.streams[0];
			audioElement.autoplay = true;
		}
    }
};
  /*      peerConnection.ontrack = (event) => {
            remoteScreenVideo.srcObject = event.streams[0];
        };*/

        if (localStream) {
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            target: targetId
        }));

        updateConnectionStatus('En attente de connexion', 'not-connected');

        // Traiter les candidats ICE en attente
        processIceCandidatesQueue();
    }

    async function handleAnswer(data) {
        if (!peerConnection) {
            console.warn('Aucune connexion active pour répondre.');
            return;
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
		
		
		updateSharingStatus(uniqueId, targetId, targetId, true);
    }

    function handleCandidate(data) {
        if (!peerConnection) {
            // Mettre en file d'attente les candidats ICE jusqu'à ce que peerConnection soit prêt
            iceCandidatesQueue.push(data.candidate);
            return;
        }

        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
	/*	let chan;
		try {
			console.log(peerConnection.connectionState);
			console.log(peerConnection.iceConnectionState);
			
			console.log("ANNNNNNSWER");
		chan = peerConnection.createDataChannel("chat", {negotiated: true, id: 0});
		console.log("ready state answer:" + chan.readyState);
			} catch (error) {
        handleDataChannelError(error);
    }*/
		/*setInterval(() => {
      console.log('DataChannel readyState answer:', chan.readyState);
    }, 1000);*/
		//if (window.peerConnection === undefined || window.peerConnection.isOfferer === false){
		/*window.peerConnection = peerConnection;
		if (window.peerConnection.isOfferer !== false)
		window.peerConnection.isOfferer = true;*/
		//console.log("CANDIDATE");}
		//window.screenSharingDataChannel = chan;			
			
	const customArg = false;

peerConnection.oniceconnectionstatechange = event => handleConnectionStateChange(event, customArg);
peerConnection.onconnectionstatechange = event => handleConnectionStateChange(event, customArg);
/*
        dataChannel = peerConnection.createDataChannel('chat');
        dataChannel.onopen = () => {
            console.log('Data channel is open');
        };

        dataChannel.onmessage = (event) => {
            handleDataChannelMessage(event.data);
        };
*/
    }

    function processIceCandidatesQueue() {
        iceCandidatesQueue.forEach(candidate => {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        });
        iceCandidatesQueue = [];
    }

    async function handleOfferRequest(data) {
        if (peerConnection) {
            peerConnection.close();
        }

        peerConnection = new RTCPeerConnection(configuration);
		window.peerConnection = peerConnection;
		const chan = peerConnection.createDataChannel("chat");
		window.dataChannel = chan;
		window.dataChannel.isOfferer = true;
chan.onopen = (event) => {
  chan.send("Hi you!");
};
chan.onmessage = (event) => {
  console.log(event.data);
};
				const blob = peerConnection.createDataChannel("blob");
		window.blobChannel = blob;
		window.blobChannel.isOfferer = true;
blob.onopen = (event) => {
  blob.send("Hi blob you!");
};
blob.onmessage = (event) => {
  console.log(event.data);
};
		/*try {
			console.log(peerConnection.connectionState);
			console.log(peerConnection.iceConnectionState);
			console.log("OOOOOOOOFFFFFFFFFFFFFEEEEEEEEEEERRRRRR");
		chan = peerConnection.createDataChannel("chat", {negotiated: true, id: 0});
		console.log("ready state offer:" + chan.readyState);
			} catch (error) {
        handleDataChannelError(error);
    }*/
	//	setInterval(() => {
    //  console.log('DataChannel readyState offer:', chan.readyState);
    //}, 1000);
		/*window.peerConnection = peerConnection;
		window.peerConnection.isOfferer = false;*/
			//console.log("OFFER");
	//window.screenSharingDataChannel = chan;
	
	const customArg = true;

peerConnection.oniceconnectionstatechange = event => handleConnectionStateChange(event, customArg);
peerConnection.onconnectionstatechange = event => handleConnectionStateChange(event, customArg);
	 //peerConnection.oniceconnectionstatechange = handleConnectionStateChange;
     //peerConnection.onconnectionstatechange = handleConnectionStateChange;
/*
        dataChannel = peerConnection.createDataChannel('chat');
        dataChannel.onopen = () => {
            console.log('Data channel is open');
        };

        dataChannel.onmessage = (event) => {
            handleDataChannelMessage(event.data);
        };
*/

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({
                    type: 'candidate',
                    candidate: event.candidate,
                    target: data.id
                }));
            }
        };

        /*peerConnection.ontrack = (event) => {
            remoteScreenVideo.srcObject = event.streams[0];
        };*/
				peerConnection.ontrack = (event) => {
    const track = event.track;
					const stream = event.streams[0];
    const hint = window.trackMetadataMap.get(/*track.id*/ stream.id);//const hint = track.contentHint.toLowerCase() || ''; // Convertir en minuscules pour comparaison insensible à la casse
console.log("HOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO" , hint, "origin", track);
    if (!remoteScreenVideo.srcObject && !hint){//!hint || hint.includes('screen') || hint.includes('monitor') || hint === '') {
        // Flux de partage d'écran
        remoteScreenVideo.srcObject = event.streams[0];
    } else if (hint.includes('cam') || hint.includes('camera')) {
		if (track.kind === 'video') {
        // Flux de caméra
        const remoteCamVideo = document.getElementById('remote-video');
        remoteCamVideo.srcObject = event.streams[0];
		}
		else if (track.kind === 'audio') {
				 let audioElement = document.getElementById('remote-audio');
			if (!audioElement) {
				audioElement = document.createElement('audio');
				audioElement.id = 'remote-audio';
				document.body.appendChild(audioElement);
			}
			audioElement.srcObject = event.streams[0];
			audioElement.autoplay = true;
				 }
    }
};

        if (localStream) {
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        }

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.send(JSON.stringify({
            type: 'offer',
            offer: offer,
            target: data.id
        }));
    }

    async function handleViewResponse(data) {
        if (data.accept) {
            targetId = data.id;
            console.log('Visionnage accepté');
            if (peerConnection) {
                peerConnection.close();
            }

            peerConnection = new RTCPeerConnection(configuration);

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.send(JSON.stringify({
                        type: 'candidate',
                        candidate: event.candidate,
                        target: targetId
                    }));
                }
            };
		peerConnection.ontrack = (event) => {
    const track = event.track;
    const hint = track.contentHint.toLowerCase(); // Convertir en minuscules pour comparaison insensible à la casse
console.log("HOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO" , hint);
    if (hint.includes('screen') || hint.includes('monitor') || hint === '') {
        // Flux de partage d'écran
        remoteScreenVideo.srcObject = event.streams[0];
    } else if (hint.includes('cam') || hint.includes('camera')) {
        // Flux de caméra
        const remoteCamVideo = document.getElementById('remote-video');
        remoteCamVideo.srcObject = event.streams[0];
    }
};
            /*peerConnection.ontrack = (event) => {
                remoteScreenVideo.srcObject = event.streams[0];
            };*/

            socket.send(JSON.stringify({
                type: 'requestOffer',
                target: targetId
            }));

            updateConnectionStatus('En attente de connexion', 'not-connected');

            // Traiter les candidats ICE en attente
            processIceCandidatesQueue();
			
			updateViewingStatus(uniqueId, targetId, true);
        } else {
            console.log('Visionnage refusé');
        }
    }

    function updateConnectionStatus(status, className) {
        if (connectionStatusElement) {
            connectionStatusElement.textContent = status;
            connectionStatusElement.className = `connected ${className}`;
        }
    }

    function setButtonStates(isSharing, type) {
		if (type === 'share') {
        if (startSharingButton) {
            startSharingButton.disabled = isSharing;
        }
        if (stopSharingButton) {
            stopSharingButton.disabled = !isSharing;
        }
			
		}
		else if (type === 'view') {
			if (startViewingButton) {
            startViewingButton.disabled = isSharing;
        }
        if (stopViewingButton) {
            stopViewingButton.disabled = !isSharing;
        }
				 
				 }
    }

    async function startSharing() {
        localStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        localScreenVideo.srcObject = localStream;
		const screenTrack = localStream.getVideoTracks()[0];
		screenTrack.contentHint = 'screen';

        if (peerConnection) {
            peerConnection.close();
        }

        peerConnection = new RTCPeerConnection(configuration);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({
                    type: 'candidate',
                    candidate: event.candidate,
                    target: targetId
                }));
            }
        };

        /*peerConnection.ontrack = (event) => {
            remoteScreenVideo.srcObject = event.streams[0];
        };*/
		
		peerConnection.ontrack = (event) => {
    const track = event.track;
    const hint = track.contentHint.toLowerCase() || ''; // Convertir en minuscules pour comparaison insensible à la casse
console.log("HOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO" , hint);
    if (hint.includes('screen') || hint.includes('monitor') || hint === '') {
        // Flux de partage d'écran
        remoteScreenVideo.srcObject = event.streams[0];
    } else if (hint.includes('cam') || hint.includes('camera')) {
        // Flux de caméra
        const remoteCamVideo = document.getElementById('remote-video');
        remoteCamVideo.srcObject = event.streams[0];
    }
};

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const password = generatePassword();
        sharedPassword = password;

        socket.send(JSON.stringify({
            type: 'startSharing',
            offer: offer,
            id: uniqueId,
            password: password
        }));

        updateConnectionStatus('En attente de connexion', 'not-connected');

        if (sharePasswordElement) {
            sharePasswordElement.textContent = password;
            passwordContainer.style.display = 'block';
        }

        if (confirmationPanel) {
            confirmationPanel.style.display = 'none';
        }

        setButtonStates(true, 'share');

    }

    function generatePassword() {
        return Math.random().toString(36).substr(2, 8);
    }

    function stopSharing() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (peerConnection) {
            peerConnection.close();
			peerConnection = null;
        }

        localScreenVideo.srcObject = null;
        //remoteScreenVideo.srcObject = null;

        updateConnectionStatus('Non encore connecté', 'not-connected');
        
        if (passwordContainer) {
            passwordContainer.style.display = 'none';
        }

        setButtonStates(false, 'share');
		
		updateSharingStatus(uniqueId, /*targetId*/'', '', false);
		
		isWebRTCConnected = false;
		cleanup();
    }

    function startViewing() {
		if (!ws_connected){
			alert("Le navigateur a interrompu la connection avec le MatchMaker. Veuillez le Réactualiser.");
			return;
		}
        if (viewingPopup) {
            viewingPopup.style.display = 'flex';
        }
    }

    function stopViewing() {
		/*if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }*/
        if (peerConnection) {
            peerConnection.close();
			peerConnection = null;
        }

        //localScreenVideo.srcObject = null;
        remoteScreenVideo.srcObject = null;

        updateConnectionStatus('Non encore connecté', 'not-connected');
		setButtonStates(false, 'view');
        // Ajoutez ici la logique pour arrêter le visionnage si nécessaire
        // 
         updateViewingStatus(uniqueId, /*targetId*/'', false);
		
		isWebRTCConnected = false;
		cleanup();
    }

    function handleViewingFormSubmit(event) {
        event.preventDefault();
        const viewingId = viewingIdInput ? viewingIdInput.value : '';
        const viewingPassword = viewingPasswordInput ? viewingPasswordInput.value : '';

        socket.send(JSON.stringify({
            type: 'viewingRequest',
            id: viewingId,
            password: viewingPassword
        }));

        if (viewingPopup) {
            viewingPopup.style.display = 'none';
        }
		setButtonStates(true, 'view');
    }

    function cancelViewing() {
        if (viewingPopup) {
            viewingPopup.style.display = 'none';
        }
    }

    function copyPasswordToClipboard() {
        if (sharePasswordElement) {
            const password = sharePasswordElement.textContent;
            navigator.clipboard.writeText(password)
                .then(() => {
                    console.log('Mot de passe copié dans le presse-papiers');
                })
                .catch(err => {
                    console.error('Erreur lors de la copie du mot de passe:', err);
                });
        }
    }

    if (startSharingButton) {
        startSharingButton.addEventListener('click', () => {
			if (!ws_connected){
				alert("Le navigateur a interrompu la connection au MatchMaker. Veuillez le réactualiser.");
				return;
			}
            if (confirmationPanel) {
                confirmationPanel.style.display = 'block';
            }
        });
    } else {
        console.error('Élément avec l\'ID start-sharing non trouvé.');
    }

    if (confirmSharingButton) {
        confirmSharingButton.addEventListener('click', startSharing);
    } else {
        console.error('Élément avec l\'ID confirm-sharing non trouvé.');
    }

    if (cancelSharingButton) {
        cancelSharingButton.addEventListener('click', () => {
            if (confirmationPanel) {
                confirmationPanel.style.display = 'none';
            }
        });
    } else {
        console.error('Élément avec l\'ID cancel-sharing non trouvé.');
    }

    if (stopSharingButton) {
        stopSharingButton.addEventListener('click', stopSharing);
    } else {
        console.error('Élément avec l\'ID stop-sharing non trouvé.');
    }

    if (startViewingButton) {
        startViewingButton.addEventListener('click', startViewing);
    } else {
        console.error('Élément avec l\'ID start-viewing non trouvé.');
    }

    if (stopViewingButton) {
        stopViewingButton.addEventListener('click', stopViewing);
    } else {
        console.error('Élément avec l\'ID stop-viewing non trouvé.');
    }

    if (cancelViewingButton) {
        cancelViewingButton.addEventListener('click', cancelViewing);
    } else {
        console.error('Élément avec l\'ID cancel-viewing non trouvé.');
    }

    if (viewingForm) {
        viewingForm.addEventListener('submit', handleViewingFormSubmit);
    } else {
        console.error('Élément avec l\'ID viewing-form non trouvé.');
    }

    if (copyPasswordButton) {
        copyPasswordButton.addEventListener('click', copyPasswordToClipboard);
    } else {
        console.error('Élément avec l\'ID copy-password non trouvé.');
    }
/*	
	const toggleFullscreenButton = document.getElementById('toggle-fullscreen');
let isFullscreen = false;

toggleFullscreenButton.addEventListener('click', () => {
    if (!isFullscreen) {
        openFullscreen(remoteScreenVideo);
        toggleFullscreenButton.textContent = 'Réduire';
    } else {
        closeFullscreen();
        toggleFullscreenButton.textContent = 'Agrandir';
    }
    isFullscreen = !isFullscreen;
});
*/
	
const toggleFullscreenButton = document.getElementById('toggle-fullscreen');
let isFullscreen = false;

toggleFullscreenButton.addEventListener('click', () => {
    if (!isFullscreen) {
        openFullscreen(remoteScreenVideo);
    } else {
        closeFullscreen();
    }
});

// Écouter l'événement fullscreenchange
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        toggleFullscreenButton.textContent = 'Réduire';
        isFullscreen = true;
    } else {
        toggleFullscreenButton.textContent = 'Agrandir';
        isFullscreen = false;
    }
});

// Fonction pour activer le mode plein écran
function openFullscreen(elem) {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { // Chrome, Safari and Opera
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE/Edge
        elem.msRequestFullscreen();
    }
}

// Fonction pour quitter le mode plein écran
function closeFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE/Edge
        document.msExitFullscreen();
    }
}
	
	function updateSharingStatus(localId, remoteId, sharingId, isSharing) {
    const confirmationMessage = document.getElementById('confirmation-message');
    const sharingStatus = document.getElementById('sharing-status');
    const localIdSpan = document.getElementById('local-id');
    const remoteIdSpan = document.getElementById('remote-id');
    const sharingIdSpan = document.getElementById('sharing-id');

    localIdSpan.textContent = localId;
    remoteIdSpan.textContent = remoteId;

    if (isSharing) {
        sharingStatus.style.display = 'block';
        sharingIdSpan.textContent = sharingId;
        confirmationMessage.classList.remove('not-connected');
        confirmationMessage.classList.add('connected');
    } else {
		if (localId === '')
			if (passwordContainer)
				passwordContainer.style.display = 'none';
        sharingStatus.style.display = 'none';
        confirmationMessage.classList.remove('connected');
        confirmationMessage.classList.add('not-connected');
    }
}
	
	function updateViewingStatus(localId, remoteId, isViewing) {
    const confirmationMessage = document.getElementById('confirmation-message');
    const viewingStatus = document.getElementById('viewing-status');
    const localIdSpan = document.getElementById('local-id');
    const remoteIdSpan = document.getElementById('remote-id');

    localIdSpan.textContent = localId;
    remoteIdSpan.textContent = remoteId;

    if (isViewing) {
        viewingStatus.style.display = 'block';
        confirmationMessage.classList.remove('not-connected');
        confirmationMessage.classList.add('connected');
    } else {
        viewingStatus.style.display = 'none';
        confirmationMessage.classList.remove('connected');
        confirmationMessage.classList.add('not-connected');
    }
}


});
