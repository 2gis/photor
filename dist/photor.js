;(function($) {

    // Server side
    if (typeof window == 'undefined') {
        return;
    }

    var prefixes = {
            'transform': 'transform',
            'WebkitTransform': '-webkit-transform',
            'MozTransform': '-moz-transform',
            'msTransform': '-ms-transform',
            'OTransform': '-o-transform'
        },
        data = [],
        evt = getSupportedEvents(),
        handlers = [],
        params;

    var methods = {
        init: function(options) {
            var blockPrefix = 'photor__';

            params = $.extend({

                // Elements
                control:     blockPrefix + 'viewportControl',
                next:        blockPrefix + 'viewportControlNext',
                prev:        blockPrefix + 'viewportControlPrev',
                thumbs:      blockPrefix + 'thumbs',
                thumbsLayer: blockPrefix + 'thumbsWrap',
                thumb:       blockPrefix + 'thumbsWrapItem',
                thumbImg:    blockPrefix + 'thumbsWrapItemImg',
                thumbFrame:  blockPrefix + 'thumbsWrapFrame',
                viewport:    blockPrefix + 'viewport',
                layer:       blockPrefix + 'viewportLayer',
                slide:       blockPrefix + 'viewportLayerSlide',
                slideImg:    blockPrefix + 'viewportLayerSlideImg',

                // State modifiers
                _loading: '_loading',       // Фотография загружается
                _error: '_error',           // Не удалось загрузить фотографию
                _current: '_current',       // Текущий слайд или миниатюра
                _dragging: '_dragging',     // Перетаскивание
                _disabled: '_disabled',     // Элемент управления запрещен
                _alt: '_alt',               // Есть подпись к фотографиям
                _single: '_single',         // Модификатор для галереи с одной фотографией
                _animated: '_animated',     // На время анимации
                _hidden: '_hidden',         // Спрятанный слайд
                _html: '_html',             // Слайд с html-содержимым
                _freeze: '_freeze',         // Галерея "заморожена"

                // Algorithm
                _auto: '_auto',             // Фотография больше вьюпорта
                _center: '_center',         // Фотография меньше вьюпорта

                // Orientation
                _portrait: '_portrait',     // Соотношение ширины к высоте фотографии меньше чем у вьюпорта
                _landscape: '_landscape',   // Соотношение ширины к высоте фотографии больше чем у вьюпорта

                // Thumbs
                _draggable: '_draggable',   // Разрешено перетаскивание на миниатюрах

                // Settings
                single: false,              // Инициализировать обработчики для одиночного изображения
                current: 0,                 // Текуший слайд
                count: 0,                   // Количество фотографий
                last: -1,                   // Индекс последней фотографии
                duration: 300,                 // Время анимации для слайдов
                loop: false,                // Зациклить галерею
                showThumbs: 'thumbs',       // thumbs / dots / null
                keyboard: true,             // Управление с клавиатуры
                modifierPrefix: '_',        // Префикс для класса с номером слайда
                ieClassPrefix: '_ie',       // Префикс для класса с версией IE
                slidesOnScreen: 1,          // Количество видимых слайдов во вьюпорте

                // Supported features
                transform: getSupportedTransform(),
                transition: getPrefixed('transition'),

                ie: ie()

            }, options);

            return this.each(function() {
                var root = $(this),
                    galleryId = this.id || data.length,
                    p = {}, // Current instance of gallery
                    content = {},
                    thumbs = [],
                    imageTemplate = {
                        url: '',
                        thumb: '',
                        caption: '',
                        width: 0,
                        height: 0,
                        loaded: false,
                        classes: ''
                    },
                    hasHTML = false;

                // Disable double init
                if (root.attr('data-photor-id')) {
                    // galleryId = this.dataset.photorId;
                    return;
                }

                p.params = $.extend({}, params);

                // Get elements
                p.root        = root;
                p.control     = root.find('.' + p.params.control);
                p.next        = root.find('.' + p.params.next);
                p.prev        = root.find('.' + p.params.prev);
                p.thumbs      = root.find('.' + p.params.thumbs);
                p.thumbsLayer = root.find('.' + p.params.thumbsLayer);
                p.viewport    = root.find('.' + p.params.viewport);
                p.layer       = root.find('.' + p.params.layer);

                // Data collection
                p.slides = [];

                // Initialization by object
                if (p.params.data && p.params.data.length) {

                    for (var i = 0, len = p.params.data.length; i < len; i++) {
                        p.slides.push($.extend({}, imageTemplate, p.params.data[i]));
                    }

                // Initialization by slides
                } else {

                    var slides = root.find('.' + p.params.layer + ' > *');

                    if (slides.length) {
                        slides.each(function() {
                            var isPhoto = this.nodeName == 'IMG';

                            if (isPhoto) {
                                p.slides.push($.extend({}, imageTemplate, {
                                    url: this.src,
                                    caption: this.alt,
                                    thumb: $(this).data('thumb'),
                                    classes: this.className
                                }));
                            } else {
                                hasHTML = true;

                                p.slides.push($.extend({}, imageTemplate, {
                                    html: this.outerHTML,
                                    loaded: true
                                }));
                            }
                        });
                    }

                }

                if (hasHTML && p.params.showThumbs == 'thumbs') {
                    p.params.showThumbs = 'dots';
                }

                if (p.params.slidesOnScreen != 1) {
                    p.params.showThumbs = null;
                }

                // Build DOM
                content = methods.getHTML(p.params, p.slides);

                p._layerDOM = p.layer[0].innerHTML;
                p._thumbsLayerDOM = p.thumbsLayer.first().innerHTML;

                p.layer.html(content.slides);
                p.thumbsLayer.html(content.thumbs);

                // Get builded elements
                p.thumb       = root.find('.' + p.params.thumb);
                p.thumbImg    = root.find('.' + p.params.thumbImg);
                p.thumbFrame  = root.find('.' + p.params.thumbFrame);
                p.slide       = root.find('.' + p.params.slide);
                p.slideImg    = root.find('.' + p.params.slideImg);

                p.slide.each(function(i) {
                    $(this).css('left', i * 100 + '%');
                });

                // Settings
                p.current = p.params.current;
                p.count = p.slides.length;
                p.last = p.count - 1;
                p.thumbsDragging = false;
                p.thumbsIndent = 0;
                p.events = [];

                if (window.getComputedStyle) {
                    p.viewportWidth = parseFloat(window.getComputedStyle(p.viewport[0]).width);
                } else {
                    p.viewportWidth = p.viewport.outerWidth();
                }
                p.viewportHeight = p.viewport.outerHeight();
                p.thumbsWidth = p.thumbs.outerWidth();
                p.thumbsHeight = p.thumbs.outerHeight();

                data[galleryId] = p;
                root.attr('data-photor-id', galleryId);

                if (p.params.showThumbs) {
                    root.addClass(p.params.modifierPrefix + p.params.showThumbs);
                }

                if (p.params.ie) {
                    root.addClass(p.params.ieClassPrefix + p.params.ie);
                }

                if (p.slides.length == 1) {
                    root.addClass(p.params._single);
                }

                if (p.params.showThumbs == 'thumbs') {
                    methods.loadThumbs(galleryId);
                }

                if (p.slides.length > 1 || p.params.single) {
                    methods.handlers(galleryId);
                }

                methods.go(galleryId, p.current, 0);
                callback(galleryId);
            });
        },

        update: function() {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    updateInstance(key);
                }
            }

            function updateInstance(galleryId) {
                var p = data[galleryId];

                if (window.getComputedStyle) {
                    p.viewportWidth = parseFloat(window.getComputedStyle(p.viewport[0]).width);
                } else {
                    p.viewportWidth = p.viewport.outerWidth();
                }
                p.viewportHeight = p.viewport.outerHeight();
                p.thumbsWidth = p.thumbs.outerWidth();
                p.thumbsHeight = p.thumbs.outerHeight();
                p.thumbsLayerWidth = p.thumbsLayer.outerWidth();

                p.slide.each(function(i) {
                    methods.position(galleryId, i);
                });

                if (p.params.showThumbs == 'thumbs') {
                    methods.getThumbsSize(galleryId);
                }

                p.layer
                    .css('transition-duration', '0s')
                    .css(methods.setIndent(galleryId, -100 * p.current));
            }
        },

        destroy: function(galleryId) {

            if (typeof galleryId != 'undefined') {
                destroyInstance(galleryId);
            } else {
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        destroyInstance(key);
                    }
                }
            }


            /*
             * Удалить обработчики для указанного инстанса галереи и вернуть DOM к изначальному состоянию
             *
             * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
             */
            function destroyInstance(id) {
                var p = data[id];

                for (var i = 0, len = p.events.length; i < len; i++) {
                    eventManager(p.events[i].element, p.events[i].event, p.events[i].handler, p.events[i].capture, 1);
                }

                // Clear DOM
                p.layer[0].innerHTML = p._layerDOM;
                p.thumbsLayer[0].innerHTML = p._thumbsLayerDOM;

                // Clear DOM attributes
                p.layer.attr('style', '');
                p.root.removeAttr('data-photor-id');

                delete data[id];
            }
        },

        handlers: function(galleryId) {
            var p = data[galleryId];

            bindControl(galleryId);
            bindResize(galleryId);
            bindTransitionEnd(galleryId);

            if (p.params.keyboard) {
                bindKeyboard(galleryId);
            }

            for (var i = 0, len = p.events.length; i < len; i++) {
                eventManager(p.events[i].element, p.events[i].event, p.events[i].handler, p.events[i].capture);
            }
        },

        go: function(galleryId, target, duration) {
            var p = data[galleryId];

            if (p.freeze) {
                return;
            }

            toggleSlides(galleryId, target);

            duration = duration == null ? p.params.duration : duration;

            p.root.addClass(p.params._animated);

            p.layer
                .css('transition-duration', duration + 'ms')
                // .css(methods.setIndent(galleryId, -target * p.viewportWidth));
                .css(methods.setIndent(galleryId, -target * (p.viewportWidth / p.params.slidesOnScreen), 'px'));

            p.current = target;

            // Load slide's range
            methods.loadSlides(galleryId, target);
            methods.checkButtons(galleryId);

            // Mark slide and thumb as current
            methods.setCurrentThumb(galleryId, target);

            p.slide.removeClass(p.params._current);
            p.slide
                .filter('.' + p.params.modifierPrefix + target)
                .addClass(p.params._current);

            if (!p.params.transition) {
                callback(galleryId);
            }

        },

        next: function(galleryId) {
            var p = data[galleryId];

            if (p.current + p.params.slidesOnScreen - 1 < p.last) {
                methods.go(galleryId, p.current + 1);
            } else {
                methods.go(galleryId, p.params.loop ? 0 : p.current);
            }
        },

        prev: function(galleryId) {
            var p = data[galleryId],
                onScreen = p.params.slidesOnScreen;

            if (p.current > 0) {
                methods.go(galleryId, p.current - 1);
            } else {
                methods.go(galleryId, p.params.loop ? p.last - onScreen + 1 : 0);
            }
        },

        loadSlides: function(galleryId, target) {
            var p = data[galleryId],
                onScreen = p.params.slidesOnScreen,
                from = target - onScreen < 0 ? 0 : target - onScreen,
                to = target + (onScreen * 2) - 1 > p.last ? p.last : target + (onScreen * 2) - 1;

            for (var i = from; i <= to; i++) {
                if (p.slides[i] && !p.slides[i].loaded) {
                    methods.loadSlide(galleryId, i);
                }
            }
        },

        loadSlide: function(galleryId, target) {
            var p = data[galleryId],
                slide = p.root.find('.' + p.params.slide + '.' + p.params.modifierPrefix + target),
                slideImg = slide.find('.' + p.params.slideImg),
                alt = p.slides[target].caption;

            loadImage(p.slides[target].url, function(success, url) {
                if (success) {
                    p.slides[target].loaded = true;
                    p.slides[target].width = this.width;
                    p.slides[target].height = this.height;

                    methods.position(galleryId, target);

                    slide.removeClass(p.params._loading);

                    if (p.params.ie && p.params.ie < 9) {
                        slideImg.attr('src', url);
                    } else {
                        slideImg.css('background-image', 'url(' + url + ')');
                    }
                } else {
                    slide.removeClass(p.params._loading);
                    slide.addClass(p.params._error);

                    $.error('Image wasn\'t loaded: ' + url);
                }
            });

            if (alt) {
                slideImg
                    .addClass(p.params._alt)
                    .attr('data-alt', alt);
            }
        },

        loadThumbs: function(galleryId) {
            var p = data[galleryId],
                count = p.count,
                images = p.slides,
                loaded = 0;

            p.galleryThumbs = [];
            p.galleryThumbsLoaded = false;

            for (var i = 0; i < count; i++) {
                loadImage(images[i].thumb, function(success, url) {
                    if (success) {
                        loaded++;

                        if (loaded == count) {
                            p.galleryThumbsLoaded = true;
                            methods.getThumbsSize(galleryId);
                        }
                    } else {
                        $.error('Image wasn\'t loaded: ' + url);
                    }
                });
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

            p.thumbsLayerWidth = p.thumbsLayer.outerWidth();

            methods.setCurrentThumb(galleryId, p.current, 1);
        },

        setCurrentThumb: function(galleryId, target, noEffects) {
            var p = data[galleryId];

            if (p.params.showThumbs == 'thumbs') {
                var frame = p.thumbFrame,
                    styles = {},
                    current = p.galleryThumbs && p.galleryThumbs[target],
                    thumbsW = p.thumbs.outerWidth(),
                    layerW = p.thumbsLayer.outerWidth(),
                    duration = noEffects ? '0s' : (p.params.duration * 0.8 / 1000) + 's',
                    indent,
                    validatedIndent;

                p.thumbsDragging = thumbsW < layerW;

                if (p.galleryThumbsLoaded) {
                    styles.width = current.width + 'px';
                    styles.height = current.height + 'px';

                    if (p.params.transform) {
                        var property = prefixes[p.params.transform.property];

                        if (p.params.transform.has3d) {
                            styles[property] = 'translate3d(' + current.left + 'px, ' + current.top + 'px, 0)';
                        } else {
                            styles[property] = 'translateX(' + current.left + 'px) translateY(' + current.top + 'px)';
                        }
                    } else {
                        styles.top = current.top + 'px';
                        styles.left = current.left + 'px';
                    }

                    indent = (thumbsW - current.width) * 0.5 - current.left;
                    validatedIndent = validateIndent(indent);
                    p.thumbsIndent = validatedIndent;

                    frame
                        .css('transition-duration', duration)
                        .css(styles);

                    p.thumbsLayer
                        .css('transition-duration', duration)
                        .css(methods.setIndent(galleryId, validatedIndent, 'px'));
                }
            }

            p.thumb.removeClass(p.params._current);
            p.thumb
                .filter('.' + p.params.modifierPrefix + target)
                .addClass(p.params._current);

            /*
             * Validates recommended indent (inscribes layer into the container correctly)
             *
             * @param {number} indent of layer in the container
             * @returns {number} Correct indent
             */
            function validateIndent(indent) {
                if (indent > 0 || !p.thumbsDragging) {
                    return 0;
                }

                var limit = thumbsW - layerW;

                return indent < limit ? limit : indent;
            }

        },

        position: function(galleryId, target) {
            var p = data[galleryId],
                slide = p.root.find('.' + p.params.slide + '.' + p.params.modifierPrefix + target),
                img = p.slides[target],
                viewportRatio = p.viewportWidth / p.viewportHeight,
                imgRatio = img.width / img.height;

            // Algorithm
            if (p.viewportWidth > img.width && p.viewportHeight > img.height) {
                p.slides[target].algorithm = 'center';
                slide
                    .removeClass(p.params._auto)
                    .addClass(p.params._center);
            } else {
                p.slides[target].algorithm = 'auto';
                slide
                    .removeClass(p.params._center)
                    .addClass(p.params._auto);
            }

            // Orientation
            if (imgRatio >= viewportRatio) {
                p.slides[target].orientation = 'landscape';
                slide
                    .removeClass(p.params._portrait)
                    .addClass(p.params._landscape);
            } else {
                p.slides[target].orientation = 'portrait';
                slide
                    .removeClass(p.params._landscape)
                    .addClass(p.params._portrait);
            }
        },

        checkButtons: function(galleryId) {
            var p = data[galleryId];

            if (p.current == 0) {
                p.prev.addClass(p.params._disabled);
            } else {
                p.prev.removeClass(p.params._disabled);
            }
            if (p.current + p.params.slidesOnScreen - 1 == p.last) {
                p.next.addClass(p.params._disabled);
            } else {
                p.next.removeClass(p.params._disabled);
            }
        },

        setIndent: function(galleryId, value, unit) {
            var p = data[galleryId],
                result = {};

            unit = unit || '%';

            if (p.params.transform) {
                var property = prefixes[p.params.transform.property];

                if (p.params.transform.has3d) {
                    result[property] = 'translate3d(' + value + unit + ', 0, 0)';
                } else {
                    result[property] = 'translateX(' + value + unit + ')';
                }
            } else {
                result.left = value + unit;
            }

            return result;
        },

        freeze: function(galleryId) {
            var p = data[galleryId];

            p.freeze = true;
            p.root.addClass(p.params._freeze);
        },

        unfreeze: function(galleryId) {
            var p = data[galleryId];

            p.freeze = false;
            p.root.removeClass(p.params._freeze);
        },

        getHTML: function(params, data) {
            var thumbsHTML = '',
                slidesHTML = '';

            for (var i = 0, len = data.length; i < len; i++) {

                // Thumbnails template

                if (params.showThumbs == 'thumbs' && data[i].url) {
                    thumbsHTML += '<span data-rel="' + i + '" class="' + params.thumb +
                        ' ' + params.modifierPrefix + i +
                        ' ' + data[i].classes + '">' +
                            '<img src="' + data[i].thumb +
                            '" class="' + params.thumbImg + '" data-rel="' + i + '">' +
                        '</span>';
                }

                // Slides template

                slidesHTML += '<div class="' + params.slide +
                    ' ' + params.modifierPrefix + i +
                    ' ' + (data[i].html ? params._html : params._loading) +
                    '" data-id="' + i + '">';

                if (data[i].html) {
                    slidesHTML += data[i].html;
                } else {
                    if (params.ie && params.ie < 9) {
                        slidesHTML += '<img src="" class="' + params.slideImg + ' ' + data[i].classes + '" />';
                    } else {
                        slidesHTML += '<div class="' + params.slideImg + ' ' + data[i].classes + '"></div>';
                    }
                }

                slidesHTML += '</div>';
            }

            if (params.showThumbs == 'thumbs') {
                thumbsHTML += '<div class="' + params.thumbFrame + '"></div>';
            }

            return { thumbs: thumbsHTML, slides: slidesHTML };
        }
    };

    $.fn.photor = function(method) {

        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method == 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Unknown method: ' +  method);
        }

    };

    $.fn.photor.data = data;

    /**
     * Detect IE version
     *
     * @returns {int} Major version
     */
    function ie() {
        var ua = navigator.userAgent.toLowerCase();

        return ua.indexOf('msie') > -1 ? parseInt(ua.split('msie')[1]) : false;
    }

    /**
     * Returns supported property for css-transform
     *
     * @returns {string} String key
     */
    function getSupportedTransform() {
        var out = false,
            el = document.createElement('p');

        for (var key in prefixes) {
            if (prefixes.hasOwnProperty(key) && el.style[key] !== undefined) {
                out = { property: key };

                break;
            }
        }

        document.body.appendChild(el);

        if (out.property) {
            el.style[out.property] = "translate3d(1px,1px,1px)";
            out.has3d = window.getComputedStyle(el).getPropertyValue(prefixes[out.property]) != 'none';
        }

        document.body.removeChild(el);

        return out;
    }

    /**
     * Get prefixed css-property
     *
     * @returns {string} String key
     */
    function getPrefixed(property) {
        var style = document.createElement('p').style,
            prefixes = ['ms', 'O', 'Moz', 'Webkit'];

        if (style[property] == '') {
            return property;
        }

        property = property.charAt(0).toUpperCase() + property.slice(1);

        for (var i = 0, len = prefixes.length; i < len; i++) {
            if (style[prefixes[i] + property] == '') {
                return prefixes[i] + property;
            }
        }
    }

    /**
     * Кроссбраузерно добавляет обработчики событий
     *
     * @param {HTMLElement} element HTMLElement
     * @param {Event} e Событие
     * @param {Function} handler Обработчик события
     * @param {bool} capture Capturing
     */
    function eventManager(element, e, handler, capture, off) {
        capture = !!capture;

        if (!element) {
            return;
        }

        if (off) {

            if (element.removeEventListener) {
                element.removeEventListener(e, handler, capture);
            } else {
                $(element).off(e);
            }

        } else {

            if (element.addEventListener) {
                element.addEventListener(e, handler, capture);
            } else {
                $(element).on(e, handler);
            }

        }
    }

    /**
     * Проверяет наличие класса у HTML-элемента
     *
     * @param {HTMLElement} element HTMLElement
     * @param {string} className Имя класса
     * @returns {bool}
     */
    function hasClass(element, className) {
        var classNames = ' ' + element.className + ' ';

        className = ' ' + className + ' ';

        if (classNames.replace(/[\r\n\t\f]+/g, ' ').indexOf(className) > -1) {
            return true;
        }

        return false;
    }

    /**
     * Возвращает массив поддерживаемых событий
     * Если браузер поддерживает pointer events или подключена handjs, вернет события указателя.
     * Если нет, используем события мыши
     *
     * @returns {Array} Массив с названиями событий
     */
    function getSupportedEvents() {
        var touchEnabled = 'ontouchstart' in window;

        if (touchEnabled) {
            return ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
        }

        return ['mousedown', 'mousemove', 'mouseup', 'mouseleave'];
    }

    /**
     * Устанавливает обработчики управления указателем (touch, mouse, pen)
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindControl(galleryId) {
        var p = data[galleryId],
            thumbs = p.thumbs,
            touch = {},
            inlineLinks = p.viewport[0].getElementsByTagName('a'),
            inlineImages = p.viewport[0].getElementsByTagName('img');

        /**
         * Обработчик touchstart
         *
         * @param {Event} e Событие pointerdown
         */
        handlers.onStart = function(e) {
            if (p.freeze) {
                return;
            }

            // Запоминаем координаты и время
            touch.x1 = e.clientX || e.touches && e.touches[0].clientX;
            touch.y1 = e.clientY || e.touches && e.touches[0].clientY;
            touch.t1 = new Date();
            touch.isPressed = true;

            // Запоминаем элемент, на котором вызвано событие
            touch.isThumbs = hasClass(this, p.params.thumbs);
            touch.thumbsStartX = p.thumbsIndent;

            p.layer.css('transition-duration', '0s');
            p.thumbsLayer.css('transition-duration', '0s');
        };

        /**
         * Обработчик touch move
         *
         * @param {Event} e Событие pointermove
         */
        handlers.onMove = function(e) {
            if (touch.isPressed && !p.freeze) {
                // смещения
                touch.shiftX = (e.clientX || e.touches && e.touches[0].clientX) - touch.x1;
                touch.shiftY = (e.clientY || e.touches && e.touches[0].clientY) - touch.y1;

                // абсолютные значения смещений
                touch.shiftXAbs = Math.abs(touch.shiftX);
                touch.shiftYAbs = Math.abs(touch.shiftY);

                // Detect multitouch
                touch.isMultitouch = touch.isMultitouch || !!e.touches && e.touches.length > 1;

                if (touch.isMultitouch) {
                    end();

                    return;
                }

                // если мы ещё не определились
                if (!touch.isSlide && !touch.isScroll) {
                    // если вертикальное смещение - скроллим пока не отпустили палец
                    if (touch.shiftYAbs >= 5 && touch.shiftYAbs > touch.shiftXAbs) {
                        touch.isScroll = true;
                    }

                    // если горизонтальное - слайдим
                    if (touch.shiftXAbs >= 5 && touch.shiftXAbs > touch.shiftYAbs) {
                        p.root.addClass(p.params._dragging);
                        touch.isSlide = true;
                        touch.startShift = getIndent(galleryId);
                    }
                }

                // если слайдим
                if (touch.isSlide) {

                    if (touch.isThumbs) {
                        if (p.thumbsDragging) {
                            thumbsMove();
                        }
                    } else {
                        // слайды таскаем, только если поддерживаются transition
                        if (p.params.transition) {
                            slidesMove();
                        }
                    }

                    // запрещаем скролл
                    if (e.preventDefault) {
                        e.preventDefault();
                    }
                }
            }
        };

        /**
         * Обработчик touch end
         *
         * @param {Event} e Событие pointerup
         */
        handlers.onEnd = function(e) {
            // Ловим клик
            if (!touch.isSlide && !touch.isScroll && touch.isPressed) {

                // Назад
                if (hasClass(e.target, p.params.prev)) {
                    methods.prev(galleryId);
                }

                // Вперед
                if (hasClass(e.target, p.params.next)) {
                    methods.next(galleryId);
                }

                // Клик по миниатюре
                if (hasClass(e.target, p.params.thumbImg) || hasClass(e.target, p.params.thumb)) {
                    var target = parseInt(e.target.getAttribute('data-rel'));

                    if (target + p.params.slidesOnScreen - 1 > p.last) {
                        target = p.last - p.params.slidesOnScreen + 1;
                    }
                    methods.go(galleryId, target);
                }

                if (e.stopPropagation && e.preventDefault) {
                    e.stopPropagation();
                    e.preventDefault(); // Нужно для отмены зума по doubletap
                }
            }

            end();
        };

        /**
         * Возвращает текущее значение отступа layer
         *
         * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
         */
        function getIndent(galleryId) {
            var p = data[galleryId],
                value;

            if (p.params.transform) {
                var matrix = p.layer.css(prefixes[p.params.transform.property]).match(/(-?[0-9\.]+)/g);

                value = matrix.length > 6 ? matrix[13] : matrix[4];
            } else {
                value = p.layer.css('left');
            }

            return parseInt(value);
        }

        /**
         * Завершение перемещения
         */
        function end() {
            if (touch.isSlide) {
                if (touch.isThumbs) {
                    thumbsEnd();
                } else {
                    if (p.params.transition) {
                        slidesEnd();
                    }
                }
            }

            touch = {};
            p.root.removeClass(p.params._dragging);
        }

        /**
         * Движение слайдов во время перетаскивания
         */
        function slidesMove() {
            var resultIndent,
                onScreen = p.params.slidesOnScreen;

            if ((p.current == 0 && touch.shiftX > 0) || (p.current + onScreen - 1 == p.last && touch.shiftX < 0)) {
                touch.shiftX = touch.shiftX / 3;
            }

            resultIndent = touch.shiftX + touch.startShift;

            p.layer.css(methods.setIndent(galleryId, Math.round(resultIndent), 'px'));
        }

        /**
         * Завершение движения слайдов
         */
        function slidesEnd() {
            // Transition executes if delta more then 5% of container width
            if (Math.abs(touch.shiftX) > p.viewportWidth * 0.05) {
                var shiftSlides = touch.shiftX / p.viewportWidth * p.params.slidesOnScreen,
                    target;

                if (touch.shiftX < 0) {
                    target = p.current - Math.floor(shiftSlides);
                } else {
                    target = p.current - Math.ceil(shiftSlides);
                }

                // Проверяем, существует ли целевой слайд
                if (target < 0) {
                    target = 0;
                }
                if (target + p.params.slidesOnScreen - 1 > p.last) {
                    target = p.last - p.params.slidesOnScreen + 1;
                }

                methods.go(galleryId, target);

            } else {
                methods.go(galleryId, p.current);
            }
        }

        /**
         * Движение миниатюр при перетаскивании
         */
        function thumbsMove() {
            var indent = touch.shiftX + touch.thumbsStartX,
                limit = -1 * (p.thumbsLayerWidth - p.thumbsWidth);

            // Если выходим за край
            if (indent > 0) {
                indent = indent / 3;
            }
            if (indent < limit) {
                indent = limit + ((indent - limit) / 3);
            }

            p.thumbsIndent = indent;
            p.thumbsLayer.css(methods.setIndent(galleryId, p.thumbsIndent, 'px'));
        }

        /**
         * Завершение движения миниатюр
         */
        function thumbsEnd() {
            if (p.thumbsDragging && touch.isSlide) {
                var direction = touch.shiftX < 0 ? -1 : 1;

                touch.t2 = new Date();
                p.thumbsIndent = calcTailAnimation(p.thumbsIndent, direction);

                p.thumbsLayer
                    .css('transition-duration', '.24s')
                    .css(methods.setIndent(galleryId, p.thumbsIndent, 'px'));
            }
        }

        /**
         * Вычисление конечной координаты слоя с миниатюрами с учетом движения по инерции
         *
         * @param {number} currentIndent Текущее положение слоя с миниатюрами в пикселях
         * @param {number} direction Направление движения (-1|1)
         * @returns {number} Значение координаты слоя с миниатюрами в пикселях
         */
        function calcTailAnimation(currentIndent, direction) {
            var speed = Math.abs(10 * touch.shiftX / (touch.t2 - touch.t1)),
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

        // Touch-события
        p.events.push({
            element: p.viewport[0],
            event: evt[0],
            handler: handlers.onStart
        }, {
            element: p.viewport[0],
            event: evt[1],
            handler: handlers.onMove,
            capture: true
        }, {
            element: p.viewport[0],
            event: evt[2],
            handler: handlers.onEnd
        }, {
            element: p.viewport[0],
            event: evt[3],
            handler: handlers.onEnd
        }, {
            element: thumbs[0],
            event: evt[0],
            handler: handlers.onStart
        }, {
            element: thumbs[0],
            event: evt[1],
            handler: handlers.onMove,
            capture: true
        }, {
            element: thumbs[0],
            event: evt[2],
            handler: handlers.onEnd
        }, {
            element: thumbs[0],
            event: evt[3],
            handler: handlers.onEnd
        });

        // Отмена перехода по ссылке миниатюры
        preventNativeEvents(p.thumb, 'click');

        // Отмена встроенного перетаскивания для картинок
        preventNativeEvents(p.thumbImg, 'dragstart');

        // Отмена встроенного перетаскивания для вложенных ссылок
        preventNativeEvents(inlineLinks, 'dragstart');

        // Отмена встроенного перетаскивания для вложенных изображений
        preventNativeEvents(inlineImages, 'dragstart');


        /**
         * Prevent native event
         *
         * @param {array|jQuery object} elements DOM-elements
         * @param {string} evt Event
         */
        function preventNativeEvents(elements, evt) {
            for (var i = 0, len = elements.length; i < len; i++) {
                p.events.push({
                    element: elements[i],
                    event: evt,
                    handler: function(e) {
                        if (e.preventDefault) {
                            e.preventDefault();
                        }

                        return false;
                    }
                });
            }
        }

    }

    /**
     * Устанавливает обработчик изменения размера окна
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindResize(galleryId) {
        if (!handlers.resize) {
            var p = data[galleryId];

            p.events.push({
                element: window,
                event: 'resize',
                handler: methods.update
            });
        }
    }

    /**
     * Устанавливает обработчики управления с клавиатуры
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindKeyboard(galleryId) {
        var p = data[galleryId];

        handlers.keydown = function(e) {
            var key = e.which || e.keyCode,
                node = e.target.nodeName.toLowerCase(),
                contenteditable = !!e.target.attributes.contenteditable;

            if (node != 'input' && node != 'textarea' && node != 'select' && !contenteditable) {
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
            }
        };

        p.events.push({
            element: window,
            event: 'keydown',
            handler: handlers.keydown
        });
    }

    /**
     * Устанавливает обработчики на окончание анимации
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindTransitionEnd(galleryId) {
        var p = data[galleryId],
            transitionEnd = ['webkitTransitionEnd', 'MSTransitionEnd', 'oTransitionEnd', 'transitionend'];

        handlers.transitionEnd = function(e) {
            var prop = e.propertyName;

            if (prop.lastIndexOf('transform') != prop.length - 'transform'.length && prop != 'left') {
                return;
            }

            callback(galleryId);
        };

        for (var i = 0, len = transitionEnd.length; i < len; i++) {
            p.events.push({
                element: p.layer[0],
                event: transitionEnd[i],
                handler: handlers.transitionEnd
            });
        }
    }

    function callback(galleryId) {
        var p = data[galleryId];

        p.root.removeClass(p.params._animated);

        p.layer[0].style.transitionDuration = 0;

        toggleSlides(galleryId, p.current);

        if (p.params.onShow) {
            p.params.onShow.call(p);
        }
    }

    function toggleSlides(galleryId, target) {
        var p = data[galleryId];

        for (var i = 0, len = p.count; i < len; i++) {
            var elem = p.root.find('.' + p.params.slide + '.' + p.params.modifierPrefix + i),
                onScreen = p.params.slidesOnScreen;

            if (i >= p.current - onScreen && i <= p.current + (onScreen * 2) - 1 || i >= target - onScreen && i <= target + (onScreen * 2) - 1) {
                elem.removeClass(p.params._hidden);
            } else {
                elem.addClass(p.params._hidden);
            }
        }
    }

    /**
     * @param {string} url
     * @param {Function} callback
     */
    function loadImage(url, callback) {
        var img = new Image();

        img.onload = function() {
            img.onload = null;
            callback.call(this, true, url);
        };

        img.onerror = function() {
            img.onerror = null;
            callback.call(this, false, url);
        };

        img.src = url;
    }

})(jQuery);
