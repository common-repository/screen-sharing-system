<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>

<div class="wrap screen-page">
    <h1><?php esc_html_e('Screen Sharing System', 'screen-sharing-system'); ?></h1>
    <div id="screen-sharing-container">
        <button id="start-sharing"><?php esc_html_e('Start Sharing', 'screen-sharing-system'); ?></button>
        <button id="stop-sharing" disabled><?php esc_html_e('Stop Sharing', 'screen-sharing-system'); ?></button>
        <button id="start-viewing"><?php esc_html_e('Start Viewing', 'screen-sharing-system'); ?></button>
        <button id="stop-viewing" disabled><?php esc_html_e('Stop Viewing', 'screen-sharing-system'); ?></button>
        <div id="video-container">
            <video id="local-screen" autoplay muted></video>
            <video id="remote-screen" autoplay></video>
            <button id="toggle-fullscreen" style="line-height: 1.5em;">
  <span style="display: block;"><?php esc_html_e('Agrandir', 'screen-sharing-system'); ?></span>
  <span style="display: block;"><?php esc_html_e('Écran', 'screen-sharing-system'); ?></span>
  <span style="display: block;"><?php esc_html_e('Distant', 'screen-sharing-system'); ?></span>
</button>
        </div>
        <div id="confirmation-message" class="not-connected">
            ID LOCAL: <span id="local-id">...</span><br>
            ID DISTANT: <span id="remote-id">...</span><br>
            <div id="sharing-status" style="display:none;">
                <?php esc_html_e("Le visionnage est en cours depuis l'ID", 'screen-sharing-system'); ?> <span id="sharing-id">...</span>
            </div>
            <div id="viewing-status" style="display:none;">
                <?php esc_html_e("Vous êtes en train de visionner cet écran Distant !", 'screen-sharing-system'); ?>
            </div>
            <div id="password-container" style="display:none;">
                <span id="share-password"></span>
                <button id="copy-password"><?php esc_html_e('Copier le mot de passe', 'screen-sharing-system'); ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Popup pour démarrer le visionnage -->
<div id="viewing-popup">
    <div id="viewing-popup-content">
        <h2><?php esc_html_e('Démarrer le Visionnage', 'screen-sharing-system'); ?></h2>
        <form id="viewing-form">
            <label for="viewing-id"><?php esc_html_e('ID à visionner:', 'screen-sharing-system'); ?></label>
            <input type="text" id="viewing-id" inputmode="numeric" pattern="[0-9]*" placeholder="<?php esc_attr_e('Enter Viewing ID', 'screen-sharing-system'); ?>" required>
            <br>
            <label for="viewing-password"><?php esc_html_e('Mot de passe:', 'screen-sharing-system'); ?></label>
            <input type="password" id="viewing-password" required>
            <br>
            <button id="start-viewing-btn" type="submit"><?php esc_html_e('Démarrer le Visionnage', 'screen-sharing-system'); ?></button>
        </form>
        <button id="cancel-viewing"><?php esc_html_e('Annuler', 'screen-sharing-system'); ?></button>
    </div>
</div>

<!-- Confirmation Panel pour le partage d'écran -->
<div id="confirmation-panel">
    <div id="confirmation-content">
        <h2><?php esc_html_e('Confirmer le Partage d\'Écran', 'screen-sharing-system'); ?></h2>
        <p><?php esc_html_e('Cliquer sur le bouton ci-dessous pour commencer à partager votre écran.', 'screen-sharing-system'); ?></p>
        <button id="confirm-sharing"><?php esc_html_e('Start Sharing', 'screen-sharing-system'); ?></button>
        <button id="cancel-sharing"><?php esc_html_e('Cancel', 'screen-sharing-system'); ?></button>
    </div>
</div>