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
        evt = getSupportedEvents(),
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
     * Кроссбраузерно добавляет обработчики событий
     *
     * @param {HTMLElement} element HTMLElement
     * @param {event} e Событие
     * @param {function} handler Обработчик события
     * @param {bool} capture Capturing
     */
    function addListener(element, e, handler, capture) {
        capture = !!capture;

        if (element.addEventListener) {
            element.addEventListener(e, handler, capture);
        } else {
            if (element.attachEvent) {
                element.attachEvent('on' + e, handler);
            } else {
                element[e] = handler;
            }
        }
    }

    /*
     * Проверяет наличие класса у нативного HTML-элемент
     *
     * @param {HTMLElement} element HTMLElement
     * @param {string} className Имя класса
     */
    function hasClass(element, className) {
        var classNames = ' ' + element.className + ' ';

        className = ' ' + className + ' ';

        if (classNames.replace(/[\n\t]/g, ' ').indexOf(className) > -1) {
            return true;
        }

        return false;
    }

    /*
     * Возвращает массив поддерживаемых событий
     * Если браузер поддерживает pointer events или подключена handjs, вернет события указателя.
     * Если нет, используем события мыши
     *
     * @return {Array} Массив с названиями событий
     */
    function getSupportedEvents() {
        var pointerEnabled = navigator.pointerEnabled;

        if (pointerEnabled) {
            return ['pointerdown', 'pointermove', 'pointerup', 'pointerleave'];
        }

        return ['mousedown', 'mousemove', 'mouseup', 'mouseleave'];
    }

    function debounce(fn, timeout, invokeAsap, ctx) {
        if (arguments.length == 3 && typeof invokeAsap != 'boolean') {
            ctx = invokeAsap;
            invokeAsap = false;
        }

        var timer;

        return function() {
            var args = arguments;

            ctx = ctx || this;
            if (invokeAsap && !timer) {
                fn.apply(ctx, args);
            }

            clearTimeout(timer);

            timer = setTimeout(function() {
                if (!invokeAsap) {
                    fn.apply(ctx, args);
                }
                timer = null;
            }, timeout);
        };
    }

    /*
     * Throttle декоратор
     *
     * @param {function} fn Функция
     * @param {number} timeout Таймаут в миллисекундах
     * @param {object} ctx Контекст вызова
     */
    function throttle(fn, timeout, ctx) {
        var timer, args, needInvoke;

        return function() {
            args = arguments;
            needInvoke = true;
            ctx = ctx || this;

            if (!timer) {
                (function() {
                    if (needInvoke) {
                        fn.apply(ctx, args);
                        needInvoke = false;
                        timer = setTimeout(arguments.callee, timeout);
                    } else {
                        timer = null;
                    }
                })();
            }
        };
    }

    /*
     * Устанавливает обработчики управления указателем (touch, mouse, pen)
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindControl(galleryId) {
        var p = data[galleryId],

            // Elements and properties
            control = p.control[0],
            thumbs = p.thumbs[0],
            self,
            selfWidth,

            // Scrolling
            isScrolling,

            // Multitouch
            fingers = 0,
            isMultitouch = false,

            // Thumbs
            thumbsStartIndent = 0,
            thumbsStartTime,
            thumbsEndTime,

            // Coordinates
            start = {},
            delta = {};

        p.dragging = false;
        p.thumbsIndent = 0;

        // Перетаскивание и клики по основной части галереи
        addListener(control, evt[0], touchstart, false);
        addListener(control, evt[1], throttle(touchmove, 13), true);
        addListener(control, evt[2], touchend, false);
        addListener(control, evt[3], touchend, false);

        // Перетаскивание и клики по по миниатюрам
        addListener(thumbs, evt[0], touchstart, false);
        addListener(thumbs, evt[1], throttle(touchmove, 13), true);
        addListener(thumbs, evt[2], touchend, false);
        addListener(thumbs, evt[3], touchend, false);

        // Не переходить по ссылке миниатюры
        for (var i = 0, len = p.thumb.length; i < len; i++) {
            addListener(p.thumbImg[i], 'click', function(e) {
                e.preventDefault();
            }, false);
        }

        // Отменить встроенный драг-н-дроп для картинок
        for (i = 0, len = p.thumbImg.length; i < len; i++) {
            addListener(p.thumbImg[i], 'dragstart', function(e) {
                e.preventDefault();
            }, false);
        }

        /*
         * Обработчик pointerdown
         *
         * @param {event} e Событие pointerdown
         */
        function touchstart(e) {
            fingers++;

            if (!p.dragging) {
                var x = e.pageX || e.touches[0].pageX,
                    y = e.pageY || e.touches[0].pageY;

                start = {x: x, y: y};
                delta = {x: 0, y: 0};

                p.dragging = true;

                self = this;
                selfWidth = self.offsetWidth;

                if (hasClass(self, params.thumbs) && p.thumbsDragging) {
                    thumbsStartIndent = p.thumbsIndent;
                    thumbsStartTime = new Date();

                    p.thumbsLayer.css('transition-duration', '0s');
                }
            }
        }

        /*
         * Обработчик pointermove
         *
         * @param {event} e Событие pointermove
         */
        function touchmove(e) {
            if (p.dragging) {
                var x = e.pageX || touches[0].pageX,
                    y = e.pageY || touches[0].pageY;

                // Detect multitouch
                isMultitouch = isMultitouch || fingers > 1;

                // Detect scrolling (for windows and windows phone touch-action: pan-y)
                if (typeof isScrolling == 'undefined') {
                    isScrolling = !!(isScrolling || Math.abs(x - start.x) < Math.abs(y - start.y));
                }

                // Жест прерван / отменен (используем нативное поведение)
                if (!p.dragging || isMultitouch || isScrolling) {
                    p.dragging = false;

                    // Завершаем взаимодействие с UI
                    if (hasClass(self, params.control)) {
                        slidesEnd();
                    } else {
                        if (p.thumbsDragging) {
                            thumbsEnd();
                        }
                    }

                    return;
                } else {
                    e.preventDefault();
                }

                // Continue drag
                delta = {x: x - start.x, y: y - start.y};

                if (hasClass(self, params.control)) {
                    slidesMove();
                } else {
                    if (p.thumbsDragging) {
                        thumbsMove();
                    }
                }
            }
        }

        /*
         * Обработчик pointerup
         *
         * @param {event} e Событие pointerup
         */
        function touchend(e) {
            if (fingers != 0) {
                fingers--;
            }

            if (typeof self == 'undefined') {
                return;
            }

            var isMoved = Math.abs(delta.x) > 20 || Math.abs(delta.y) > 20;

            if (p.dragging && isMoved && hasClass(self, params.control)) {
                slidesEnd();
            }

            if (p.thumbsDragging && isMoved && hasClass(self, params.thumbs)) {
                thumbsEnd();
            }

            // Если указатель не двигался, значит обрабатываем клик
            if (!isMoved && !isScrolling) {

                // Назад
                if (hasClass(e.target, params.prev)) {
                    methods.prev(galleryId);
                }

                // Вперед
                if (hasClass(e.target, params.next)) {
                    methods.next(galleryId);
                }

                // Клик по миниатюре
                if (hasClass(e.target, params.thumbImg)) {
                    var target = parseInt(e.target.getAttribute('data-rel'));

                    methods.go(galleryId, target);
                    e.stopPropagation();
                }

                e.stopPropagation();
                e.preventDefault(); // Нужно для отмены зума по doubletap
            }

            // Reset scrolling detection
            isScrolling = undefined;

            // Update multitouch info
            isMultitouch = !!fingers;

            // Stop dragging
            p.dragging = false;
            self = undefined;
            start = {};
        }

        /*
         * Движение слайдов во время перетаскивания
         */
        function slidesMove() {
            var relativeDeltaX, indent;

            relativeDeltaX = delta.x / selfWidth * 100;
            indent = -p.current * 100 + relativeDeltaX;

            p.layer.css(methods.setIndent(indent));
        }

        /*
         * Завершение движения слайдов
         */
        function slidesEnd() {
            var target = delta.x > 0 ? p.current + 1 : p.current - 1;

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
         * Движение слайдов прервано
         */
        function slidesCancel() {}

        /*
         * Движение миниатюр при перетаскивании
         */
        function thumbsMove() {
            var indent = delta.x + thumbsStartIndent;

            // console.log(delta.x, thumbsStartIndent);

            p.thumbsIndent = indent;
            p.thumbsLayer.css(methods.setIndent(indent, 'px'));
        }

        /*
         * Завершение движения миниатюр
         */
        function thumbsEnd() {
            if (p.thumbsDragging) {
                var direction = delta.x < 0 ? -1 : 1;

                thumbsEndTime = new Date();
                p.thumbsIndent = calcTailAnimation(p.thumbsIndent, direction);

                p.thumbsLayer
                    .css('transition-duration', '.24s')
                    .css(methods.setIndent(p.thumbsIndent, 'px'));
            }
        }

        /*
         * Вычисление конечной координаты слоя с миниатюрами с учетом движения по инерции
         *
         * @param {number} currentIndent Текущее положение слоя с миниатюрами в пикселях
         * @param {number} direction Направление движения (-1|1)
         * @returns {number} Значение координаты слоя с миниатюрами в пикселях
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
    }

    /*
     * Устанавливает обработчик изменения размера окна
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindResize(galleryId) {
        var p = data[galleryId];

        addListener(window, 'resize', debounce(resize, 84));

        /*
         * Resize handler
         */
        function resize() {
            p.viewportWidth = p.viewport.outerWidth();
            p.viewportHeight = p.viewport.outerHeight();

            p.slide.each(function(i) {
                methods.position(galleryId, i);
            });

            methods.setCurrentThumb(galleryId, p.current, 1);
        }
    }

    /*
     * Устанавливает обработчики управления с клавиатуры
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindKeyboard(galleryId) {
        var p = data[galleryId];

        addListener(window, 'keydown', function(e) {
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
        }, false);
    }

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

                    $(thumbImg)
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
            var p = data[galleryId];

            // Swipe slides
            bindControl(galleryId);

            // Keyboard
            if (params.keyboard) {
                bindKeyboard(galleryId);
            }

            // Resize
            bindResize(galleryId);
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
