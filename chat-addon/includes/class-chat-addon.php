<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
class Chat_Addon {
    public function __construct() {
		//wp_enqueue_scripts
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_check_license', array($this, 'check_license'));
        add_action('wp_ajax_nopriv_check_license', array($this, 'check_license'));
        add_action('admin_footer', array($this, 'display_chat'));
		//wp_footer
    }

    public function enqueue_scripts($hook_suffix) {
		// Enqueue scripts only for the specific admin page
        if ($hook_suffix === 'toplevel_page_screen-sharing-system') {
            wp_enqueue_style('chat-addon-style', plugins_url('assets/css/chat.css', __DIR__));
            wp_enqueue_script('chat-addon-script', plugins_url('assets/js/chat.js', __DIR__), array(), null, true);
        }
		/*
        wp_enqueue_style('chat-addon-style', plugins_url('chat-addon/assets/css/chat.css', __FILE__));
        wp_enqueue_script('chat-addon-script', plugins_url('chat-addon/assets/js/chat.js', __FILE__), array(), null, true);
		*/
    }

    public function check_license() {
        // Logique pour vérifier la licence de l'utilisateur
        if (0) {
        /*$license_key = $_POST['license_key'];
        $user_id = get_current_user_id();
        $valid = $this->is_license_valid($user_id, $license_key);
        wp_send_json(array('status' => $valid ? 'valid' : 'invalid'));*/
    }
    }
/*
    private function is_license_valid($user_id, $license_key) {
        // Remplacer par votre propre logique de vérification de la licence
        global $wpdb;
        $table_name = $wpdb->prefix . 'user_licenses';
        $license = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE user_id = %d AND license_key = %s AND is_active = 1 AND (expiration_date IS NULL OR expiration_date > NOW())",
            $user_id,
            $license_key
        ));
        return $license !== null;
    }
*/
    public function display_chat() {
		$current_page = isset($_GET['page']) ? sanitize_text_field($_GET['page']) : '';
		if (('screen-sharing-system') === $current_page)
        	include(plugin_dir_path(__DIR__) . 'templates/chat-template.php');
    }
}