;(function(undefined) {

    // Server side
    if (typeof window == 'undefined') {
        return;
    }

    var dummyElement = document.createElement('div'),
        dummyStyle = dummyElement.style;

    var prefixed = {};

    (function() {
        var unprefixed = [
            'transform',
            'transition',
            'transitionDuration',
            'perspective'
        ];

        var vendors = ['webkit', 'Moz', 'ms', 'O'],
            vendorCount = vendors.length;

        for (var i = 0, l = unprefixed.length; i < l; i++) {
            var name = unprefixed[i];

            if (name in dummyStyle) {
                prefixed[name] = name;
                continue;
            }

            prefixed[name] = false;

            var upperFirst = name.charAt(0).toUpperCase() + name.slice(1);

            for (var j = 0; j < vendorCount; j++) {
                var prefixedName = vendors[i] + upperFirst;

                if (prefixedName in dummyStyle) {
                    prefixed[name] = prefixedName;
                    break;
                }
            }
        }
    })();

    var prefixedTransform = prefixed.transform,
        prefixedTransitionDuration = prefixed.transitionDuration;

    var hasCSS3DTransforms = !!prefixed.perspective;

    var prefixedValTransform = prefixedTransform && {
        'transform': 'transform',
        'webkitTransform': '-webkit-transform',
        'MozTransform': '-moz-transform',
        'msTransform': '-ms-transform',
        'OTransform': '-o-transform'
    }[prefixedTransform];

    var ie = (function(ua) {
        return ua.indexOf('msie') != -1 ? parseInt(ua.split('msie')[1]) : false;
    })(navigator.userAgent.toLowerCase());

    var defaultPhotorPrefix = 'photor__';

    function Photor(el, options) {
        var instance = this instanceof Photor ? this : createObject(Photor.prototype);

        instance._init(el, options);
        return instance;
    }

    Photor.prototype = {
        constructor: Photor,

        _events: null,

        _params: null,

        slides: null,
        current: undefined,

        frozen: false,

        _thumbsType: undefined,
        _thumbsDraggable: undefined,

        _touch: null,
        _drag: null,

        _mouseOverBControl: false,
        _mouseOverBThumbs: false,

        _autoplayTimerId: undefined,

        // Elements
        element: null,
        bControl: null,
        btnPrev: null,
        btnNext: null,
        bThumbs: null,
        bViewport: null,
        bViewportLayer: null,
        bThumbsLayer: null,
        bThumbFrame: null,
        blSlides: null,
        blThumbs: null,

        // Offsets
        _bViewportLayerOffsetX: 0,
        _bThumbsLayerOffsetX: 0,

        // Dimensions
        _bViewportWidth: undefined,
        _bViewportLayerWidth: undefined,
        _bViewportHeight: undefined,
        _bThumbsWidth: undefined,
        _bThumbsHeight: undefined,
        _bThumbsLayerWidth: undefined,

        _init: function(el, options) {
            if (el._photor) {
                throw new TypeError('Photor is already initialized for this element');
            }

            el._photor = this;

            this._events = {};

            var photorPrefix = options && options.photorPrefix ? options.photorPrefix : defaultPhotorPrefix;
            var params = this._params = extendObject({

                // Elements
                viewport:     photorPrefix + 'viewport',
                layer:        photorPrefix + 'viewportLayer',
                slide:        photorPrefix + 'viewportLayerSlide',
                slideImg:     photorPrefix + 'viewportLayerSlideImg',
                slideCaption: photorPrefix + 'viewportLayerSlideCaption',
                control:      photorPrefix + 'viewportControl',
                next:         photorPrefix + 'viewportControlNext',
                prev:         photorPrefix + 'viewportControlPrev',
                thumbs:       photorPrefix + 'thumbs',
                thumbsLayer:  photorPrefix + 'thumbsLayer',
                thumb:        photorPrefix + 'thumbsLayerItem',
                thumbImg:     photorPrefix + 'thumbsLayerItemImg',
                thumbFrame:   photorPrefix + 'thumbsLayerFrame',

                // State modifiers
                _single: '_single',         // Модификатор для галереи с одной фотографией
                _dragging: '_dragging',     // Перетаскивание
                _animated: '_animated',     // На время анимации
                _freeze: '_freeze',         // Галерея "заморожена"
                _disabled: '_disabled',     // Элемент управления запрещен

                // Slide state modifiers
                _current: '_current',       // Текущий слайд или миниатюра
                _loading: '_loading',       // Фотография загружается
                _error: '_error',           // Не удалось загрузить фотографию
                _html: '_html',             // Слайд с html-содержимым
                _caption: '_caption',       // Есть подпись к фотографии
                _hidden: '_hidden',         // Спрятанный слайд

                // Algorithms
                algorithm: 'contain',       // Алгоритм размещения фотографии при маленьком размере экрана: 'contain' / 'cover'
                _auto: '_auto',             // Фотография больше вьюпорта
                _center: '_center',         // Фотография меньше вьюпорта

                // Orientation
                _portrait: '_portrait',     // Соотношение ширины к высоте фотографии меньше чем у вьюпорта
                _landscape: '_landscape',   // Соотношение ширины к высоте фотографии больше чем у вьюпорта

                // Thumbs
                _draggable: '_draggable',   // Разрешено перетаскивание на миниатюрах

                modifierPrefix: '_',        // Префикс модификатора
                itemPrefix: '_item',        // Префикс элемента списка
                ieClassPrefix: '_ie',       // Префикс модификатора для IE

                // Settings
                current: 0,                 // Текуший слайд
                autoplay: false,            // Задержка между сменой слайдов
                loop: false,                // Зациклить галерею
                duration: 300,              // Время анимации для слайдов
                showThumbs: 'thumbs',       // 'thumbs' / 'dots' / false
                keyboard: true,             // Управление с клавиатуры
                slidesOnScreen: 1           // Количество видимых слайдов во вьюпорте

            }, options);

            if (params.slidesOnScreen > 1) {
                params.showThumbs = false;
            }

            this.element = el;
            this.bControl = el.querySelector('.' + params.control);
            this.btnPrev = el.querySelector('.' + params.prev);
            this.btnNext = el.querySelector('.' + params.next);
            this.bThumbs = el.querySelector('.' + params.thumbs);
            this.bViewport = el.querySelector('.' + params.viewport);
            this.bViewportLayer = el.querySelector('.' + params.layer);
            this.bThumbsLayer = el.querySelector('.' + params.thumbsLayer);
            this.bThumbFrame = document.createElement('div');

            if (ie) {
                addClass(el, params.ieClassPrefix + ie);
            }

            addClass(this.bThumbFrame, params.thumbFrame);

            this._updateDims();

            var data = params.data;

            this.setSlides(data && data.length ? data : this.bViewportLayer);

            this._bindListeners();
            this._bindEvents();

            if (params.autoplay) {
                this._autoplayTimerId = setTimeout(this._onAutoplayTimerTick, params.autoplay);
            }
        },

        _updateDims: function() {
            var bViewport = this.bViewport,
                bViewportLayer = this.bViewportLayer,
                bThumbs = this.bThumbs;

            this._bViewportWidth = window.getComputedStyle ?
                parseFloat(window.getComputedStyle(bViewport).width, 10) :
                bViewport.offsetWidth;

            this._bViewportLayerWidth = window.getComputedStyle ?
                parseFloat(window.getComputedStyle(bViewportLayer).width, 10) :
                bViewport.offsetWidth;

            this._bViewportHeight = bViewport.offsetHeight;

            this._bThumbsWidth = bThumbs && bThumbs.offsetWidth;
            this._bThumbsHeight = bThumbs && bThumbs.offsetHeight;
        },

        /**
         * @param {Array<Object>|HTMLElement|DocumentFragment} newSlides
         */
        setSlides: function(newSlides) {
            var params = this._params,
                el = this.element;

            this._thumbsType = params.showThumbs;
            this._thumbsDraggable = true;

            setOffsetX(this.bThumbsLayer, 0);
            setOffsetX(this.bViewportLayer, 0);

            this._setSlides(newSlides);

            var slideCount = this.slides.length,
                current = this.current = calcIndex(params.current, params.slidesOnScreen, slideCount, params.loop);

            if (slideCount == 1) {
                addClass(el, params._single);
            } else {
                removeClass(el, params._single);
            }

            removeClass(el, params.modifierPrefix + 'thumbs');
            removeClass(el, params.modifierPrefix + 'dots');

            if (this._thumbsType) {
                addClass(el, params.modifierPrefix + this._thumbsType);
            }

            this._updateDOM();

            addClass(this.blSlides[current], params._current);
            addClass(this.blThumbs[current], params._current);

            this._prepareActualSlides(function() {

                if (this._thumbsType == 'thumbs') {
                    this._loadThumbs(function() {
                        this._updateThumbsDims();
                        this._moveToCurrentItems(true);
                    });
                } else {
                    this._updateThumbsDims();
                    this._moveToCurrentItems(true);
                }

            });
        },

        /**
         * @param {Array<Object|HTMLElement>|HTMLElement|DocumentFragment} newSlides
         */
        _setSlides: function(newSlides) {
            var slides = this.slides = [];

            var slideProto = {
                url: undefined,
                thumb: undefined,

                html: undefined,
                element: null,

                caption: '',

                width: undefined,
                height: undefined,

                thumbDims: null,

                loaded: undefined,

                classes: ''
            };

            var hasHTML = false;

            var i = 0,
                l;

            if (isArray(newSlides)) {
                for (l = newSlides.length; i < l; i++) {
                    var slide = newSlides[i];

                    if (slide.nodeType == 1) {
                        slide = { element: slide };
                    }

                    if (slide.html || slide.element) {
                        hasHTML = true;
                    }

                    slide = createObject(slideProto, { loaded: slide.html || slide.element }, slide);

                    if (slide.html && !slide.element) {
                        slide.element = createElementFromHTML(slide.html);
                    }

                    slides.push(slide);
                }
            } else {
                var childNodes = newSlides.childNodes;

                for (l = childNodes.length; i < l; i++) {
                    var el = childNodes[i];

                    if (el.nodeType == 1) {
                        if (el.nodeName == 'IMG') {
                            slides.push(createObject(slideProto, {
                                url: el.src,
                                thumb: el.getAttribute('data-thumb') || el.src,
                                caption: el.alt,
                                loaded: false,
                                classes: el.className
                            }));
                        } else {
                            hasHTML = true;

                            slides.push(createObject(slideProto, {
                                element: el,
                                loaded: true
                            }));
                        }
                    }
                }
            }

            if (!slides.length) {
                throw new RangeError('Requires more slides');
            }

            if (hasHTML && this._thumbsType == 'thumbs') {
                this._thumbsType = 'dots';
            }
        },

        _updateDOM: function() {
            var params = this._params;

            var slides = this.slides;

            var bViewportLayer = this.bViewportLayer,
                bThumbsLayer = this.bThumbsLayer;

            var blSlides = this.blSlides = [],
                blThumbs = this.blThumbs = [];

            clearNode(bViewportLayer);
            clearNode(bThumbsLayer);

            var dfSlides = document.createDocumentFragment(),
                dfThumbs = document.createDocumentFragment();

            for (var i = 0, l = slides.length; i < l; i++) {
                // Slides

                var slide = slides[i],
                    slideEl = slide.element;

                var slideHTML = format(
                    '<div data-index="%1" class="%2 %3 %4 %5">%6%7</div>',
                    i,
                    params.slide,
                    params.itemPrefix + i,
                    slideEl ? params._html : params._loading,
                    slide.caption ? params._caption : '',
                    slideEl ? '' : format('<img src="" class="%1 %2" alt="%3">', params.slideImg, slide.classes, slide.caption),
                    slide.caption ? format('<div class="%1">%2</div>', params.slideCaption, slide.caption) : ''
                );

                var bSlide = createElementFromHTML(slideHTML);

                if (slideEl) {
                    bSlide.insertBefore(slideEl, bSlide.firstChild);
                }

                bSlide.style.left = (i * 100) + '%';

                blSlides.push(bSlide);
                dfSlides.appendChild(bSlide);

                // Thumbs

                var thumbHTML = format(
                    '<span data-rel="%1" class="%2 %3 %4">%5</span>',
                    i,
                    params.thumb,
                    params.itemPrefix + i,
                    slide.classes,
                    this._thumbsType == 'thumbs' && (slide.thumb || slide.url) ?
                        format(
                            '<img src="%1" data-rel="%2" class="%3">',
                            (slide.thumb || slide.url),
                            i,
                            params.thumbImg
                        ) :
                        ''
                );

                var bThumb = createElementFromHTML(thumbHTML);

                blThumbs.push(bThumb);
                dfThumbs.appendChild(bThumb);
            }

            bViewportLayer.appendChild(dfSlides);

            if (bThumbsLayer && this._thumbsType) {
                bThumbsLayer.appendChild(dfThumbs);

                if (bThumbsLayer && (this._thumbsType == 'thumbs')) {
                    bThumbsLayer.appendChild(this.bThumbFrame);
                }
            }
        },

        /**
         * @param {Function} [callback]
         */
        _prepareActualSlides: function(callback) {
            var modHidden = this._params._hidden;

            var blSlides = this.blSlides;

            var startIndex = Math.max(0, this.current - 1),
                endIndex = Math.min(blSlides.length - 1, this.current + 1);

            for (var i = startIndex; i <= endIndex; i++) {
                removeClass(blSlides[i], modHidden);
            }

            this._loadActualSlides(callback);
        },

        /**
         * @param {Function} [callback]
         */
        _loadActualSlides: function(callback) {
            var modLoading = this._params._loading;

            var slides = this.slides,
                blSlides = this.blSlides;

            var startIndex = Math.max(0, this.current - 1),
                endIndex = Math.min(slides.length - 1, this.current + 1);

            var loadingCount = 0;

            for (var i = startIndex; i <= endIndex; i++) {
                var slide = slides[i];

                if (!slide.loaded) {
                    imageLoader.call(this, i, slide, slide.url);
                }
            }

            if (!loadingCount && callback) {
                callback.call(this);
            }

            function imageLoader(index, slide, url) {
                loadingCount++;

                loadImage(url, function(success, img) {
                    loadingCount--;

                    if (success) {
                        var bSlide = blSlides[index],
                            bSlideImg = bSlide.firstChild;

                        slide.width = img.width;
                        slide.height = img.height;
                        slide.loaded = true;

                        removeClass(bSlide, modLoading);

                        this._paintSlide(index);

                        bSlideImg.src = url;
                    } else {
                        logError('Image wasn\'t loaded: ' + url);
                    }

                    if (!loadingCount && callback && this.element._photor) {
                        callback.call(this);
                    }
                }, this);
            }
        },

        /**
         * @param {Function} [callback]
         */
        _loadThumbs: function(callback) {
            var slides = this.slides;

            var loadingCount = 0;

            for (var i = 0, l = slides.length; i < l; i++) {
                var slide = slides[i],
                    url = slide.thumb || slide.url;

                if (url) {
                   loadingCount++;

                   loadImage(url, function(success) {
                        loadingCount--;

                        if (!success) {
                            logError('Image wasn\'t loaded: ' + url);
                        }

                        if (!loadingCount && callback) {
                            callback.call(this);
                        }
                    }, this);
                }
            }

            if (!loadingCount && callback) {
                callback.call(this);
            }
        },

        /**
         * @param {int} index
         */
        _paintSlide: function(index) {
            var params = this._params;

            var slide = this.slides[index],
                slideWidth = slide.width,
                slideHeight = slide.height;

            var bSlide = this.blSlides[index];

            var bViewportWidth = this._bViewportWidth,
                bViewportHeight = this._bViewportHeight;

            // Algorithm

            if (bViewportWidth > slideWidth && bViewportHeight > slideHeight) {
                slide.algorithm = 'center';

                removeClass(bSlide, params._auto);
                addClass(bSlide, params._center);
            } else {
                slide.algorithm = 'auto';

                removeClass(bSlide, params._center);
                addClass(bSlide, params._auto);
            }

            // Orientation

            var slideRatio = slideWidth / slideHeight,
                bViewportRatio = bViewportWidth / bViewportHeight;

            if (slideRatio >= bViewportRatio) {
                slide.orientation = 'landscape';

                removeClass(bSlide, params._portrait);
                addClass(bSlide, params._landscape);
            } else {
                slide.orientation = 'portrait';

                removeClass(bSlide, params._landscape);
                addClass(bSlide, params._portrait);
            }

            // Sizes

            var bSlideImgStyle = bSlide.firstChild.style;

            if (slide.algorithm == 'auto' || params.algorithm == 'cover') {
                if (slide.orientation == (params.algorithm == 'cover' ? 'portrait' : 'landscape')) {
                    var bSlideImgHeight = Math.round(slideHeight * (bViewportWidth / slideWidth));

                    bSlideImgStyle.top = Math.round((bViewportHeight - bSlideImgHeight) / 2) + 'px';
                    bSlideImgStyle.left = '0';
                    bSlideImgStyle.width = bViewportWidth + 'px';
                    bSlideImgStyle.height = bSlideImgHeight + 'px';
                } else {
                    var bSlideImgWidth = Math.round(slideWidth * (bViewportHeight / slideHeight));

                    bSlideImgStyle.top = '0';
                    bSlideImgStyle.left = Math.round((bViewportWidth - bSlideImgWidth) / 2) + 'px';
                    bSlideImgStyle.width = bSlideImgWidth + 'px';
                    bSlideImgStyle.height = bViewportHeight + 'px';
                }
            } else {
                bSlideImgStyle.top = Math.round((bViewportHeight - slideHeight) / 2) + 'px';
                bSlideImgStyle.left = Math.round((bViewportWidth - slideWidth) / 2) + 'px';
            }
        },

        _updateThumbsDims: function() {
            var slides = this.slides;

            var blThumbs = this.blThumbs,
                i = blThumbs.length;

            while (i) {
                var bThumb = blThumbs[--i];

                slides[i].thumbDims = {
                    top: bThumb.offsetTop,
                    left: bThumb.offsetLeft,
                    width: bThumb.offsetWidth,
                    height: bThumb.offsetHeight
                };
            }

            this._bThumbsLayerWidth = this.bThumbsLayer && this.bThumbsLayer.offsetWidth;

            this._thumbsDraggable = this._bThumbsWidth < this._bThumbsLayerWidth;
        },

        /**
         * @param {boolean} [noEffects=false]
         */
        _moveToCurrentItems: function(noEffects) {
            this._moveToCurrentSlide(noEffects);
            this._moveToCurrentThumb(noEffects);
        },

        /**
         * @param {boolean} [noEffects=false]
         */
        _moveToCurrentSlide: function(noEffects) {
            var offsetX;

            if (this._params.slidesOnScreen > 1) {
                offsetX = -1 * this._bViewportLayerWidth * this.current;
            } else {
                offsetX = -1 * this._bViewportWidth * this.current;
            }

            if (this._bViewportLayerOffsetX == offsetX) {
                this._transitionCallback();
                return;
            }

            addClass(this.element, this._params._animated);

            this._bViewportLayerOffsetX = offsetX;

            if (prefixedTransitionDuration) {
                var duration = noEffects ? '0ms' : this._params.duration + 'ms';
                this.bViewportLayer.style[prefixedTransitionDuration] = duration;
            }

            // Проверяем вычисленное значение transition,
            // если transition отключен, или нет getComputedStyle вызываем колбек
            if (window.getComputedStyle) {
                var style = window.getComputedStyle(this.bViewportLayer, null),
                    computedDuration = parseFloat(style[prefixedTransitionDuration]);

                if (!computedDuration) {
                    this._transitionCallback();
                }
            } else this._transitionCallback();

            setOffsetX(this.bViewportLayer, offsetX);
        },

        /**
         * @param {boolean} [noEffects=false]
         */
        _moveToCurrentThumb: function(noEffects) {
            var currentThumbDims = this.slides[this.current].thumbDims;

            var bThumbsLayer = this.bThumbsLayer,
                bThumbFrame = this.bThumbFrame;

            this._computeThumbsOffsetX();

            if (prefixedTransitionDuration) {
                var duration = noEffects ? '0ms' : this._params.duration + 'ms';

                if (bThumbsLayer && bThumbsLayer.style) {
                    bThumbsLayer.style[prefixedTransitionDuration] = duration;
                }

                bThumbFrame.style[prefixedTransitionDuration] = duration;
            }

            setOffsetX(bThumbsLayer, this._bThumbsLayerOffsetX);

            setOffsets(bThumbFrame, currentThumbDims.left, currentThumbDims.top);

            bThumbFrame.style.width = currentThumbDims.width + 'px';
            bThumbFrame.style.height = currentThumbDims.height + 'px';
        },

        _computeThumbsOffsetX: function() {
            var currentThumbDims = this.slides[this.current].thumbDims;

            var offsetX;

            if (!this._thumbsDraggable) {
                offsetX = 0;
            } else {
                offsetX = (this._bThumbsWidth - currentThumbDims.width) / 2 - currentThumbDims.left;

                if (offsetX > 0) {
                    offsetX = 0;
                } else {
                    var limit = this._bThumbsWidth - this._bThumbsLayerWidth;

                    if (offsetX < limit) {
                        offsetX = limit;
                    }
                }
            }

            this._bThumbsLayerOffsetX = offsetX;
        },

        _bindListeners: function() {
            bindMethods(this, [
                '_onBViewportTouchStart',
                '_onBViewportMouseDown',
                '_onBThumbsTouchStart',
                '_onBThumbsMouseDown',

                '_onDocumentTouchMove',
                '_onDocumentTouchEnd',
                '_onDocumentTouchCancel',

                '_onDocumentMouseMove',
                '_onDocumentMouseUp',

                '_onBViewportLayerTransitionEnd',

                '_onWindowResize',

                '_onBViewportMouseEnter',
                '_onBViewportMouseLeave',
                '_onBThumbsMouseEnter',
                '_onBThumbsMouseLeave',

                '_onDocumentKeydown',

                '_onAutoplayTimerTick'
            ]);
        },

        _bindEvents: function() {
            var bViewport = this.bViewport,
                bThumbs = this.bThumbs;

            this._bindEvent(bViewport, 'touchstart', this._onBViewportTouchStart);
            this._bindEvent(bViewport, 'mousedown', this._onBViewportMouseDown);
            this._bindEvent(bViewport, 'dragstart', this._handleDragstart);
            this._bindEvent(bThumbs, 'touchstart', this._onBThumbsTouchStart);
            this._bindEvent(bThumbs, 'mousedown', this._onBThumbsMouseDown);
            this._bindEvent(bThumbs, 'dragstart', this._handleDragstart);

            this._bindTransitionEnd(this.bViewportLayer, this._onBViewportLayerTransitionEnd);

            this._bindEvent(window, 'resize', this._onWindowResize);

            this._bindEvent(bViewport, 'mouseenter', this._onBViewportMouseEnter);
            this._bindEvent(bViewport, 'mouseleave', this._onBViewportMouseLeave);
            this._bindEvent(bThumbs, 'mouseenter', this._onBThumbsMouseEnter);
            this._bindEvent(bThumbs, 'mouseleave', this._onBThumbsMouseLeave);

            if (this._params.keyboard) {
                this._bindEvent(document, 'keydown', this._onDocumentKeydown);
            }
        },

        /**
         * @param {TouchEvent} evt
         */
        _onBViewportTouchStart: function(evt) {
            this._handleTouchStart(evt, this.bViewport, true);
        },

        /**
         * @param {MouseEvent} evt
         */
        _onBViewportMouseDown: function(evt) {
            if (evt.which == 1) {
                this._handleTouchStart(evt, this.bViewport, false);
            }
        },

        /**
         * @param {TouchEvent} evt
         */
        _onBThumbsTouchStart: function(evt) {
            this._handleTouchStart(evt, this.bThumbs, true);
        },

        /**
         * @param {MouseEvent} evt
         */
        _onBThumbsMouseDown: function(evt) {
            if (evt.which == 1) {
                this._handleTouchStart(evt, this.bThumbs, false);
            }
        },

        /**
         * @param {TouchEvent|MouseEvent} evt
         * @param {HTMLElement} el
         * @param {boolean} isTouch
         */
        _handleTouchStart: function(evt, el, isTouch) {
            if (this.frozen || this.touch) {
                return;
            }

            var positionSource = isTouch ? evt.touches[0] : evt;

            this._touch = {
                start: {
                    clientX: positionSource.clientX,
                    clientY: positionSource.clientY,
                    timeStamp: evt.timeStamp,
                    element: el
                }
            };

            this._observeTouch(isTouch);
        },

        /**
         * @param {Event} evt
         */
        _handleDragstart: function(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }

            return false;
        },

        /**
         * @param {boolean} isTouch
         */
        _observeTouch: function(isTouch) {
            if (isTouch) {
                this._bindEvent(document, 'touchmove', this._onDocumentTouchMove);
                this._bindEvent(document, 'touchend', this._onDocumentTouchEnd);
                this._bindEvent(document, 'touchcancel', this._onDocumentTouchCancel);
            } else {
                this._bindEvent(document, 'mousemove', this._onDocumentMouseMove);
                this._bindEvent(document, 'mouseup', this._onDocumentMouseUp);
            }
        },

        /**
         * @param {boolean} isTouch
         */
        _stopTouchObserving: function(isTouch) {
            if (isTouch) {
                this._unbindEvent(document, 'touchmove', this._onDocumentTouchMove);
                this._unbindEvent(document, 'touchend', this._onDocumentTouchEnd);
                this._unbindEvent(document, 'touchcancel', this._onDocumentTouchCancel);
            } else {
                this._unbindEvent(document, 'mousemove', this._onDocumentMouseMove);
                this._unbindEvent(document, 'mouseup', this._onDocumentMouseUp);
            }
        },

        /**
         * @param {TouchEvent} evt
         */
        _onDocumentTouchMove: function(evt) {
            this._handleTouchMove(evt, true);
        },

        /**
         * @param {TouchEvent} evt
         */
        _onDocumentTouchEnd: function(evt) {
            this._handleTouchEnd(evt, true);
        },

        /**
         * @param {TouchEvent} evt
         */
        _onDocumentTouchCancel: function(evt) {
            this._completeTouch(evt, true, 'touchCancel');
        },

        /**
         * @param {MouseEvent} evt
         */
        _onDocumentMouseMove: function(evt) {
            this._handleTouchMove(evt, false);
        },

        /**
         * @param {MouseEvent} evt
         */
        _onDocumentMouseUp: function(evt) {
            this._handleTouchEnd(evt, false);
        },

        /**
         * @param {TransitionEvent} evt
         */
        _onBViewportLayerTransitionEnd: function(evt) {
            var prop = evt.propertyName;

            if (prop.slice(-1 * 'transform'.length) != 'transform' && prop != 'left') {
                return;
            }

            this._transitionCallback();
        },

        _onWindowResize: function() {
            this.update();
        },

        _onBViewportMouseEnter: function() {
            this._mouseOverBViewport = true;

            if (this._params.autoplay) {
                clearTimeout(this._autoplayTimerId);
            }
        },

        _onBViewportMouseLeave: function() {
            this._mouseOverBViewport = false;

            if (this._params.autoplay) {
                this._autoplayTimerId = setTimeout(this._onAutoplayTimerTick, this._params.autoplay);
            }
        },

        _onBThumbsMouseEnter: function() {
            this._mouseOverBThumbs = true;
        },

        _onBThumbsMouseLeave: function() {
            this._mouseOverBThumbs = false;
        },

        /**
         * @param {TouchEvent|MouseEvent} evt
         * @param {boolean} isTouch
         */
        _handleTouchMove: function(evt, isTouch) {
            var touch = this._touch;

            if (!touch) {
                return;
            }

            var touchStart = touch.start;

            var prevSource = touch.clientX === undefined ? touchStart : touch;

            touch.prev = {
                clientX: prevSource.clientX,
                clientY: prevSource.clientY,
                timeStamp: prevSource.timeStamp
            };

            var positionSource = isTouch ? evt.touches[0] : evt;

            touch.clientX = positionSource.clientX;
            touch.clientY = positionSource.clientY;

            touch.shiftX = touch.clientX - touchStart.clientX;
            touch.shiftY = touch.clientY - touchStart.clientY;

            touch.timeStamp = evt.timeStamp;

            if (isTouch && evt.touches.length > 1) {
                this._completeTouch(evt, true, 'multitouch');
                return;
            }

            var drag = this._drag;

            var bViewportLayer = this.bViewportLayer,
                bThumbsLayer = this.bThumbsLayer;

            var targetLayer;

            if (!drag) {
                if (isTouch && Math.abs(touch.shiftX) < Math.abs(touch.shiftY)) {
                    this._completeTouch(evt, true, 'scroll');
                    return;
                }

                targetLayer = touchStart.element == this.bViewport ? bViewportLayer : bThumbsLayer;

                drag = this._drag = {
                    start: {
                        targetLayerOffset: getOffsetX(targetLayer)
                    },

                    targetLayer: targetLayer
                };
            } else {
                targetLayer = drag.targetLayer;
            }

            evt.preventDefault();

            var dragging = false;

            if (targetLayer == bViewportLayer) {
                if (prefixedTransform) {
                    addClass(this.element, this._params._dragging);
                    dragging = true;
                }
            } else {
                if (this._thumbsDraggable) {
                    dragging = true;
                }
            }

            if (dragging) {
                var offsetX = drag.start.targetLayerOffset + touch.shiftX;

                if (targetLayer == bThumbsLayer || !this._params.loop) {
                    if (offsetX > 0) {
                        offsetX /= 3;
                    } else if (offsetX < 0) {
                        var limit;

                        if (targetLayer == bViewportLayer) {
                            limit = -1 * this._bViewportWidth * (this.slides.length - 1);
                        } else {
                            limit = this._bThumbsWidth - this._bThumbsLayerWidth;
                        }

                        if (offsetX < limit) {
                            offsetX = limit + ((offsetX - limit) / 3);
                        }
                    }
                }

                if (targetLayer == bViewportLayer) {
                    this._bViewportLayerOffsetX = offsetX;
                } else {
                    this._bThumbsLayerOffsetX = offsetX;
                }

                if (prefixedTransitionDuration) {
                    targetLayer.style[prefixedTransitionDuration] = '0s';
                }

                setOffsetX(targetLayer, offsetX);
            }
        },

        /**
         * @param {TouchEvent|MouseEvent} evt
         * @param {boolean} isTouch
         */
        _handleTouchEnd: function(evt, isTouch) {
            this._completeTouch(evt, isTouch, 'touchEnd');
        },

        /**
         * @param {TouchEvent|MouseEvent} evt
         * @param {boolean} isTouch
         * @param {string} cause
         */
        _completeTouch: function(evt, isTouch, cause) {
            this._stopTouchObserving(isTouch);

            var params = this._params;

            var touch = this._touch,
                touchStart = touch.start,
                touchEnd = touch.end = {};

            var bViewport = this.bViewport;

            var positionSource = isTouch ? evt.touches[0] || touch.prev || touchStart : evt;

            touchEnd.clientX = positionSource.clientX;
            touchEnd.clientY = positionSource.clientY;

            touchEnd.shiftX = touchEnd.clientX - touchStart.clientX;
            touchEnd.shiftY = touchEnd.clientY - touchStart.clientY;

            touchEnd.timeStamp = evt.timeStamp;

            if (this._drag) {
                if (touchStart.element == bViewport) {
                    if (prefixedTransform) {
                        removeClass(this.element, params._dragging);
                    }

                    if (cause == 'touchEnd') {
                        this._completeSlidesDrag();
                    } else {
                        this._moveToCurrentSlide();
                    }
                } else {
                    if (Math.abs(touchEnd.shiftX) > 5 || Math.abs(touchEnd.shiftY) > 5) {
                        this._completeThumbsDrag();
                    } else {
                        this._handleThumbsTap(evt);
                    }
                }
            } else {
                if (cause == 'touchEnd') {
                    if (touchStart.element == bViewport) {
                        if (isSelfOrDescendantOf(evt.target, this.btnPrev, bViewport)) {
                            evt.preventDefault();
                            this.prev(params.loop);
                        } else if (isSelfOrDescendantOf(evt.target, this.btnNext, bViewport)) {
                            evt.preventDefault();
                            this.next(params.loop);
                        }
                    } else {
                        this._handleThumbsTap(evt);
                    }
                }
            }

            this._touch = null;
            this._drag = null;
        },

        _completeSlidesDrag: function() {
            var touch = this._touch,
                touchStart = touch.start,
                touchEnd = touch.end,
                touchDuration = touchEnd.timeStamp - touchStart.timeStamp;

            var absShiftX = Math.abs(touchEnd.shiftX),
                absShiftY = Math.abs(touchEnd.shiftY);

            if (absShiftX >= absShiftY && (touchDuration < 250 || absShiftX >= (this._bViewportLayerWidth / 5))) {
                var count = Math.max(Math.round(absShiftX / this._bViewportLayerWidth), 1),
                    toIndex;

                if (!this._params.loop) {
                    if (touchEnd.shiftX > 0) {
                        toIndex = Math.max(0, this.current - count);
                    } else {
                        toIndex = Math.min(this.current + count, this.slides.length - 1);
                    }
                } else {
                    toIndex = this.current + (touchEnd.shiftX > 0 ? -count : count);
                }

                if (this.go(toIndex)) {
                    return;
                }
            }

            this._moveToCurrentSlide();
        },

        _completeThumbsDrag: function() {
            if (!this._thumbsDraggable) {
                return;
            }

            var touch = this._touch,
                touchPrev = touch.prev,
                touchEnd = touch.end;

            var lastShiftX = touchEnd.clientX - touchPrev.clientX,
                direction = lastShiftX < 0 ? -1 : 1,
                speed = Math.abs(lastShiftX / (touchEnd.timeStamp - touchPrev.timeStamp));

            var offsetX = direction * Math.pow(speed * 10, 3) + this._bThumbsLayerOffsetX;

            if (offsetX > 0) {
                offsetX = 0;
            } else {
                var limit = this._bThumbsWidth - this._bThumbsLayerWidth;

                if (offsetX < limit) {
                    offsetX = limit;
                }
            }

            this._bThumbsLayerOffsetX = offsetX;

            if (prefixedTransitionDuration) {
                this.bThumbsLayer.style[prefixedTransitionDuration] = this._params.duration + 'ms';
            }

            setOffsetX(this.bThumbsLayer, offsetX);
        },

        /**
         * @param {TouchEvent|MouseEvent} evt
         * @param {boolean} isTouch
         */
        _handleThumbsTap: function(evt) {
            var el = evt.target;

            while (el != this.bThumbs) {
                if (el.hasAttribute('data-rel')) {
                    evt.preventDefault();
                    this.go(Number(el.getAttribute('data-rel')));
                    break;
                }

                if (!(el = el.parentNode)) {
                    break;
                }
            }
        },

        /**
         * @param {KeyboardEvent} evt
         */
        _onDocumentKeydown: function(evt) {
            if (document.activeElement == document.body && !evt.target.attributes.contenteditable) {
                switch (evt.which || evt.keyCode) {
                    case 32: // Space
                    case 39: // Right arrow
                        this.next(this._params.loop);
                        break;

                    case 37: // Left arrow
                        this.prev(this._params.loop);
                        break;
                }
            }
        },

        _onAutoplayTimerTick: function() {
            this.go(this.current + 1 == this.slides.length ? 0 : this.current + 1);
        },

        update: function() {
            this._updateDims();
            this._updateThumbsDims();

            var slides = this.slides,
                i = slides.length;

            while (i) {
                if (!slides[--i].element && slides[i].loaded) {
                    this._paintSlide(i);
                }
            }

            this._moveToCurrentItems(true);
        },

        /**
         * @param {int} toIndex
         * @param {boolean} [loop=false]
         * @returns {boolean}
         */
        go: function(toIndex) {
            if (this.frozen) {
                return false;
            }

            var params = this._params;

            if (params.autoplay && !this._mouseOverBViewport) {
                clearTimeout(this._autoplayTimerId);
                this._autoplayTimerId = setTimeout(this._onAutoplayTimerTick, params.autoplay);
            }

            var slideCount = this.slides.length,
                current = this.current;

            toIndex = calcIndex(toIndex, params.slidesOnScreen, slideCount, params.loop, false);

            if (toIndex == current || toIndex === false) {
                return false;
            }

            var modCurrent = params._current;

            removeClass(this.blSlides[current], modCurrent);
            removeClass(this.blThumbs[current], modCurrent);

            current = this.current = toIndex;

            addClass(this.blSlides[current], modCurrent);
            addClass(this.blThumbs[current], modCurrent);

            this._prepareActualSlides();
            this._moveToCurrentItems();

            return true;
        },

        /**
         * @returns {boolean}
         */
        canPrev: function() {
            return this.current > 0;
        },

        /**
         * @returns {boolean}
         */
        canNext: function() {
            return this.current < this.slides.length - 1;
        },

        /**
         * @param {boolean} [loop=false]
         * @returns {boolean}
         */
        prev: function(loop) {
            if (this.frozen) {
                return false;
            }

            var toIndex = this.current - 1;

            if (toIndex < 0 && !loop) {
                return;
            }

            return this.go(toIndex);
        },

        /**
         * @param {boolean} [loop=false]
         * @returns {boolean}
         */
        next: function(loop) {
            if (this.frozen) {
                return false;
            }

            var toIndex = this.current + 1;

            if (toIndex == this.slides.length && !loop) {
                return;
            }

            return this.go(toIndex);
        },

        freeze: function() {
            this.frozen = true;
        },

        unfreeze: function() {
            this.frozen = false;
        },

        /**
         * @param {Object} target
         * @param {string} type
         * @param {Function} listener
         */
        _bindEvent: function(target, type, listener) {
            if (!target) {
                return;
            }

            var id = [getUID(target), type, getUID(listener)].join('-');

            if (!this._events.hasOwnProperty(id)) {
                if (target.addEventListener) {
                    target.addEventListener(type, listener, false);

                    this._events[id] = {
                        target: target,
                        type: type,
                        listener: listener
                    };
                } else {
                    var wrapper = function(evt) {
                        listener.call(target, fixEvent(evt || window.event));
                    };

                    wrapper._inner = listener;

                    target.attachEvent('on' + type, wrapper);

                    this._events[id] = {
                        target: target,
                        type: type,
                        listener: wrapper
                    };
                }
            }
        },

        /**
         * @param {HTMLElement} el
         * @param {Function} listener
         */
        _bindTransitionEnd: function(el, listener) {
            var names = [
                'transitionend',
                'webkitTransitionEnd',
                'MSTransitionEnd',
                'oTransitionEnd'
            ];

            for (var i = 0, l = names.length; i < l; i++) {
                this._bindEvent(el, names[i], listener);
            }
        },

        /**
         * @param {HTMLCollection} elements
         * @param {String} evt
         * @param {Function} listener
         */
        _bindDragstart: function(elements, evt, listener) {
            if (!elements) return;

            for (var i = 0, len = elements.length; i < len; i++) {
                this._bindEvent(elements[i], evt, listener);
            }
        },

        /**
         * @param {Object} target
         * @param {string} type
         * @param {Function} listener
         */
        _unbindEvent: function(target, type, listener) {
            var id = [getUID(target), type, getUID(listener)].join('-');

            if (this._events.hasOwnProperty(id)) {
                if (target.removeEventListener) {
                    target.removeEventListener(type, listener, false);
                } else {
                    target.detachEvent('on' + type, this._events[id].listener);
                }
                delete this._events[id];
            }
        },

        _transitionCallback: function() {
            var params = this._params,
                modHidden = params._hidden;

            var blSlides = this.blSlides;

            removeClass(this.element, params._animated);

            var startIndex = Math.max(0, this.current - 1),
                endIndex = Math.min(blSlides.length - 1, this.current + 1);

            for (var i = 0, l = blSlides.length; i < l; i++) {
                if (i < startIndex || i > endIndex) {
                    addClass(blSlides[i], modHidden);
                }
            }

            if (params.onShow) {
                params.onShow.call(this);
            }
        },

        destroy: function() {

            clearTimeout(this._autoplayTimerId);

            var events = this._events;

            for (var id in events) {
                if (events.hasOwnProperty(id)) {
                    var event = events[id];

                    if (event.target.removeEventListener) {
                        event.target.removeEventListener(event.type, event.listener, false);
                    } else {
                        event.target.detachEvent('on' + event.type, event.listener);
                    }
                    delete events[id];
                }
            }

            this.element._photor = null;

        }
    };

    // Helpers

    /**
     * @param {string} message
     */
    function logError(message) {
        if (typeof console != 'undefined') {
            if (console.error) {
                console.error(message);
            } else {
                console.log('Error: ' + message);
            }
        }
    }

    var uidCounter = 0;

    /**
     * @returns {int}
     */
    function getUID(obj) {
        return obj && (obj._uid || (obj._uid = ++uidCounter));
    }

    /**
     * @param {int} value
     * @param {int} length
     * @param {int} slidesOnScreen
     * @param {boolean} loop
     * @param {*} [altValue=0]
     * @returns {int|*}
     */
    function calcIndex(value, slidesOnScreen, length, loop, altValue) {
        loop = loop !== undefined ? loop : false;
        altValue = altValue !== undefined ? altValue : 0;

        if (slidesOnScreen == 1) {
            if (value < 0) {
                value += length;

                if (value < 0) {
                    return altValue;
                }
            } else if (value >= length) {
                value -= length;

                if (value >= length) {
                    return altValue;
                }
            }

            return value;
        }

        if (slidesOnScreen > 1) {
            if (length <= slidesOnScreen) {
                return altValue;
            }

            if (!loop) {
                if (value > length - slidesOnScreen) {
                    return length - slidesOnScreen;
                }

                if (value < 0) {
                    return altValue;
                }
            } else {
                if (value < 0) {
                    return length - slidesOnScreen;
                } else {
                    if (value > length - slidesOnScreen) {
                        return 0;
                    }
                }
            }

            return value;
        }
    }

    /**
     * @param {string} str
     * @param {*} ...values
     * @returns {string}
     */
    function format(str) {
        var values = Array.prototype.slice.call(arguments, 1);

        return str.replace(/%(\d+)/g, function(match, num) {
            return values[Number(num) - 1];
        });
    }

    var _createObject = Object.create || function(proto) {
        function F() {}
        F.prototype = proto;
        return new F();
    };

    /**
     * @param {Object} proto
     * @param {Array<Object>} [...mixins]
     * @returns {Object}
     */
    function createObject(proto) {
        var obj = _createObject(proto);

        if (arguments.length > 1) {
            for (var i = 1, l = arguments.length; i < l; i++) {
                var mixin = arguments[i];

                if (mixin === Object(mixin)) {
                    extendObject(obj, mixin);
                }
            }
        }
        return obj;
    }

    /**
     * @param {Object} obj
     * @param {Object} source
     * @returns {Object}
     */
    function extendObject(obj, source) {
        for (var name in source) {
            if (source.hasOwnProperty(name)) {
                obj[name] = source[name];
            }
        }
        return obj;
    }

    var isArray = Array.isArray || function(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    };

    /**
     * @param {Object} instance
     * @param {Array<string>} names
     */
    var bindMethods;

    if (Function.prototype.bind) {
        bindMethods = function(instance, names) {
            for (var i = 0, l = names.length; i < l; i++) {
                instance[names[i]] = instance[names[i]].bind(instance);
            }
        };
    } else {
        bindMethods = function(instance, names) {
            for (var i = 0, l = names.length; i < l; i++) {
                (function(instance, name) {
                    var listener = instance[name];

                    instance[name] = function() {
                        return listener.apply(instance, arguments);
                    };
                })(instance, names[i]);
            }
        };
    }

    var hasClass,
        addClass,
        removeClass;

    if (dummyElement.classList) {
        hasClass = function(el, className) {
            return el.classList.contains(className);
        };

        addClass = function(el, className) {
            el.classList.add(className);
        };

        removeClass = function(el, className) {
            el.classList.remove(className);
        };
    } else {
        var reNotWhite = /\S+/g;

        hasClass = function(el, className) {
            return (el.className.match(reNotWhite) || []).indexOf(className) != -1;
        };

        addClass = function(el, className) {
            var classNames = el.className.match(reNotWhite) || [];

            if (classNames.indexOf(className) == -1) {
                classNames.push(className);
                el.className = classNames.join(' ');
            }
        };

        removeClass = function(el, className) {
            var classNames = el.className.match(reNotWhite) || [],
                index = classNames.indexOf(className);

            if (index != -1) {
                classNames.splice(index, 1);
                el.className = classNames.join(' ');
            }
        };
    }

    /**
     * @param {string} html
     * @returns {HTMLElement}
     */
    function createElementFromHTML(html) {
        var el = document.createElement('div');
        el.innerHTML = html;
        return el.childNodes.length == 1 && el.firstChild.nodeType == 1 ? el.firstChild : el;
    }

    /**
     * @param {Node} node
     * @param {Node} ancestor
     * @param {Node} [limitNode]
     * @returns {boolean}
     */
    function isDescendantOf(node, ancestor, limitNode) {
        if (limitNode) {
            while (node = node.parentNode) {
                if (node == ancestor) {
                    return true;
                }
                if (node == limitNode) {
                    break;
                }
            }
        } else {
            while (node = node.parentNode) {
                if (node == ancestor) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * @param {Node} node
     * @param {Node} ancestor
     * @param {Node} [limitNode]
     * @returns {boolean}
     */
    function isSelfOrDescendantOf(node, ancestor, limitNode) {
        return node == ancestor || isDescendantOf(node, ancestor, limitNode);
    }

    /**
     * @param {Node} node
     * @returns {Node}
     */
    function clearNode(node) {
        while (node && node.lastChild) {
            node.removeChild(node.lastChild);
        }
        return node;
    }

    var getOffsetX,
        setOffsetX,
        setOffsets;

    if (prefixedTransform) {
        var reNumber = /\-?[0-9\.]+/g;

        getOffsetX = function(el) {
            var matrix = window.getComputedStyle(el, null)[prefixedTransform].match(reNumber);
            return matrix ? parseFloat(matrix[matrix.length > 6 ? 13 : 4], 10) : 0;
        };

        setOffsetX = function(el, value, unit) {
            if (unit === undefined) {
                unit = 'px';
            }

            if (el && el.style) {
                el.style[prefixedTransform] = 'translate(' + value + unit + ', 0)' +
                    (hasCSS3DTransforms ? ' translateZ(0)' : '');
            }
        };

        setOffsets = function(el, x, y, unit) {
            if (unit === undefined) {
                unit = 'px';
            }

            el.style[prefixedTransform] = 'translate(' + x + unit + ', ' + y + unit + ')' +
                (hasCSS3DTransforms ? ' translateZ(0)' : '');
        };
    } else {
        getOffsetX = function(el) {
            var style = window.getComputedStyle ? window.getComputedStyle(el, null) : el.currentStyle;
            return parseFloat(style.left, 10);
        };

        setOffsetX = function(el, value, unit) {
            if (unit === undefined) {
                unit = 'px';
            }

            el.style.left = value + unit;
        };

        setOffsets = function(el, x, y, unit) {
            if (unit === undefined) {
                unit = 'px';
            }

            el.style.top = y + unit;
            el.style.left = x + unit;
        };
    }

    /**
     * @param {string} url
     * @param {Function} callback
     * @param {Object} [context]
     */
    function loadImage(url, callback, context) {
        var img = new Image();

        img.onload = img.onerror = function(evt) {
            img.onload = img.onerror = null;
            callback.call(context, evt.type == 'load', img);
        };

        img.src = url;
    }

    function preventDefault() {
        this.returnValue = false;
    }

    function stopPropagation() {
        this.cancelBubble = true;
    }

    function fixEvent(e) {
        if (e.fixed) {
            return e;
        }

        var fixedEvent = createObject(e);

        fixedEvent.origEvent = e;

        if (!e.target) {
            fixedEvent.target = e.srcElement || document;
        }

        if (e.pageX === undefined && e.clientX !== undefined) {
            var html = document.documentElement,
                body = document.body;

            fixedEvent.pageX = e.clientX + (html.scrollLeft || body && body.scrollLeft || 0) - html.clientLeft;
            fixedEvent.pageY = e.clientY + (html.scrollTop || body && body.scrollTop || 0) - html.clientTop;
        }

        if (e.which === undefined && e.button !== undefined) {
            if (e.button & 1) {
                fixedEvent.which = 1;
            } else if (e.button & 4) {
                fixedEvent.which = 2;
            } else if (e.button & 2) {
                fixedEvent.which = 3;
            }
        }

        if (!e.preventDefault) {
            fixedEvent.preventDefault = preventDefault;
        }

        if (!e.stopPropagation) {
            fixedEvent.stopPropagation = stopPropagation;
        }

        fixedEvent.fixed = true;

        return fixedEvent;
    }

    dummyElement = null;
    dummyStyle = null;

    if (typeof exports != 'undefined') {
        if (typeof module != 'undefined' && module.exports) {
            module.exports = Photor;
        } else {
            exports.Photor = Photor;
        }
    } else {
        window.Photor = Photor;
    }

    // jQuery

    if (typeof jQuery == 'function') {
        jQuery.fn.photor = function(method, options) {
            if (typeof method != 'string') {
                options = method;
                method = undefined;
            }

            if (!method) {
                return this.each(function() {
                    Photor(this, options);
                });
            } else {
                var args = Array.prototype.slice.call(arguments, 1);

                return this.each(function() {
                    if (this._photor) {
                        this._photor[method].apply(this._photor, args);
                    }
                });
            }
        };
    }

})();
