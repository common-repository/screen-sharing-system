<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
class Screen_Sharing_System {

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_settings_styles'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_settings_scripts'));
        add_action('admin_init', array($this, 'register_settings'));
    }

    public function add_admin_menu() {
        add_menu_page(
            'Screen Sharing System',
            'Screen Sharing',
            'manage_options',
            'screen-sharing-system',
            array($this, 'admin_page'),
            'dashicons-share-alt'
        );

        // Ajouter un sous-menu pour les réglages
        add_submenu_page(
            'screen-sharing-system',
            'Screen Sharing Settings',
            'Settings',
            'manage_options',
            'screen-sharing-settings',
            array($this, 'settings_page')
        );
    }

    public function register_settings() {
        // Configuration des paramètres
        register_setting('screen_sharing_settings', 'ws_server');
        register_setting('screen_sharing_settings', 'ws_port');
        register_setting('screen_sharing_settings', 'ice_server');

        add_settings_section(
            'screen_sharing_section',
            'Screen Sharing Settings',
            null,
            'screen-sharing-settings'
        );

        add_settings_field(
            'ws_server',
            'WebSocket Server',
            array($this, 'ws_server_field'),
            'screen-sharing-settings',
            'screen_sharing_section'
        );

        add_settings_field(
            'ws_port',
            'WebSocket Port',
            array($this, 'ws_port_field'),
            'screen-sharing-settings',
            'screen_sharing_section'
        );

        add_settings_field(
            'ice_server',
            'ICE Server',
            array($this, 'ice_server_field'),
            'screen-sharing-settings',
            'screen_sharing_section'
        );
    }

    public function ws_server_field() {
        $ws_server = get_option('ws_server', 'wss://deter-mi.net');
        echo '<input type="text" id="ws_server" name="ws_server" value="' . esc_attr($ws_server) . '" />';
    }

    public function ws_port_field() {
        $ws_port = get_option('ws_port', '443');
        echo '<input type="text" id="ws_port" name="ws_port" value="' . esc_attr($ws_port) . '" />';
    }

    public function ice_server_field() {
        $ice_server = get_option('ice_server', 'stun:stun.l.google.com:19302');
        echo '<input type="text" id="ice_server" name="ice_server" value="' . esc_attr($ice_server) . '" />';
    }

    public function admin_page() {
        include SSS_PLUGIN_DIR . 'templates/screen-sharing-template.php';
    }

    public function settings_page() {
        include SSS_PLUGIN_DIR . 'templates/screen-sharing-settings-template.php';
    }

    public function enqueue_admin_scripts($hook) {
		if ($hook === 'toplevel_page_screen-sharing-system') {
        wp_enqueue_style('sss-admin-css', plugin_dir_url(__FILE__) . '../assets/css/screen-sharing-system.css');
        wp_enqueue_script('sss-admin-js', plugin_dir_url(__FILE__) . '../assets/js/screen-sharing-system.js', array('jquery'), '', true);
        /*wp_localize_script('sss-admin-js', 'SSS', array(
            'websocket_url' => get_option('ws_server', 'wss://deter-mi.net') . ':' . get_option('ws_port', '3000'),
            'ice_server' => get_option('ice_server', 'stun:stun.l.google.com:19302')
        ));*/
		            wp_localize_script('sss-admin-js', 'SSSSettings', array(
                'signalingServerUrl' => get_option('ws_server', 'wss://deter-mi.net') . ':' . get_option('ws_port', '443') . '/socket.io',
                'iceServerUrl' => get_option('ice_server', 'stun:stun.l.google.com:19302')
            ));
		}
    }

    public function enqueue_settings_styles($hook) {
        // Charger le CSS des réglages uniquement sur la page de réglages
        if ($hook === 'screen-sharing_page_screen-sharing-settings') {
            wp_enqueue_style('sss-settings-css', plugin_dir_url(__FILE__) . '../assets/css/screen-sharing-system-settings.css');
        }
    }

    public function enqueue_settings_scripts($hook) {
        // Charger le JS des réglages uniquement sur la page de réglages
        if ($hook === 'screen-sharing_page_screen-sharing-settings') {
            wp_enqueue_script('sss-settings-js', plugin_dir_url(__FILE__) . '../assets/js/screen-sharing-system-settings.js', array('jquery'), '', true);
			$translation_array = array(
    'testing' => __('Testing WebSocket connection...', 'screen-sharing-system'),
     // translators: %s is the WebSocket server address or identifier.
    'okConnection' => __('WebSocket connection to %s OK!', 'screen-sharing-system'),
    // translators: %s is the WebSocket server address or identifier.
    'nokConnection' => __('WebSocket connection to %s NOK!', 'screen-sharing-system'),
    // translators: %s is the error message or description of the connection error.
    'connectionError' => __('WebSocket connection error: %s', 'screen-sharing-system'),
);
			            wp_localize_script('sss-settings-js', 'SSSSettings', array_merge($translation_array,  array(
                'signalingServerUrl' => get_option('ws_server', 'wss://deter-mi.net') . ':' . get_option('ws_port', '443') . '/socket.io',
                'iceServerUrl' => get_option('ice_server', 'stun:stun.l.google.com:19302')
            )));
        }
    }
}

