<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="chat-wrapper">
	<div id="video-container-face">
  <button id="refresh-view">🔄</button>
  <div id="video-layout">
    <video id="local-video" autoplay muted></video>
    <video id="remote-video" autoplay></video>
  </div>
</div>

<div id="chat-container" class="collapsed">
    <div id="chat-header">
		<button id="toggle-chat">Chat</button>
		<div id="media-controls">
  			<button id="microphone-toggle">🎤</button>
  			<button id="camera-toggle">📷</button>
		</div>

	</div>
    <div id="chat-messages"></div>
	<div id="scroll-toggle-container">
    <input type="checkbox" id="auto-scroll-checkbox" checked>
    <label for="auto-scroll-checkbox">Auto-scroll</label>
  </div>
	<div id="chat-input-container">
    <div id="chat-input">
		        <span id="file-attachment">📎</span>
		<textarea id="chat-input-field" type="text" placeholder="Type your message..."></textarea>
        <button>Send</button>
    </div>
	</div>
	<!-- File preview and progress container -->
  <div id="file-preview-container" style="display: none;">
    <img id="file-thumbnail" alt="File Thumbnail">
    <div id="progress-container">
      <div id="progress-bar"></div>
    </div>
    <button id="accept-file" style="display: none;">Accept</button>
    <button id="reject-file" style="display: none;">Reject</button>
    <div id="file-status"></div>
  </div>
  <!--<button id="floating-chat-button">💬</button>-->
</div>
</div>
<!-- Floating button to open chat -->
<button id="floating-chat-button">💬</button>