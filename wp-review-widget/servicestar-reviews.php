<?php
/**
 * Plugin Name: ServiceStar Google Reviews
 * Description: Displays a carousel of recent 4-5 star Google reviews from the KPI Dashboard.
 * Version: 1.1.0
 * Author: ServiceStar Brands
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) exit;

class ServiceStar_Reviews {

    const OPTION_KEY    = 'ssr_settings';
    const TRANSIENT_KEY = 'ssr_reviews_cache';

    public function __construct() {
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
        add_shortcode('servicestar_reviews', [$this, 'render_shortcode']);
        add_action('wp_ajax_ssr_clear_cache', [$this, 'ajax_clear_cache']);
    }

    /* --------------------------------------------------
       Settings
    -------------------------------------------------- */

    private function defaults() {
        return [
            'api_url'      => '',
            'cache_hours'  => 1,
            'review_count' => 12,
            'min_rating'   => 4,
            'scroll_speed' => 5,
        ];
    }

    private function get_settings() {
        return wp_parse_args(get_option(self::OPTION_KEY, []), $this->defaults());
    }

    public function add_settings_page() {
        add_options_page(
            'ServiceStar Reviews',
            'ServiceStar Reviews',
            'manage_options',
            'servicestar-reviews',
            [$this, 'render_settings_page']
        );
    }

    public function register_settings() {
        register_setting(self::OPTION_KEY, self::OPTION_KEY, ['sanitize_callback' => [$this, 'sanitize']]);
    }

    public function sanitize($input) {
        return [
            'api_url'      => esc_url_raw(rtrim($input['api_url'] ?? '', '/')),
            'cache_hours'  => max(1, absint($input['cache_hours'] ?? 1)),
            'review_count' => max(1, absint($input['review_count'] ?? 12)),
            'min_rating'   => min(5, max(4, absint($input['min_rating'] ?? 4))),
            'scroll_speed' => max(1, min(15, absint($input['scroll_speed'] ?? 5))),
        ];
    }

    public function render_settings_page() {
        $s = $this->get_settings();
        ?>
        <div class="wrap">
            <h1>ServiceStar Reviews Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields(self::OPTION_KEY); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Dashboard API URL</th>
                        <td>
                            <input type="url" name="<?php echo self::OPTION_KEY; ?>[api_url]"
                                   value="<?php echo esc_attr($s['api_url']); ?>" class="regular-text"
                                   placeholder="https://your-dashboard.com" />
                            <p class="description">Base URL of the KPI Dashboard (no trailing slash).</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Cache Duration (hours)</th>
                        <td><input type="number" name="<?php echo self::OPTION_KEY; ?>[cache_hours]" value="<?php echo esc_attr($s['cache_hours']); ?>" min="1" max="48" class="small-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Number of Reviews</th>
                        <td><input type="number" name="<?php echo self::OPTION_KEY; ?>[review_count]" value="<?php echo esc_attr($s['review_count']); ?>" min="1" max="30" class="small-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Minimum Star Rating</th>
                        <td>
                            <select name="<?php echo self::OPTION_KEY; ?>[min_rating]">
                                <option value="5" <?php selected($s['min_rating'], 5); ?>>5 Stars only</option>
                                <option value="4" <?php selected($s['min_rating'], 4); ?>>4+ Stars</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Auto-scroll Speed (seconds)</th>
                        <td>
                            <input type="number" name="<?php echo self::OPTION_KEY; ?>[scroll_speed]" value="<?php echo esc_attr($s['scroll_speed']); ?>" min="1" max="15" class="small-text" />
                            <p class="description">Seconds between each auto-scroll. Set higher for slower scrolling.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <hr>
            <h2>Shortcode</h2>
            <p>Place on any page or post: <code>[servicestar_reviews]</code></p>
            <p>Override settings: <code>[servicestar_reviews count="8" min_rating="5" speed="4"]</code></p>
            <hr>
            <h2>Cache</h2>
            <p><button type="button" class="button" id="ssr-clear-cache">Clear Review Cache</button></p>
            <script>
            document.getElementById('ssr-clear-cache').addEventListener('click', function() {
                if (!confirm('Clear cached reviews?')) return;
                fetch(ajaxurl + '?action=ssr_clear_cache&_wpnonce=<?php echo wp_create_nonce('ssr_clear_cache'); ?>')
                    .then(r => r.json())
                    .then(() => alert('Cache cleared!'));
            });
            </script>
        </div>
        <?php
    }

    public function ajax_clear_cache() {
        check_ajax_referer('ssr_clear_cache', '_wpnonce');
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        delete_transient(self::TRANSIENT_KEY);
        wp_send_json_success();
    }

    /* --------------------------------------------------
       Fetch Reviews
    -------------------------------------------------- */

    private function fetch_reviews() {
        $s = $this->get_settings();
        if (empty($s['api_url'])) return [];

        $cached = get_transient(self::TRANSIENT_KEY);
        if ($cached !== false) return $cached;

        $response = wp_remote_get($s['api_url'] . '/api/google/reviews', [
            'timeout'   => 15,
            'sslverify' => true,
        ]);

        if (is_wp_error($response)) {
            error_log('SSR: API fetch failed – ' . $response->get_error_message());
            return [];
        }

        if (wp_remote_retrieve_response_code($response) !== 200) return [];

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (empty($body['success']) || empty($body['reviews'])) return [];

        $reviews = $body['reviews'];
        set_transient(self::TRANSIENT_KEY, $reviews, max(1, $s['cache_hours']) * HOUR_IN_SECONDS);
        return $reviews;
    }

    /* --------------------------------------------------
       Helpers
    -------------------------------------------------- */

    private function abbreviate_name($name) {
        $parts = preg_split('/\s+/', trim($name));
        $initials = array_map(function ($p) {
            return mb_strtoupper(mb_substr($p, 0, 1)) . '.';
        }, $parts);
        return implode(' ', $initials);
    }

    private function avatar_color($name) {
        $palette = ['#E91E63','#009688','#2196F3','#FF5722','#9C27B0','#4CAF50','#FF9800','#3F51B5'];
        return $palette[abs(crc32($name)) % count($palette)];
    }

    private function location_label($review) {
        $map = [
            'lex'     => 'Dallas / Plano, TX',
            'lex-etx' => 'East Texas',
            'lyons'   => 'Rockwall, TX',
        ];
        return $map[$review['locationId'] ?? ''] ?? '';
    }

    private function star_icons($rating) {
        $out = '<svg viewBox="0 0 24 24" width="24" height="24" style="flex-shrink:0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
        $star = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#FBBC05"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
        $out .= str_repeat($star, intval($rating));
        return $out;
    }

    /* --------------------------------------------------
       Render
    -------------------------------------------------- */

    public function render_shortcode($atts) {
        $s = $this->get_settings();

        $atts = shortcode_atts([
            'count'      => $s['review_count'],
            'min_rating' => $s['min_rating'],
            'speed'      => $s['scroll_speed'],
        ], $atts, 'servicestar_reviews');

        $reviews = $this->fetch_reviews();
        if (empty($reviews)) return '<!-- SSR: no reviews -->';

        // Only include Lex (Dallas/Plano) reviews
        $reviews = array_values(array_filter($reviews, function ($r) {
            return ($r['locationId'] ?? '') === 'lex';
        }));

        // Filter to 4+ stars & sort by date
        $min = max(4, intval($atts['min_rating']));
        $reviews = array_values(array_filter($reviews, function ($r) use ($min) {
            return intval($r['rating'] ?? 0) >= $min;
        }));
        usort($reviews, function ($a, $b) {
            return strtotime($b['date'] ?? '0') - strtotime($a['date'] ?? '0');
        });
        $reviews = array_slice($reviews, 0, intval($atts['count']));

        if (empty($reviews)) return '<!-- SSR: no reviews match filter -->';

        $id = 'ssr-' . wp_unique_id();
        $speed = max(1, intval($atts['speed'])) * 1000;

        ob_start();
        $this->output_styles();
        $this->output_html($reviews, $id);
        $this->output_scripts($id, $speed);
        return ob_get_clean();
    }

    /* ---------- CSS ---------- */

    private function output_styles() {
        ?>
        <style>
        .ssr-wrap{position:relative;padding:20px 0;overflow:hidden}
        .ssr-track{display:flex;gap:24px;overflow-x:auto;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:10px 4px}
        .ssr-track::-webkit-scrollbar{display:none}
        .ssr-card{background:#fff;border-radius:12px;border:2px solid #c8e6c9;padding:28px 22px;min-width:280px;max-width:300px;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;text-align:center;box-sizing:border-box;box-shadow:0 2px 12px rgba(0,0,0,.08);transition:transform .2s}
        .ssr-card:hover{transform:translateY(-4px)}
        .ssr-stars{display:flex;align-items:center;gap:3px;margin-bottom:20px}
        .ssr-text{color:#333;font-size:14px;line-height:1.65;margin-bottom:20px;flex-grow:1;overflow:hidden}
        .ssr-text.ssr-clamped{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical}
        .ssr-see-more{color:#1a73e8;cursor:pointer;font-size:13px;text-decoration:underline;background:none;border:none;padding:0;margin-bottom:16px;font-family:inherit}
        .ssr-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700;margin-bottom:8px;flex-shrink:0}
        .ssr-name{color:#333;font-size:14px;font-weight:600;margin-bottom:2px}
        .ssr-loc{color:#888;font-size:12px}
        .ssr-arrow{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.9);border:1px solid #ddd;box-shadow:0 2px 8px rgba(0,0,0,.15);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;transition:background .2s}
        .ssr-arrow:hover{background:#fff}
        .ssr-arrow svg{width:20px;height:20px;fill:#333}
        .ssr-arrow-left{left:8px}
        .ssr-arrow-right{right:8px}
        @media(max-width:640px){.ssr-card{min-width:260px}.ssr-arrow{display:none}}
        </style>
        <?php
    }

    /* ---------- HTML ---------- */

    private function output_html($reviews, $id) {
        ?>
        <div class="ssr-wrap" id="<?php echo esc_attr($id); ?>">
            <button class="ssr-arrow ssr-arrow-left" aria-label="Previous">
                <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <div class="ssr-track">
                <?php foreach ($reviews as $r):
                    $name    = $r['name'] ?? 'Anonymous';
                    $rating  = intval($r['rating'] ?? 5);
                    $text    = esc_html($r['text'] ?? '');
                    $abbr    = esc_html($this->abbreviate_name($name));
                    $loc     = esc_html($this->location_label($r));
                    $color   = $this->avatar_color($name);
                    $initial = mb_strtoupper(mb_substr($name, 0, 1));
                    $long    = mb_strlen($r['text'] ?? '') > 220;
                ?>
                <div class="ssr-card">
                    <div class="ssr-stars"><?php echo $this->star_icons($rating); ?></div>
                    <div class="ssr-text<?php echo $long ? ' ssr-clamped' : ''; ?>"><?php echo $text; ?></div>
                    <?php if ($long): ?>
                        <button class="ssr-see-more" onclick="this.previousElementSibling.classList.toggle('ssr-clamped');this.textContent=this.textContent==='See More'?'See Less':'See More'">See More</button>
                    <?php endif; ?>
                    <div class="ssr-avatar" style="background:<?php echo $color; ?>"><?php echo esc_html($initial); ?></div>
                    <div class="ssr-name"><?php echo $abbr; ?></div>
                    <?php if ($loc): ?>
                        <div class="ssr-loc"><?php echo $loc; ?></div>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            </div>
            <button class="ssr-arrow ssr-arrow-right" aria-label="Next">
                <svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
            </button>
        </div>
        <?php
    }

    /* ---------- JS ---------- */

    private function output_scripts($id, $speed) {
        ?>
        <script>
        (function(){
            var wrap = document.getElementById('<?php echo esc_js($id); ?>');
            if (!wrap) return;
            var track = wrap.querySelector('.ssr-track');
            var left  = wrap.querySelector('.ssr-arrow-left');
            var right = wrap.querySelector('.ssr-arrow-right');
            var cardW = 304; // min-width + gap

            function scrollBy(dir) {
                track.scrollBy({ left: dir * cardW, behavior: 'smooth' });
            }

            left.addEventListener('click', function(){ scrollBy(-1); });
            right.addEventListener('click', function(){ scrollBy(1); });

            // Auto-scroll
            var timer = setInterval(function(){
                // If at end, loop back
                if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
                    track.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollBy(1);
                }
            }, <?php echo intval($speed); ?>);

            // Pause on hover
            wrap.addEventListener('mouseenter', function(){ clearInterval(timer); });
            wrap.addEventListener('mouseleave', function(){
                timer = setInterval(function(){
                    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
                        track.scrollTo({ left: 0, behavior: 'smooth' });
                    } else {
                        scrollBy(1);
                    }
                }, <?php echo intval($speed); ?>);
            });

            // Touch/swipe support — let native scroll handle it
        })();
        </script>
        <?php
    }
}

new ServiceStar_Reviews();
