<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="wrap settings-page">
    <h1>
        <?php esc_html_e('Screen Sharing Settings', 'screen-sharing-system'); ?>
        <span class="warning-container">
            <span class="warning-triangle"></span>
            <span class="advanced-warning">
                <?php esc_html_e('WARNING: Modifiez uniquement si vous êtes un utilisateur avancé', 'screen-sharing-system'); ?>
            </span>
            <span class="warning-triangle"></span>
        </span>
    </h1>
    <form method="post" action="options.php" class="settings-form">
        <?php
        if (! defined('ABSPATH')) exit;
        settings_fields('screen_sharing_settings');
        do_settings_sections('screen-sharing-settings');
        submit_button();
        ?>
        <!-- Wrap form fields and lock container in a flex container -->
        <div class="form-flex-container">
            <div class="form-fields-container">
                <!-- Existing form fields go here -->
            </div>
            <div class="lock-container">
                <button id="toggle-lock" class="lock-icon" aria-label="<?php esc_attr_e('Lock/Unlock Settings', 'screen-sharing-system'); ?>">
                    <span class="lock-icon-locked"></span>
                    <span class="lock-icon-unlocked"></span>
                </button>
            </div>
        </div>
        <!-- Block with test buttons -->
        <div class="button-container">
            <button id="test-ws-connection" class="btn-round btn-primary"><?php esc_html_e('Test WebSocket Connection', 'screen-sharing-system'); ?></button>
            <button id="test-ice-connection" class="btn-round btn-secondary"><?php esc_html_e('Test ICE Connection', 'screen-sharing-system'); ?></button>
        </div>
        <p id="result-message" class="result-message"></p>
    </form>
</div>