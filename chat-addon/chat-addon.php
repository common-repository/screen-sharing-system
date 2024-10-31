<?php

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Include main class
require_once plugin_dir_path(__FILE__) . 'includes/class-chat-addon.php';

// Initialize the add-on
function sss_init_chat_addon() {
    new Chat_Addon();
}
add_action('plugins_loaded', 'sss_init_chat_addon');
