<?php
/*
Plugin Name: Screen Sharing System
Version: 1.1.0
Description: A plugin to share your screen using WebRTC.
Author: tlloancy
Requires at least: 4.0
Tested up to: 6.6.2
Requires PHP: 7.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: screen-sharing-system
Domain Path: /languages
*/

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Define plugin constants
define( 'SSS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );

function sss_load_plugin_textdomain() {
    load_plugin_textdomain( 'screen-sharing-system', false, basename( dirname( __FILE__ ) ) . '/languages/' );
}
add_action( 'init', 'sss_load_plugin_textdomain' );

// Include the main class file
require_once SSS_PLUGIN_DIR . 'includes/class-screen-sharing-system.php';

// Check if the chat add-on exists and include it
if (file_exists(SSS_PLUGIN_DIR . 'chat-addon/chat-addon.php')) {
    require_once SSS_PLUGIN_DIR . 'chat-addon/chat-addon.php';
}

// Initialize the plugin
function sss_init() {
    $sss = new Screen_Sharing_System();
}
add_action( 'plugins_loaded', 'sss_init' );
