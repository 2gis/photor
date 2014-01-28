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
        data = [],
        params, timer;

    (function () {
        var touchClick = false;

        // Create custom "Fast click" event.
        document.addEventListener('touchstart', function () {
            touchClick = true;
        }, false);

        document.addEventListener('touchmove', function () {
            touchClick = false;
        }, false);

        document.addEventListener('touchend', function (e) {
            if (touchClick) {
                touchClick = false;

                // Send fast click.
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent('fastclick', true, true, e.target);

                e.target.dispatchEvent(event);
                e.preventDefault();
            }
        }, false);
    }());

    var methods = {
        init: function(options) {
            params = $.extend({

                current: 0,
                count: 0,
                loadingRange: 2,
                slideIdPrefix: '_',
                transform: getSupportedTransform()

            }, options);

            return this.each(function(i) {
                var root = $(this),
                    galleryId = this.id || i,
                    p = {}, // Current instance of gallery
                    content = '',
                    count = 0,
                    thumbs = [];

                // Get elements
                p.root        = root;
                p.control     = root.find('.' + params.control);
                p.next        = root.find('.' + params.next);
                p.prev        = root.find('.' + params.prev);
                p.thumbs      = root.find('.' + params.thumbs);
                p.thumbsLayer = root.find('.' + params.thumbsLayer);
                p.thumb       = root.find('.' + params.thumb);
                p.thumbImg    = root.find('.' + params.thumbImg);
                p.thumbFrame  = root.find('.' + params.thumbFrame);
                p.viewport    = root.find('.' + params.viewport);
                p.layer       = root.find('.' + params.layer);

                // Images info
                p.gallery = [];
                p.thumb.each(function(j) {
                    var self = $(this),
                        thumbImg = self.find('.' + params.thumbImg)[0];

                    p.gallery.push({
                        url: this.href,
                        width: 0,
                        height: 0,
                        loaded: false
                    });
                    content += methods.getTemplate(j);
                    count++;

                    self
                        .attr('data-rel', j)
                        .addClass(params.slideIdPrefix + j);

                    // Thumbs init
                    thumbs[j] = thumbImg.src;
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
                p.thumbSrc = thumbs;

                data[galleryId] = p;

                methods.loadThumbs(galleryId);
                methods.handlers(galleryId);
                methods.go(galleryId, p.current, 0);

                if (params.swipe) {
                    methods.checkThumbs(galleryId);
                }
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
            p.next.on('click fastclick', function() {
                if (p.allowClick && !p.dragging) {
                    methods.next(galleryId);
                }
            });

            // Previous button
            p.prev.on('click fastclick', function() {
                if (p.allowClick && !p.dragging) {
                    console.log('!!!');
                    methods.prev(galleryId);
                }
            });

            // Click by thumbnail
            p.thumb
                .on('click fastclick', function(e) {
                    e.preventDefault();

                    if (p.allowClick) {
                        var target = parseInt($(this).attr('data-rel'));

                        methods.go(galleryId, target);
                    }

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

                    methods.setCurrentThumb(galleryId, p.current);
                }
            }

        },

        bindSwipe: function(galleryId) {
            var p = data[galleryId],
                element = p.root.find('.' + params.control + ', .' + params.thumbsLayer),
                start = {},
                delta = {},
                isScrolling,
                isMultiTouch = false,
                thumbsStartIndent = 0,
                thumbsStartTime,
                thumbsEndTime,
                self;

            p.dragging = false;

            element

                // Pointer start
                .on('mousedown touchstart', function(e) {
                    var self = $(this),
                        offset = self.offset();

                    if (!p.dragging) {
                        start = {
                            x: e.pageX || e.originalEvent.touches[0].pageX,
                            y: e.pageY || e.originalEvent.touches[0].pageY
                        };

                        delta = {x: 0, y: 0};

                        if (self.hasClass(params.thumbsLayer)) {
                            if (p.thumbsDragging) {
                                thumbsStartIndent = methods.getThumbsPosition(self);
                                thumbsStartTime = new Date();

                                p.thumbsLayer.css('transition-duration', '0s');
                            }
                        }

                        if (e.type == 'touchstart') {
                            return true;
                        }

                        p.dragging = true;
                        p.root.addClass(params.mod.dragging);
                    }
                })

                // Pointer move
                .on('mousemove touchmove', function(e) {
                    var touches = e.originalEvent.touches && e.originalEvent.touches.length,
                        coordX = e.pageX || (e.originalEvent.touches && e.originalEvent.touches[0].pageX),
                        coordY = e.pageY || (e.originalEvent.touches && e.originalEvent.touches[0].pageY);

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
                        e.preventDefault();
                    }

                    // Start touch
                    if (e.type == 'touchmove' && !p.dragging) {
                        p.dragging = true;
                        p.root.addClass(params.mod.dragging);
                    }

                    // Moving
                    if (p.dragging) {
                        var self = $(this);

                        if (self.hasClass(params.thumbsLayer)) {
                            if (p.thumbsDragging) {
                                moveThumbs(self);
                            }
                        } else {
                            moveSlides(self);
                        }
                    }
                })

                // Pointer end
                .on('mouseup mouseleave touchend touchcancel', function(e) {
                    p.root.removeClass(params.mod.dragging);
                    isScrolling = undefined;
                    isMultiTouch = (e.originalEvent.touches && e.originalEvent.touches.length) == 1;

                    if (p.dragging) {
                        var self = $(this);

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

                        if (self.hasClass(params.thumbsLayer)) {
                            endMoveThumbs(self);
                        } else {
                            endMoveSlides(self);
                        }

                    }
                });

            // Prevent default image drag-n-drop
            p.thumbImg.on('dragstart', function() {
                return false;
            });

            function moveSlides(self) {
                p.allowClick = false;

                var selfWidth = self.outerWidth(),
                    relativeDeltaX, indent;

                relativeDeltaX = -delta.x / selfWidth * 100;
                indent = -p.current * 100 + relativeDeltaX;

                p.layer.css(methods.setIndent(indent));
            }

            function endMoveSlides(self) {
                var selfWidth = self.outerWidth(),
                    target;

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

            function moveThumbs(self) {
                var selfWidth = p.thumbs.outerWidth(),
                    indent;

                indent = -delta.x + thumbsStartIndent;

                p.thumbsLayer.css(methods.setIndent(indent, 'px'));
            }

            function endMoveThumbs(self) {
                var currentIndent, direction;

                if (p.thumbsDragging) {
                    thumbsStartIndent = methods.getThumbsPosition(self);
                    thumbsEndTime = new Date();

                    currentIndent = methods.getThumbsPosition(p.thumbsLayer);
                    direction = delta.x > 0 ? -1 : 1;

                    p.thumbsLayer
                        .css('transition-duration', '.3s')
                        .css(methods.setIndent(calcTailAnimation(currentIndent, direction), 'px'));
                }
            }

            function calcTailAnimation(currentIndent, direction) {
                var tail = direction * parseInt(Math.pow(10 * delta.x / (thumbsEndTime - thumbsStartTime), 2)) + currentIndent,
                    limit = p.thumbs.outerWidth() - p.thumbsLayer.outerWidth();

                if (tail > 0) {
                    return 0;
                }

                if (tail < limit) {
                    return limit;
                }

                return tail;
            }
        },

        checkThumbs: function(galleryId) {
            var p = data[galleryId],
                thumbsW = p.thumbs.outerWidth(),
                layerW = p.thumbsLayer.outerWidth(),
                limit = thumbsW - layerW,
                currentIndent;

            if (thumbsW > layerW) {
                p.thumbsDragging = false;
                p.thumbsLayer
                    .css('transition-duration', '0s')
                    .css(methods.setIndent(0, 'px'));
            } else {
                currentIndent = methods.getThumbsPosition(p.thumbsLayer);
                p.thumbsDragging = true;

                if (currentIndent < limit) {
                    p.thumbsLayer
                        .css('transition-duration', '0s')
                        .css(methods.setIndent(limit, 'px'));
                }
            }
        },

        getThumbsPosition: function(element) {
            if (params.transform) {
                var matrix = element.css(prefixes[params.transform]);

                return parseFloat(matrix.substr(7, matrix.length - 8).split(', ')[4]);
            } else {
                return parseInt(element[0].style.left);
            }
        },

        bindKeyboard: function(galleryId) {
            var p = data[galleryId];

            $(window).on('keydown', function(e) {
                var key = e.which || e.keyCode;

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
            methods.setCurrentThumb(galleryId, target);
            p.slide.removeClass(params.mod.current);
            p.slide
                .filter('.' + params.slideIdPrefix + target)
                .addClass(params.mod.current);

            // Load slide's range
            methods.loadSlides(galleryId, target);
            methods.checkButtons(galleryId);

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
                slide = p.root.find('.' + params.slide + '.' + params.slideIdPrefix + target + ' '),
                slideImg = slide.find('.' + params.slideImg),
                url = p.gallery[target].url,
                img = document.createElement('img');

            (function(rel) {
                var image = $(img);

                image
                    .on('load', function() {
                        p.gallery[rel].loaded = true;
                        p.gallery[rel].width = this.width;
                        p.gallery[rel].height = this.height;

                        slide.removeClass(params.mod.loading);

                        methods.position(galleryId, rel);
                    })
                    .on('error', function() {
                        // @TODO Обработай ошибку, друже
                    });

                img.src = url;

                slideImg.css('background-image', 'url(' + img.src + ')');
            })(target);
        },

        loadThumbs: function(galleryId) {
            var p = data[galleryId],
                count = p.count,
                images = p.thumbSrc,
                img = document.createElement('img'),
                loaded = 0;

            p.galleryThumbs = [];
            p.galleryThumbsLoaded = false;

            for (var i = 0; i <= count; i++) {
                (function(i) {
                    var image = $(img);

                    image
                        .on('load', function() {
                            loaded++;

                            if (loaded == count) {
                                p.galleryThumbsLoaded = true;
                                methods.getThumbsSize(galleryId);
                                // methods.checkThumbs(galleryId);
                            }
                        })
                        .on('error', function() {
                            // @TODO Обработай ошибку, друже
                        });

                    img.src = images[i];
                })(i);
            }
        },

        getThumbsSize: function(galleryId) {
            var p = data[galleryId],
                thumb = p.thumb;

            thumb.each(function(i) {
                var self = $(this);

                p.galleryThumbs[i] = {};
                p.galleryThumbs[i].width = self.outerWidth();
                p.galleryThumbs[i].height = self.outerHeight();
                p.galleryThumbs[i].top = self.position().top + parseInt(self.css('margin-top'));
                p.galleryThumbs[i].left = self.position().left + parseInt(self.css('margin-left'));
            });

            methods.setCurrentThumb(galleryId, p.current);
        },

        setCurrentThumb: function(galleryId, target) {
            var p = data[galleryId],
                frame = p.thumbFrame,
                styles = {},
                current = p.galleryThumbs[target],
                containerWidth = p.thumbs.outerWidth(),
                width = p.thumbsLayer.outerWidth(),
                indent;

            if (p.galleryThumbsLoaded) {
                styles.width = current.width + 'px';
                styles.height = current.height + 'px';

                if (params.transform) {
                    styles[prefixes[params.transform]] = 'translate3d(' + current.left + 'px, ' + current.top + 'px, 0)';
                } else {
                    styles.top = current.top + 'px';
                    styles.left = current.left + 'px';
                }

                indent = -1 * (current.left - 0.5 * (containerWidth - current.width));

                frame.css(styles);

                p.thumbsLayer
                    .css('transition-duration', '.3s')
                    .css(methods.setIndent(validateIndent(indent), 'px'));
            }

            function validateIndent(indent) {
                var limit = containerWidth - width;

                return indent > 0 ? 0 : indent < limit ? limit : indent;
            }
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

        checkButtons: function(galleryId) {
            var p = data[galleryId];

            if (p.current == 0) {
                p.prev.addClass(params.mod.disabled);
            } else {
                p.prev.removeClass(params.mod.disabled);
            }
            if (p.current == p.count) {
                p.next.addClass(params.mod.disabled);
            } else {
                p.next.removeClass(params.mod.disabled);
            }
        },

        setIndent: function(value, meter) {
            var result = {};

            meter = meter || '%';

            if (params.transform) {
                result[prefixes[params.transform]] = 'translate3d(' + value + meter + ', 0, 0)';
            } else {
                result.left = value + '%';
            }

            return result;
        },

        getTemplate: function(id) {
            return '<div class="' + params.slide + ' ' + params.slideIdPrefix + id + ' ' + params.mod.loading + '" data-id="' + id + '"><div class="' + params.slideImg + '"></div></div>';
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


// Счетчик

// Тумбы: позиционирование на рамочку
// Оптимизировать обработчики драг-н-дропа

// visibility hidden для изображений, которые далеко
