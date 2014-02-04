(function($) {

    // Server side
    if (!window) {
        return;
    }

    var prefixes = {
            'transform': 'transform',
            'OTransform': '-o-transform',
            'msTransform': '-ms-transform',
            'MozTransform': '-moz-transform',
            'WebkitTransform': '-webkit-transform'
        },
        data = [],
        isMsPointer = navigator.msPointerEnabled,
        evt = getSupportedEvents(),
        isFastClick = false,
        params, timer;


    /*
     * Returns supported property for css-transform
     *
     * @return {String} string key
     */
    function getSupportedTransform() {
        for (var key in prefixes) {
            if (document.createElement('div').style[key] !== undefined) {
                return key;
            }
        }
        return false;
    }

    /*
     * Returns array of events which device supports
     *
     * @return {Array} Array of supported events
     */
    function getSupportedEvents() {
        var isPointer = navigator.pointerEnabled,
            isTouch   = !!('ontouchstart' in window),
            pointer   = ['pointerdown', 'pointermove', 'pointerup', 'pointerleave'],
            msPointer = ['MSPointerDown', 'MSPointerMove', 'MSPointerUp', 'MSPointerOut'],
            touch     = ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
            mouse     = ['mousedown', 'mousemove', 'mouseup', 'mouseleave'];

        return isPointer ? pointer : isMsPointer ? msPointer : isTouch ? touch : mouse;
    }


    /*
     * Click without 300 ms delay on mobile devices
     */
    (function() {
        var start = {},
            delta = {},
            touchClick = false;

        if (Element.prototype.addEventListener) {
            isFastClick = true;

            // Create custom "Fast click" event.
            document.addEventListener(evt[0], function(e) {
                var x = e.pageX || touches[0].pageX,
                    y = e.pageY || touches[0].pageY;

                start = {x: x, y: y};
                touchClick = true;
            }, false);

            document.addEventListener(evt[1], function(e) {
                var touches = e.originalEvent && e.originalEvent.touches,
                    x = e.pageX || touches[0].pageX,
                    y = e.pageY || touches[0].pageY;

                delta = {x: x, y: y};
                touchClick = false;
            }, true);

            document.addEventListener(evt[2], function(e) {
                if (touchClick || (Math.abs(start.x - delta.x) < 20 && Math.abs(start.y - delta.y) < 20)) {
                    touchClick = false;

                    // Send fast click.
                    var event = document.createEvent('CustomEvent');
                    event.initCustomEvent('fastclick', true, true, e.target);

                    e.target.dispatchEvent(event);
                    e.preventDefault();
                }
            }, false);
        }

    })();

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
                p.thumbsDragging = false;
                p.allowClick = true;
                p.viewportWidth = p.viewport.outerWidth();
                p.viewportHeight = p.viewport.outerHeight();
                p.thumbSrc = thumbs;

                data[galleryId] = p;

                methods.loadThumbs(galleryId);
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
                delta = 84, // 12 FPS
                clickEvent = isFastClick ? 'fastclick' : 'click';

            console.log(clickEvent);

            // Swipe slides
            if (params.swipe) {
                methods.bindSwipe(galleryId);
            }

            // Next button
            p.next.on(clickEvent, function(e) {
                methods.next(galleryId);
                e.stopPropagation();
            });

            // Previous button
            p.prev.on(clickEvent, function(e) {
                methods.prev(galleryId);
                e.stopPropagation();
            });

            // Click by thumbnail
            p.thumb
                .on(clickEvent, function(e) {
                    e.preventDefault();

                    if (p.allowClick) {
                        var target = parseInt($(this).attr('data-rel'));

                        methods.go(galleryId, target);
                        e.stopPropagation();
                    }

                    return false;
                })
                .on('click', function(e) {
                    return false;
                });

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

                    methods.setCurrentThumb(galleryId, p.current, 1);
                }
            }

        },

        bindSwipe: function(galleryId) {
            var p = data[galleryId],
                element = p.root.find('.' + params.control + ', .' + params.thumbsLayer),
                start = {},
                delta = {},
                isScrolling,
                isMultitouch = false,
                // thumbsStartIndent = 0,
                thumbsStartTime,
                thumbsEndTime,
                self,
                selfWidth;

            p.dragging = false;
            p.thumbsIndent = 0;

            /*
             MS Pointer события через jQuery не содержат originalEvent и данных о координатах
             Touch события на Андроид, установленные нативно, не срабатывают до зума или скролла
             iOS устройства просто работают =^_^=
             */
            if (isMsPointer) {

                element[0].addEventListener(evt[0], touchstart);
                element[0].addEventListener(evt[1], touchmove);
                element[0].addEventListener(evt[2], touchend);
                element[0].addEventListener(evt[3], touchend);

            } else {

                element
                    .on(evt[0], touchstart)
                    .on(evt[1], touchmove)
                    .on(evt[2], touchend)
                    .on(evt[3], touchend);

            }

            // Prevent default image drag-n-drop
            p.thumbImg.on('dragstart', function() {
                return false;
            });

            /*
             * Pointer start
             */
            function touchstart(e) {
                if (!p.dragging) {
                    var x = e.pageX || e.originalEvent.touches[0].pageX,
                        y = e.pageY || e.originalEvent.touches[0].pageY;

                    self = $(this);
                    selfWidth = self.outerWidth();
                    start = {x: x, y: y};
                    delta = {x: 0, y: 0};

                    p.dragging = true;
                    p.root.addClass(params.mod.dragging);

                    if ($(this).hasClass(params.thumbsLayer)) {
                        if (p.thumbsDragging) {
                            thumbsStartIndent = p.thumbsIndent;
                            thumbsStartTime = new Date();

                            p.thumbsLayer.css('transition-duration', '0s');
                        }
                    }
                }
            }

            /*
             * Pointer move
             */
            function touchmove(e) {
                var touches = e.originalEvent && e.originalEvent.touches,
                    x = e.pageX || (touches && touches[0].pageX),
                    y = e.pageY || (touches && touches[0].pageY);

                // console.log(JSON.stringify(self));

                // Detect multitouch
                isMultitouch = isMultitouch || (touches && touches.length) > 1;

                // Detect scrolling (for windows and windows phone touch-action: pan-y)
                if (e.type != 'MSPointerMove' && e.type != 'pointermove' && typeof isScrolling == 'undefined') {
                    isScrolling = !!(isScrolling || Math.abs(x - start.x) < Math.abs(y - start.y));
                }

                if (!p.dragging || isMultitouch || isScrolling) {
                    p.dragging = false;
                    return;
                } else {
                    e.preventDefault();
                }

                /*
                 Windows Phone и windows во время MSPointerDown / pointerdown не знают координат
                 */
                if (!start.x && !start.y) {
                    start = {x: x, y: y};
                    delta = {x: 0, y: 0};
                } else {
                    delta = {x: x - start.x, y: y - start.y};
                }

                // Moving

                if (self.hasClass(params.thumbsLayer)) {
                    if (p.thumbsDragging) {
                        moveThumbs(self);
                    }
                } else {
                    moveSlides(self);
                }
            }

            /*
             * Pointer end
             */
            function touchend(e) {
                /*
                 Force re-layout (в хроме под андроидом без этого отключаются обработчики тач-событий)
                 */
                // this.style.display = 'none';
                // $(this).outerWidth(); // no need to store this anywhere, the reference is enough
                // this.style.display = 'block';

                if (p.dragging) {
                    var self = $(this);

                    p.dragging = false;
                    p.root.removeClass(params.mod.dragging);

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

                // Reset scrolling detection
                isScrolling = undefined;

                // Update multitouch info
                if (e.type != 'MSPointerUp' && e.type != 'MSPointerOut' && e.type != 'pointerup' && e.type != 'pointerleave') {
                    isMultitouch = (e.originalEvent.touches && e.originalEvent.touches.length) == 1;
                }

                p.dragging = false;
                start = {};
            }

            /*
             * Move slides on drag
             */
            function moveSlides(self) {
                p.allowClick = false;

                var relativeDeltaX, indent;

                relativeDeltaX = delta.x / selfWidth * 100;
                indent = -p.current * 100 + relativeDeltaX;

                p.layer.css(methods.setIndent(indent));
            }

            /*
             * Go to slide on drag end
             */
            function endMoveSlides(self) {
                var selfWidth = self.outerWidth(),
                    target;

                // Target slide
                target = delta.x > 0 ? p.current + 1 : p.current - 1;

                // Transition executes if delta more then 5% of container width
                if (Math.abs(delta.x) > selfWidth * 0.05) {
                    if (delta.x < 0) {
                        methods.next(galleryId);
                    } else {
                        methods.prev(galleryId);
                    }
                } else {
                    methods.go(galleryId, p.current);
                }
            }

            /*
             * Move thumbs on drag
             */
            function moveThumbs(self) {
                var selfWidth = p.thumbs.outerWidth(),
                    indent;

                indent = delta.x + thumbsStartIndent;

                p.thumbsIndent = indent;
                p.thumbsLayer.css(methods.setIndent(indent, 'px'));
            }

            /*
             * Inertial motion of thumbnails on drag end
             */
            function endMoveThumbs(self) {
                var direction;

                if (p.thumbsDragging) {
                    thumbsEndTime = new Date();

                    direction = delta.x < 0 ? -1 : 1;
                    p.thumbsIndent = calcTailAnimation(p.thumbsIndent, direction);

                    p.thumbsLayer
                        .css('transition-duration', '.24s')
                        .css(methods.setIndent(p.thumbsIndent, 'px'));
                }
            }

            /*
             * Calculate indent for inertial motion of thumbnails
             */
            function calcTailAnimation(currentIndent, direction) {
                var speed = Math.abs(10 * delta.x / (thumbsEndTime - thumbsStartTime)),
                    tail, limit;

                tail = direction * parseInt(Math.pow(speed, 2)) + currentIndent;
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
                        $.error('Image wasn\'t loaded: ' + this.src);
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
                            }
                        })
                        .on('error', function() {
                            $.error('Image wasn\'t loaded: ' + this.src);
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

            methods.setCurrentThumb(galleryId, p.current, 1);
        },

        setCurrentThumb: function(galleryId, target, noEffects) {
            var p = data[galleryId],
                frame = p.thumbFrame,
                styles = {},
                current = p.galleryThumbs[target],
                thumbsW = p.thumbs.outerWidth(),
                layerW = p.thumbsLayer.outerWidth(),
                delay = noEffects ? '0s' : '.24s',
                indent, validatedIndent;

            p.thumbsDragging = thumbsW < layerW;

            if (p.galleryThumbsLoaded) {
                styles.width = current.width + 'px';
                styles.height = current.height + 'px';

                if (params.transform) {
                    styles[prefixes[params.transform]] = 'translate3d(' + current.left + 'px, ' + current.top + 'px, 0)';
                } else {
                    styles.top = current.top + 'px';
                    styles.left = current.left + 'px';
                }

                indent = -1 * (current.left - 0.5 * (thumbsW - current.width));
                validatedIndent = validateIndent(indent);
                p.thumbsIndent = validatedIndent;

                frame
                    .css('transition-duration', delay)
                    .css(styles);

                p.thumbsLayer
                    .css('transition-duration', delay)
                    .css(methods.setIndent(validatedIndent, 'px'));

            }

            /*
             * Validates recommended indent (inscribes layer into the container correctly)
             *
             * @param {number} indent of layer in the container
             * @return {number} correct indent
             */
            function validateIndent(indent) {
                var limit = thumbsW - layerW;

                return indent > 0 || !p.thumbsDragging ? 0 : indent < limit ? limit : indent;
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
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Unknown method: ' +  method);
        }

    };

}(jQuery));


// Счетчик
// Оптимизировать обработчики драг-н-дропа
// visibility hidden для изображений, которые далеко
