;(function(undefined) {

    // Server side
    if (typeof window == 'undefined') {
        return;
    }

    var dummyElement = document.createElement('div');
    var dummyStyle = dummyElement.style;

    var prefixed = {};

    (function() {
        var unprefixed = [
            'transform',
            'transition',
            'transitionDuration',
            'perspective'
        ];

        var vendors = ['webkit', 'Moz', 'ms', 'O'];
        var vendorCount = vendors.length;

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

    var prefixedTransform = prefixed['transform'];
    var prefixedTransition = prefixed['transition'];
    var prefixedTransitionDuration = prefixed['transitionDuration'];

    var hasCSS3DTransforms = !!prefixed['perspective'];

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

    var photorPrefix = 'photor__';

    function Photor(el, options) {
        var instance = this instanceof Photor ? this : createObject(Photor.prototype);

        instance._init(el, options);
        return instance;
    }

    Photor.prototype = {
        constructor: Photor,

        _events: null,

        _params: null,

        _slides: null,
        current: undefined,

        frozen: false,

        _touch: null,
        _drag: null,

        // Dimensions
        _bControlWidth: undefined,
        _bControlHeight: undefined,
        _bViewportWidth: undefined,
        _bViewportHeight: undefined,
        _bThumbsWidth: undefined,
        _bThumbsHeight: undefined,
        _bThumbsLayerWidth: undefined,

        _thumbsDraggable: undefined,
        _thumbsOffset: undefined,

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

        _init: function(el, options) {
            if (el._photor) {
                throw new TypeError('Photor is already initialized for this element');
            }

            el._photor = this;

            this._events = {};

            var params = this._params = extendObject({

                // Elements
                viewport:    photorPrefix + 'viewport',
                layer:       photorPrefix + 'viewportLayer',
                slide:       photorPrefix + 'viewportLayerSlide',
                slideImg:    photorPrefix + 'viewportLayerSlideImg',
                control:     photorPrefix + 'viewportControl',
                next:        photorPrefix + 'viewportControlNext',
                prev:        photorPrefix + 'viewportControlPrev',
                thumbs:      photorPrefix + 'thumbs',
                thumbsLayer: photorPrefix + 'thumbsLayer',
                thumb:       photorPrefix + 'thumbsLayerItem',
                thumbImg:    photorPrefix + 'thumbsLayerItemImg',
                thumbFrame:  photorPrefix + 'thumbsLayerFrame',

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
                showThumbs: 'thumbs',       // thumbs / dots / false
                keyboard: true              // Управление с клавиатуры

            }, options);

            this.element = el;

            if (ie) {
                addClass(el, params.ieClassPrefix + ie);
            }

            this.bControl = el.querySelector('.' + params.control);
            this.btnPrev = el.querySelector('.' + params.prev);
            this.btnNext = el.querySelector('.' + params.next);
            this.bThumbs = el.querySelector('.' + params.thumbs);
            this.bViewport = el.querySelector('.' + params.viewport);
            this.bViewportLayer = el.querySelector('.' + params.layer);
            this.bThumbsLayer = el.querySelector('.' + params.thumbsLayer);

            this.bThumbFrame = document.createElement('div');
            addClass(this.bThumbFrame, params.thumbFrame);

            this._updateDims();

            var data = params.data;

            if (data && data.length) {
                this._setSlides(data);
            } else {
                this._setSlides(this.bViewportLayer);
            }

            this._bindListeners();
            this._bindEvents();
        },

        _updateDims: function() {
            this._bControlWidth = this.bControl.offsetWidth;
            this._bControlHeight = this.bControl.offsetHeight;

            this._bViewportWidth = window.getComputedStyle ?
                parseFloat(window.getComputedStyle(this.bViewport).width, 10) :
                this.bViewport.offsetWidth;

            this._bViewportHeight = this.bViewport.offsetHeight;

            this._bThumbsWidth = this.bThumbs.offsetWidth;
            this._bThumbsHeight = this.bThumbs.offsetHeight;
        },

        /**
         * @param {Array<Object>|HTMLElement|DocumentFragment} newSlides
         */
        _setSlides: function(newSlides) {
            var params = this._params;
            var el = this.element;

            this._cancelCurrentItems();
            this._updateSlides(newSlides);

            var slideCount = this._slides.length;

            this.current = params.current >= 0 && params.current < slideCount ? params.current : 0;

            if (slideCount == 1) {
                addClass(el, params._single);
            } else {
                removeClass(el, params._single);
            }

            if (params.showThumbs) {
                addClass(el, params.modifierPrefix + params.showThumbs);
            } else {
                removeClass(el, params.modifierPrefix + params.showThumbs);
            }

            this._updateDOM();

            this._loadActualSlides(function() {

                if (params.showThumbs == 'thumbs') {
                    this._loadThumbs(function() {
                        this._updateThumbsDims();
                        this._moveToCurrentItems(true);
                    });
                } else {
                    this._moveToCurrentItems(true);
                }

            });
        },

        _cancelCurrentItems: function() {
            var current = this.current;

            if (current !== undefined) {
                var modCurrent = this._params._current;

                removeClass(this.blSlides[current], modCurrent);
                removeClass(this.blThumbs[current], modCurrent);
            }
        },

        _updateSlides: function(newSlides) {
            var params = this._params;
            var slides = this._slides = [];

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

            var i = 0;
            var l;

            if (isArray(newSlides)) {

                for (l = newSlides.length; i < l; i++) {
                    var slide = createObject(slideProto, { loaded: false }, newSlides[i]);

                    if (slide.html && !slide.element) {
                        slide.element = createElementFromHTML(slide.html);
                    }
                    slides.push(slide);
                }

            } else {

                var hasHTML = false;

                var childNodes = newSlides.childNodes;

                for (l = childNodes.length; i < l; i++) {
                    var el = childNodes[i];

                    if (el.nodeType == 1) {
                        if (el.nodeName == 'IMG') {
                            slides.push(createObject(slideProto, {
                                url: el.src,
                                thumb: el.getAttribute('data-thumb'),
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

                if (hasHTML && params.showThumbs == 'thumbs') {
                    params.showThumbs = 'dots';
                }

            }

            if (!slides.length) {
                throw new RangeError('Requires more slides');
            }
        },

        _updateDOM: function() {
            var params = this._params;

            var slides = this._slides;

            var bViewportLayer = this.bViewportLayer;
            var bThumbsLayer = this.bThumbsLayer;

            var blSlides = this.blSlides = [];
            var blThumbs = this.blThumbs = [];

            clearNode(bViewportLayer);
            clearNode(bThumbsLayer);

            var dfSlides = document.createDocumentFragment();
            var dfThumbs = document.createDocumentFragment();

            for (var i = 0, l = slides.length; i < l; i++) {
                var slide = slides[i];
                var slideEl = slide.element;

                var slideHTML = format(
                    '<div data-index="%1" class="%2 %3 %4">',
                    i,
                    params.slide,
                    params.itemPrefix + i,
                    slide.html ? params._html : params._loading
                );

                if (!slideEl) {
                    if (params.ie && params.ie < 9) {
                        slideHTML += format('<img src="" class="%1 %2" />', params.slideImg, slide.classes);
                    } else {
                        slideHTML += format('<div class="%1 %2"></div>', params.slideImg, slide.classes);
                    }
                }

                slideHTML += '</div>';

                var bSlide = createElementFromHTML(slideHTML);

                if (slideEl) {
                    bSlide.appendChild(slideEl);
                }

                bSlide.style.left = (i * 100) + '%';

                blSlides.push(bSlide);
                dfSlides.appendChild(bSlide);

                var thumbHTML = format(
                    '<span data-rel="%1" class="%2 %3 %4">',
                    i,
                    params.thumb,
                    params.itemPrefix + i,
                    slide.classes
                );

                if (params.showThumbs == 'thumbs' && slide.thumb) {
                    thumbHTML += format('<img src="%1" data-rel="%2" class="%3" />', slide.thumb, i, params.thumbImg);
                }

                thumbHTML += '</span>';

                var bThumb = createElementFromHTML(thumbHTML);

                blThumbs.push(bThumb);
                dfThumbs.appendChild(bThumb);
            }

            bViewportLayer.appendChild(dfSlides);
            bThumbsLayer.appendChild(dfThumbs);

            if (params.showThumbs == 'thumbs') {
                bThumbsLayer.appendChild(this.bThumbFrame);
            }
        },

        /**
         * @param {Function} [callback]
         */
        _loadActualSlides: function(callback) {
            var slides = this._slides;

            var startIndex = Math.max(0, this.current - 1);
            var endIndex = Math.min(slides.length - 1, this.current + 1);

            var loadingCount = 0;

            for (var i = startIndex; i <= endIndex; i++) {
                var slide = slides[i];

                if (!slide.loaded) {
                    (function(index, slide, url) {
                        loadingCount++;

                        loadImage(url, function(success, img) {
                            loadingCount--;

                            if (success) {
                                var params = this._params;

                                var bSlide = this.blSlides[index];
                                var bSlideImg = bSlide.firstChild;

                                slide.width = img.width;
                                slide.height = img.height;
                                slide.loaded = true;

                                removeClass(bSlide, params._loading);

                                this._alignBSlideImg(index);
                                this._orientBSlideImg(index);

                                if (params.ie && params.ie < 9) {
                                    bSlideImg.src = url;
                                } else {
                                    bSlideImg.style.backgroundImage = "url('" + url + "')";
                                }
                            } else {
                                logError("Image wasn't loaded: " + url);
                            }

                            if (!loadingCount && callback) {
                                callback.call(this);
                            }
                        }, this);
                    }).call(this, i, slide, slide.url);
                }
            }
        },

        /**
         * @param {Function} [callback]
         */
        _loadThumbs: function(callback) {
            var slides = this._slides;

            var loadingCount = 0;

            for (var i = 0, l = slides.length; i < l; i++) {
                var slide = slides[i];
                var url = slide.thumb || slide.url;

                if (url) {
                   loadingCount++;

                   loadImage(url, function(success) {
                        loadingCount--;

                        if (!success) {
                            logError("Image wasn't loaded: " + url);
                        }

                        if (!loadingCount && callback) {
                            callback.call(this);
                        }
                    }, this);
                }
            }
        },

        _alignBSlideImg: function(index) {
            var params = this._params;

            var slide = this._slides[index];
            var bSlide = this.blSlides[index];

            if (this._bViewportWidth > slide.width && this._bViewportHeight > slide.height) {
                slide.algorithm = 'center';

                removeClass(bSlide, params._auto);
                addClass(bSlide, params._center);
            } else {
                slide.algorithm = 'auto';

                removeClass(bSlide, params._center);
                addClass(bSlide, params._auto);
            }
        },

        _orientBSlideImg: function(index) {
            var params = this._params;

            var slide = this._slides[index];
            var bSlide = this.blSlides[index];

            var bViewportRatio = this._bViewportWidth / this._bViewportHeight;
            var slideRatio = slide.width / slide.height;

            if (slideRatio >= bViewportRatio) {
                slide.orientation = 'landscape';

                removeClass(bSlide, params._portrait);
                addClass(bSlide, params._landscape);
            } else {
                slide.orientation = 'portrait';

                removeClass(bSlide, params._landscape);
                addClass(bSlide, params._portrait);
            }
        },

        _updateThumbsDims: function() {
            if (this._params.showThumbs != 'thumbs') {
                return;
            }

            this._bThumbsLayerWidth = this.bThumbsLayer.offsetWidth;

            var slides = this._slides;

            var blThumbs = this.blThumbs;
            var i = blThumbs.length;

            while (i) {
                var bThumb = blThumbs[--i];

                slides[i].thumbDims = {
                    top: bThumb.offsetTop,
                    left: bThumb.offsetLeft,
                    width: bThumb.offsetWidth,
                    height: bThumb.offsetHeight
                };
            }

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
            var params = this._params;
            var current = this.current;
            var bViewportLayer = this.bViewportLayer;

            if (prefixedTransitionDuration) {
                bViewportLayer.style[prefixedTransitionDuration] = noEffects ? '0ms' : params.duration + 'ms';
            }

            setOffsetX(bViewportLayer, -(this._bViewportWidth * current));

            addClass(this.blSlides[current], params._current);
        },

        /**
         * @param {boolean} [noEffects=false]
         */
        _moveToCurrentThumb: function(noEffects) {
            var params = this._params;

            if (params.showThumbs != 'thumbs') {
                return;
            }

            var current = this.current;

            var currentThumbDims = this._slides[current].thumbDims;

            var bThumbsLayer = this.bThumbsLayer;
            var bThumbsLayerStyle = bThumbsLayer.style;

            var bThumbFrame = this.bThumbFrame;
            var bThumbFrameStyle = bThumbFrame.style;

            this._computeThumbsOffset();

            if (prefixedTransitionDuration) {
                var duration = noEffects ? '0ms' : params.duration + 'ms';

                bThumbsLayerStyle[prefixedTransitionDuration] = duration;
                bThumbFrameStyle[prefixedTransitionDuration] = duration;
            }

            setOffsetX(bThumbsLayer, this._thumbsOffset);

            setOffsets(bThumbFrame, currentThumbDims.left, currentThumbDims.top);

            bThumbFrameStyle.width = currentThumbDims.width + 'px';
            bThumbFrameStyle.height = currentThumbDims.height + 'px';

            addClass(this.blThumbs[current], params._current);
        },

        _computeThumbsOffset: function() {
            var currentThumbDims = this._slides[this.current].thumbDims;

            var offset;

            if (!this._thumbsDraggable) {
                offset = 0;
            } else {
                offset = (this._bThumbsWidth - currentThumbDims.width) / 2 - currentThumbDims.left;

                if (offset > 0) {
                    offset = 0;
                } else {
                    var limit = this._bThumbsWidth - this._bThumbsLayerWidth;

                    if (offset < limit) {
                        offset = limit;
                    }
                }
            }

            this._thumbsOffset = offset;
        },

        _bindListeners: function() {
            bindMethods(this, [
                '_onBControlTouchStart',
                '_onBControlMouseDown',

                '_onBThumbsTouchStart',
                '_onBThumbsMouseDown',

                '_onDocumentTouchMove',
                '_onDocumentTouchEnd',
                '_onDocumentTouchCancel',

                '_onDocumentMouseMove',
                '_onDocumentMouseUp',

                '_onWindowResize',

                '_onDocumentKeydown'
            ]);
        },

        _bindEvents: function() {
            var bControl = this.bControl;
            var bThumbs = this.bThumbs;

            this._bindEvent(bControl, 'touchstart', this._onBControlTouchStart);
            this._bindEvent(bControl, 'mousedown', this._onBControlMouseDown);

            this._bindEvent(bThumbs, 'touchstart', this._onBThumbsTouchStart);
            this._bindEvent(bThumbs, 'mousedown', this._onBThumbsMouseDown);

            this._bindEvent(window, 'resize', this._onWindowResize);

            this._bindEvent(document, 'keydown', this._onDocumentKeydown);
        },

        _onBControlTouchStart: function(evt) {
            this._handleTouchStart(evt, this.bControl, true);
        },

        _onBControlMouseDown: function(evt) {
            if (evt.which == 1) {
                this._handleTouchStart(evt, this.bControl, false);
            }
        },

        _onBThumbsTouchStart: function(evt) {
            this._handleTouchStart(evt, this.bThumbs, true);
        },

        _onBThumbsMouseDown: function(evt) {
            this._handleTouchStart(evt, this.bThumbs, false);
        },

        _handleTouchStart: function(evt, el, isTouch) {
            if (this.frozen || this.touch) {
                return;
            }

            var positionSource = isTouch ? evt.touches[0] : evt;

            this._touch = {
                id: isTouch ? evt.touches[0].identifier : undefined,

                start: {
                    clientX: positionSource.clientX,
                    clientY: positionSource.clientY,
                    timeStamp: evt.timeStamp,
                    element: el
                }
            };

            this._observeTouch();
        },

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

        _onDocumentTouchMove: function(evt) {
            this._handleTouchMove(evt, true);
        },

        _onDocumentTouchEnd: function(evt) {
            this._handleTouchEnd(evt, true);
        },

        _onDocumentTouchCancel: function(evt) {
            this._completeTouch(evt, true, 'touchCancel');
        },

        _onDocumentMouseMove: function(evt) {
            this._handleTouchMove(evt, false);
        },

        _onDocumentMouseUp: function(evt) {
            this._handleTouchEnd(evt, false);
        },

        _onWindowResize: function() {
            this.update();
        },

        _onDocumentKeydown: function() {
            if (document.activeElement == document.body) {
                //
            }
        },

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

            var positionSource = isTouch ? evt.touches.identifiedTouch(touch.id) : evt;

            touch.clientX = positionSource.clientX;
            touch.clientY = positionSource.clientY;

            touch.shiftX = touch.clientX - touchStart.clientX;
            touch.shiftY = touch.clientY - touchStart.clientY;

            touch.timeStamp = evt.timeStamp;

            if (isTouch && evt.touches.length > 1) {
                this._completeTouch(evt, true, 'multitouch');
                return;
            }

            var params = this._params;

            var drag = this._drag;

            var el = this.element;
            var bControl = this.bControl;
            var bViewportLayer = this.bViewportLayer;
            var bThumbsLayer = this.bThumbsLayer;

            var targetLayer;

            if (!drag) {
                if (isTouch && Math.abs(touch.shiftX) < Math.abs(touch.shiftY)) {
                    this._completeTouch(evt, true, 'scroll');
                    return;
                }

                targetLayer = touchStart.element == bControl ? bViewportLayer : bThumbsLayer;

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
                    addClass(el, params._dragging);
                    dragging = true;
                }
            } else {
                if (this._thumbsDraggable) {
                    dragging = true;
                }
            }

            if (dragging) {
                var offset = drag.start.targetLayerOffset + touch.shiftX;

                if (offset > 0) {
                    offset /= 3;
                } else if (offset < 0) {
                    var limit = targetLayer == bViewportLayer ?
                        -(this._bViewportWidth * (this._slides.length - 1)) :
                        this._bThumbsWidth - this._bThumbsLayerWidth;

                    if (offset < limit) {
                        offset = limit + ((offset - limit) / 3);
                    }
                }

                if (targetLayer == bThumbsLayer) {
                    this._thumbsOffset = offset;
                }

                if (prefixedTransitionDuration) {
                    targetLayer.style[prefixedTransitionDuration] = '0s';
                }

                setOffsetX(targetLayer, offset);
            }
        },

        _handleTouchEnd: function(evt, isTouch) {
            this._completeTouch(evt, isTouch, 'touchEnd');
        },

        _completeTouch: function(evt, isTouch, cause) {
            this._stopTouchObserving();

            var touch = this._touch;
            var touchStart = touch.start;

            var drag = this._drag;

            var bControl = this.bControl;
            var btnPrev = this.btnPrev;
            var btnNext = this.btnNext;
            var bThumbsLayer = this.bThumbsLayer;

            var touchEnd = touch.end = {};

            var src;

            if (isTouch) {
                if (evt.touches) {
                    src = evt.touches.identifiedTouch(touch.id);
                    touchEnd.timeStamp = evt.timeStamp;
                } else {
                    src = touch.prev || touchStart;
                    touchEnd.timeStamp = src.timeStamp;
                }
            } else {
                src = evt;
                touchEnd.timeStamp = evt.timeStamp;
            }

            touchEnd.clientX = src.clientX;
            touchEnd.clientY = src.clientY;
            touchEnd.shiftX = src.clientX - touchStart.clientX;
            touchEnd.shiftY = src.clientY - touchStart.clientY;

            if (drag) {
                if (touchStart.element == bControl) {
                    if (cause == 'touchEnd') {
                        this._completeSlidesDrag();
                    } else {
                        this._moveToCurrentSlide();
                    }
                } else {
                    if (Math.abs(touchEnd.shiftX) > 5 || Math.abs(touchEnd.shiftY) > 5) {
                        this._completeThumbsDrag();
                    } else {
                        this._handleThumbsTap(evt, isTouch);
                    }
                }
            } else {
                if (cause == 'touchEnd') {
                    if (touchStart.element == bControl) {
                        if (isSelfOrDescendantOf(evt.target, btnPrev, bControl)) {
                            evt.preventDefault();
                            this.prev();
                        } else if (isSelfOrDescendantOf(evt.target, btnNext, bControl)) {
                            evt.preventDefault();
                            this.next();
                        }
                    } else {
                        this._handleThumbsTap(evt, isTouch);
                    }
                }
            }

            this._touch = null;
            this._drag = null;
        },

        _completeSlidesDrag: function() {
            var touch = this._touch;
            var touchStart = touch.start;
            var touchEnd = touch.end;

            if (
                (touchEnd.timeStamp - touchStart.timeStamp) < 300 ||
                    Math.abs(touchEnd.shiftX) >= (this._bControlWidth / 4)
            ) {
                if (touchEnd.shiftX > 0) {
                    if (this.canPrev()) {
                        this.prev();
                        return;
                    }
                } else {
                    if (this.canNext()) {
                        this.next();
                        return;
                    }
                }
            }

            this._moveToCurrentSlide();
        },

        _completeThumbsDrag: function() {
            var params = this._params;

            var touch = this._touch;
            var touchPrev = touch.prev;
            var touchEnd = touch.end;

            var bThumbsLayer = this.bThumbsLayer;

            var offset;

            if (!this._thumbsDraggable) {
                offset = 0;
            } else {
                var lastStepShiftX = touchEnd.clientX - touchPrev.clientX;
                var direction = lastStepShiftX < 0 ? -1 : 1;
                var speed = Math.abs(lastStepShiftX / (touchEnd.timeStamp - touchPrev.timeStamp));

                offset = direction * Math.pow(speed * 10, 2) + this._thumbsOffset;

                if (offset > 0) {
                    offset = 0;
                } else {
                    var limit = this._bThumbsWidth - this._bThumbsLayerWidth;

                    if (offset < limit) {
                        offset = limit;
                    }
                }
            }

            this._thumbsOffset = offset;

            if (prefixedTransitionDuration) {
                bThumbsLayer.style[prefixedTransitionDuration] = params.duration + 'ms';
            }

            setOffsetX(bThumbsLayer, offset);
        },

        _handleThumbsTap: function(evt, isTouch) {
            var bThumbs = this.bThumbs;

            var el = evt.target;

            while (el != bThumbs) {
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

        update: function() {
            this._updateDims();
            this._updateThumbsDims();

            this._moveToCurrentItems(true);
        },

        go: function(index) {
            if (this.frozen) {
                return;
            }

            var current = this.current;

            if (index == current || index < 0 || index > this._slides.length - 1) {
                return;
            }

            this.current = index;

            this._loadActualSlides();
            this._moveToCurrentItems();
        },

        canPrev: function() {
            return this.current > 0;
        },

        canNext: function() {
            return this.current < this._slides.length - 1;
        },

        prev: function() {
            if (this.frozen) {
                return;
            }

            this.go(this.current - 1);
        },

        next: function() {
            if (this.frozen) {
                return;
            }

            this.go(this.current + 1);
        },

        freeze: function() {
            this.frozen = true;
        },

        unfreeze: function() {
            this.frozen = false;
        },

        _bindEvent: function(el, type, listener) {
            var id = getUID(el) + '-' + type + '-' + getUID(listener);

            if (!this._events.hasOwnProperty(id)) {
                if (el.addEventListener) {
                    el.addEventListener(type, listener, false);

                    this._events[id] = {
                        element: el,
                        type: type,
                        listener: listener
                    };
                } else {
                    var wrapper = function(evt) {
                        listener.call(el, fixEvent(evt || window.event));
                    };

                    wrapper._inner = listener;

                    el.attachEvent('on' + type, wrapper);

                    this._events[id] = {
                        element: el,
                        type: type,
                        listener: wrapper
                    };
                }
            }
        },

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

        _unbindEvent: function(el, type, listener) {
            var id = getUID(el) + '-' + type + '-' + getUID(listener);

            if (this._events.hasOwnProperty(id)) {
                if (el.removeEventListener) {
                    el.removeEventListener(type, listener, false);
                } else {
                    el.detachEvent('on' + type, this._events[id].listener);
                }
                delete this._events[id];
            }
        },

        destroy: function() {
            var events = this._events;

            for (var id in events) {
                if (events.hasOwnProperty(id)) {
                    var event = events[id];

                    if (event.element.removeEventListener) {
                        event.element.removeEventListener(event.type, event.listener, false);
                    } else {
                        event.element.detachEvent('on' + event.type, event.listener);
                    }
                    delete events[id];
                }
            }

            this.element._photor = null;
        }
    };

    // Helpers

    var uidCounter = 0;

    var reNotWhite = /\S+/g;

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

    /**
     * @returns {int}
     */
    function getUID(obj) {
        return obj._uid || (obj._uid = ++uidCounter);
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
    var bindMethods = Function.prototype.bind ?
        function(instance, names) {
            var i = names.length;

            while (i) {
                instance[names[--i]] = instance[names[i]].bind(instance);
            }
        } :
        function(instance, names) {
            var i = names.length;

            while (i) {
                (function(instance, name) {
                    var listener = instance[name];

                    instance[name] = function() {
                        return listener.apply(instance, arguments);
                    };
                })(instance, names[--i]);
            }
        };

    var hasClass;
    var addClass;
    var removeClass;

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
            var classNames = el.className.match(reNotWhite) || [];
            var index = classNames.indexOf(className);

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
     * @param {Node} [stoppingNode]
     * @returns {boolean}
     */
    function isDescendantOf(node, ancestor, stoppingNode) {
        if (stoppingNode) {
            while (node = node.parentNode) {
                if (node == ancestor) {
                    return true;
                }
                if (node == stoppingNode) {
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
     * @param {Node} [stoppingNode]
     * @returns {boolean}
     */
    function isSelfOrDescendantOf(node, ancestor, stoppingNode) {
        return node == ancestor || isDescendantOf(node, ancestor, stoppingNode);
    }

    /**
     * @param {Node} node
     * @returns {Node}
     */
    function clearNode(node) {
        while (node.lastChild) {
            node.removeChild(node.lastChild);
        }
        return node;
    }

    var getOffsetX;
    var setOffsetX;
    var setOffsets;

    if (prefixedTransform) {
        getOffsetX = function(el) {
            var matrix = window.getComputedStyle(el, null)[prefixedTransform].match(/\-?[0-9\.]+/g);
            return parseFloat(matrix[matrix.length > 6 ? 13 : 4], 10);
        };

        setOffsetX = function(el, value, unit) {
            if (unit === undefined) {
                unit = 'px';
            }

            el.style[prefixedTransform] = 'translate(' + value + unit + ', 0)' +
                (hasCSS3DTransforms ? ' translateZ(0)' : '');
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

    function fixEvent(evt) {
        if (evt.fixed) {
            return evt;
        }

        var fixedEvent = createObject(evt);

        fixedEvent.origEvent = evt;

        if (!evt.target) {
            fixedEvent.target = evt.srcElement || document;
        }

        if (evt.pageX === undefined && evt.clientX !== undefined) {
            var html = document.documentElement;
            var body = document.body;

            fixedEvent.pageX = evt.clientX + (html.scrollLeft || body && body.scrollLeft || 0) - html.clientLeft;
            fixedEvent.pageY = evt.clientY + (html.scrollTop || body && body.scrollTop || 0) - html.clientTop;
        }

        if (evt.which === undefined && evt.button !== undefined) {
            if (evt.button & 1) {
                fixedEvent.which = 1;
            } else if (e.button & 4) {
                fixedEvent.which = 2;
            } else if (e.button & 2) {
                fixedEvent.which = 3;
            }
        }

        if (!evt.preventDefault) {
            fixedEvent.preventDefault = preventDefault;
        }

        if (!evt.stopPropagation) {
            fixedEvent.stopPropagation = stopPropagation;
        }

        fixedEvent.fixed = true;

        return fixedEvent;
    }

    dummyElement = null;
    dummyStyle = null;

    // jQuery
    // TODO: допилить

    if (typeof jQuery == 'function') {
        jQuery.fn.photor = function(method, options) {

            if (method === undefined) {
                return new Photor(this[0], options);
            } else {
                $.error('Unknown method: ' +  method);
            }

        };
    }

})();
