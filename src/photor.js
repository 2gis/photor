/*
* Photor
* https://github.com/Chaptykov/photor
*
* Copyright (c) 2014 Chaptykov
* Licensed under the MIT license.
*/


(function($) {
    'use strict';

    // Server side
    if (!window) {
        return;
    }

    function getSupportedTransform() {
        for (var key in prefixes) {
            if (document.createElement('div').style[key] !== undefined) {
                return key;
            }
        }
        return false;
    }

    var prefixes = {
            'transform': 'transform',
            'OTransform': '-o-transform',
            'msTransform': '-ms-transform',
            'MozTransform': '-moz-transform',
            'WebkitTransform': '-webkit-transform'
        },
        params,
        data = [],
        timer;

    var methods = {
        init: function(options) {
            params = $.extend({

                current: 0,
                count: 0,
                loadingRange: 1,
                slideIdPrefix: '_',
                transform: getSupportedTransform()

            }, options);

            return this.each(function(i) {
                var root = $(this),
                    galleryId = this.id || i,
                    p = {}, // Current instance of gallery
                    content = '',
                    count = 0;

                // Get elements
                p.root       = root;
                p.control    = root.find('.' + params.control);
                p.next       = root.find('.' + params.next);
                p.prev       = root.find('.' + params.prev);
                p.thumb      = root.find('.' + params.thumb);
                p.thumbImg   = root.find('.' + params.thumbImg);
                p.viewport   = root.find('.' + params.viewport);
                p.layer      = root.find('.' + params.layer);

                // Images info
                p.gallery = [];
                p.thumb.each(function(j) {
                    p.gallery.push({
                        url: this.href,
                        width: 0,
                        height: 0,
                        loaded: false
                    });
                    content += methods.getTemplate(j);
                    count++;

                    $(this)
                        .attr('data-rel', j)
                        .addClass(params.slideIdPrefix + j);
                });
                p.layer.html(content);
                p.slide = root.find('.' + params.slide);

                // Settings
                p.current = params.current;
                p.count = count - 1;
                p.dragging = false;
                p.allowClick = true;
                p.viewportWidth = p.viewport.outerWidth();
                p.viewportHeight = p.viewport.outerHeight();

                data[galleryId] = p;

                methods.handlers(galleryId);
                methods.go(galleryId, p.current, 0);
            });
        },

        destroy: function() {
            // $(window).unbind('.photor'); // @TODO НУ ТЫ ПОНЕЛ

            // @TODO Не убивай соседний инстанс, друг
            $('.' + params.next).off();
            $('.' + params.prev).off();
            $('.' + params.thumb).off();
        },

        handlers: function(galleryId) {
            var p = data[galleryId],
                rtime = new Date(1, 1, 2000, 12, 0, 0),
                timeout = false,
                delta = 84; // 12 FPS

            // Next button
            p.next.on('click', function() {
                if (p.allowClick) {
                    methods.next(galleryId);
                }
            });

            // Previous button
            p.prev.on('click', function() {
                if (p.allowClick) {
                    methods.prev(galleryId);
                }
            });

            // Click by thumbnail
            p.thumb.on('click', function() {
                var target = parseInt($(this).attr('data-rel'));

                methods.go(galleryId, target);

                return false;
            });

            // Scroll

            // Swipe slides
            if (params.swipe) {
                methods.bindSwipe(galleryId);
            }

            // Keyboard
            if (params.keyboard) {
                methods.bindKeyboard(galleryId);
            }

            // Resize
            $(window).on('resize', function() {
                rtime = new Date();
                if (timeout === false) {
                    timeout = true;
                    setTimeout(resize, delta);
                }
            });

            function resize() {
                if (new Date() - rtime < delta) {
                    setTimeout(resize, delta);
                } else {
                    timeout = false;

                    p.viewportWidth = p.viewport.outerWidth();
                    p.viewportHeight = p.viewport.outerHeight();

                    p.slide.each(function(i) {
                        methods.position(galleryId, i);
                    });
                }
            }

        },

        bindSwipe: function(galleryId) {
            var p = data[galleryId],
                start = {},
                delta = {},
                isScrolling,
                isMultiTouch = false;

            p.dragging = false;

            p.control

                // Pointer start
                .on('mousedown touchstart', function(event) {
                    var offset = $(this).offset();

                    start = {
                        x: event.pageX || event.touches[0].pageX,
                        y: event.pageY || event.touches[0].pageY
                    };

                    delta = {x: 0, y: 0};

                    if (event.type == 'touchstart') {
                        return true;
                    }

                    p.dragging = true;
                    p.root.addClass(params.mod.dragging);
                })

                // Pointer move
                .on('mousemove touchmove', function(event) {
                    var touches = event.touches && event.touches.length,
                        coordX = event.pageX || event.touches[0].pageX,
                        coordY = event.pageY || event.touches[0].pageY;

                    delta = {
                        x: start.x - coordX,
                        y: start.y - coordY
                    };

                    // Detect scrolling
                    if (typeof isScrolling == 'undefined') {
                        isScrolling = !!(isScrolling || Math.abs(delta.x) < Math.abs(delta.y));
                    }

                    // Detect multitouch
                    isMultiTouch = isMultiTouch || touches > 1;

                    if (isScrolling || isMultiTouch || touches == 0) {
                        return;
                    } else {
                        event.preventDefault();
                    }

                    // Start touch
                    if (event.type == 'touchmove' && !p.dragging) {
                        p.dragging = true;
                        p.root.addClass(params.mod.dragging);
                    }

                    if (p.dragging) {
                        p.allowClick = false;

                        var self = $(this),
                            selfWidth = self.outerWidth(),
                            relativeDeltaX, indent;

                        relativeDeltaX = -delta.x / selfWidth * 100;
                        indent = -p.current * 100 + relativeDeltaX;

                        p.layer.css(methods.setIndent(indent));
                    }
                })

                // Pointer end
                .on('mouseup mouseleave touchend touchcancel', function(event) {
                    p.root.removeClass(params.mod.dragging);
                    isScrolling = undefined;
                    isMultiTouch = (event.touches && event.touches.length) == 1;

                    if (p.dragging) {
                        var self = $(this),
                            selfWidth = self.outerWidth(),
                            target;

                        p.dragging = false;

                        // Allow or disable click by buttons
                        if (delta.x == 0) {
                            p.allowClick = true;
                            return true;
                        } else {
                            p.allowClick = false;
                            setTimeout(function() {
                                p.allowClick = true;
                            }, 20);
                        }

                        // Target slide
                        target = delta.x > 0 ? p.current + 1 : p.current - 1;

                        // Transition executes if delta more then 5% of container width
                        if (Math.abs(delta.x) > selfWidth * 0.05) {
                            if (delta.x > 0) {
                                methods.next(galleryId);
                            } else {
                                methods.prev(galleryId);
                            }
                        } else {
                            methods.go(galleryId, p.current);
                        }
                    }
                });
        },

        bindKeyboard: function(galleryId) {
            var p = data[galleryId];

            $(window).on('keydown', function() {
                var key = event.which || event.keyCode;

                switch(key) {
                    // Space
                    case 32:
                        methods.next(galleryId);
                        break;

                    // Left
                    case 37:
                        methods.prev(galleryId);
                        break;

                    // Right
                    case 39:
                        methods.next(galleryId);
                        break;
                }
            });
        },

        go: function(galleryId, target, delay) {
            var p = data[galleryId];

            if (delay === undefined) {
                delay = params.delay;
            }

            p.layer
                .css('transition-duration', delay + 'ms')
                .css(methods.setIndent(-target * 100));

            p.current = target;

            // Mark slide as current
            p.slide.removeClass(params.mod.current);
            p.slide
                .filter(params.slideIdPrefix + target)
                .addClass(params.mod.current);

            // Load slide's range
            methods.loadSlides(galleryId, target);

            // Reset duration
            clearTimeout(timer);
            timer = setTimeout(function() {
                p.layer.css('transition-duration', '0s');
            }, delay);
        },

        next: function(galleryId) {
            var p = data[galleryId];

            if (p.current < p.count) {
                methods.go(galleryId, p.current + 1);
            } else {
                methods.go(galleryId, p.current);
            }
        },

        prev: function(galleryId) {
            var p = data[galleryId];

            if (p.current > 0) {
                methods.go(galleryId, p.current - 1);
            } else {
                methods.go(galleryId, p.current);
            }
        },

        loadSlides: function(galleryId, target) {
            var p = data[galleryId],
                range = params.loadingRange,
                from = target - 1 < 0 ? 0 : target - 1,
                to = target + 1 > p.count ? p.count : target + 1;

            for (var i = from; i <= to; i++) {
                if (!p.gallery[i].loaded) {
                    methods.loadSlide(galleryId, i);
                }
            }
        },

        loadSlide: function(galleryId, target) {
            var p = data[galleryId],
                slide = p.root.find('.' + params.slide + '.' + params.slideIdPrefix + target),
                url = p.gallery[target].url,
                img = document.createElement('img');

            (function(rel) {
                var image = $(img);

                image
                    .on('load', function() {
                        p.gallery[rel].loaded = true;
                        p.gallery[rel].width = this.width;
                        p.gallery[rel].height = this.height;

                        slide
                            .css('background-image', 'url(' + this.src + ')')
                            .removeClass(params.mod.loading);

                        methods.position(galleryId, rel);
                    })
                    .on('error', function() {
                        // @TODO Обработай ошибку, друже
                    });
            })(target);
            img.src = url;
        },

        position: function(galleryId, target) {
            var p = data[galleryId],
                slide = p.root.find('.' + params.slide + '.' + params.slideIdPrefix + target),
                img = p.gallery[target],
                viewportRatio = p.viewportWidth / p.viewportHeight,
                imgRatio = img.width / img.height;

            // Algorithm
            if (p.viewportWidth > img.width && p.viewportHeight > img.height) {
                slide
                    .removeClass(params.mod.auto)
                    .addClass(params.mod.center);
            } else {
                slide
                    .removeClass(params.mod.center)
                    .addClass(params.mod.auto);
            }

            // Orientation
            if (imgRatio >= viewportRatio) {
                slide
                    .removeClass(params.mod.portrait)
                    .addClass(params.mod.landscape);
            } else {
                slide
                    .removeClass(params.mod.landscape)
                    .addClass(params.mod.portrait);
            }
        },

        setIndent: function(value) {
            var result = {};

            if (params.transform) {
                result[prefixes[params.transform]] = 'translate3d(' + value + '%, 0, 0)';
            } else {
                result.left = value + '%';
            }

            return result;
        },

        getTemplate: function(id) {
            return '<div class="' + params.slide + ' ' + params.slideIdPrefix + id + ' ' + params.mod.loading + '" data-id="' + id + '"></div>';
        }
    };

    $.fn.photor = function(method) {

        if ( methods[method] ) {
            return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Unknown method: ' +  method );
        }

    };

}(jQuery));


// Disabled кнопки
// Клик на touch (tap)
// Счетчик
// Fade
// Preloader
