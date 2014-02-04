$(document).ready(function() {

    var pointerEnabled = navigator.pointerEnabled,
        msPointerEnabled = navigator.msPointerEnabled,
        touchEnabled = !!('ontouchstart' in window),

        // Переменные для обработки «быстрого клика»
        fcStart = {},
        fcDelta = {},
        fcClick = false,
        fcMultitouch = false,
        fcScrolling;

        // Список поддерживаемых событий
        evt = getSupportedEvents();

    /*
     * Возвращает массив событий, поддерживаемых текущим устройством
     *
     * @return {Array} Массив строк с названиями событий
     */
    function getSupportedEvents() {
        var pointerEvents   = ['pointerdown', 'pointermove', 'pointerup', 'pointerleave'],
            msPointerEvents = ['MSPointerDown', 'MSPointerMove', 'MSPointerUp', 'MSPointerOut'],
            touchEvents     = ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
            mouseEvents     = ['mousedown', 'mousemove', 'mouseup', 'mouseleave'];

        if (pointerEnabled) {
            return pointerEvents; // IE 11
        }

        if (msPointerEnabled) {
            return msPointerEvents; // IE 10 on touch devices, Windows Phone
        }

        if (touchEnabled) {
            return touchEvents; // iOS, Android
        }

        return mouseEvents; // Desktop / fallback
    }

    /*
     * Добавляет обработчик событий через jQuery или нативно в зависимости от устройства
     */
    function addListener(element, evt, handler, capture) {
        // MSPointer / pointer-события через jQuery не содержат originalEvent и данных о координатах
        // Touch-события на Андроид, установленные нативно, не срабатывают до зума или скролла
        // iOS устройства, как правило, работают
        capture = capture || false;

        if ((pointerEnabled || msPointerEnabled) && Element.prototype.addEventListener) {
            element.addEventListener(evt, handler, capture);
        } else {
            $(element).on(evt, handler);
        }
    }

    /*
     * Быстрый клик для мобильных устройств (устранение задержки в 300 мс перед вызовом)
     */
    function fastClickHandler() {

        addListener(document, evt[0], fcTouchstart, false);
        addListener(document, evt[1], fcTouchmove, true);
        addListener(document, evt[2], fcTouchend, false);

        /*
         * Touch start handler
         */
        function fcTouchstart(e) {
            var touches = e.originalEvent && e.originalEvent.touches,
                x, y;

            fcClick = true;

            if (touches && touches.length == 1) {
                x = e.pageX || touches[0].pageX;
                y = e.pageY || touches[0].pageY;

                fcStart = {x: x, y: y};
                fcMultitouch = false;
            }
        }

        /*
         * Touch move handler
         */
        function fcTouchmove(e) {
            var touches = e.originalEvent && e.originalEvent.touches,
                x, y;

            fcClick = false;

            if (touches && touches.length > 1) {
                fcMultitouch = true;
            }

            if (touches && touches.length == 1) {
                x = e.pageX || touches[0].pageX;
                y = e.pageY || touches[0].pageY;

                fcDelta = {x: x - fcStart.x, y: y - fcStart.y};
            }

            if (e.type != 'MSPointerMove' && e.type != 'pointermove' && typeof fcScrolling == 'undefined') {
                fcScrolling = !!(fcScrolling || Math.abs(fcDelta.x) < Math.abs(fcDelta.y));
            }

        }

        /*
         * Touch end handler
         */
        function fcTouchend(e) {
            var touches = e.originalEvent && e.originalEvent.touches,
                noDiff = Math.abs(fcDelta.x) < 20 && Math.abs(fcDelta.y) < 20;

            if (!fcMultitouch && !fcScrolling && (fcClick || noDiff)) {
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent('fastclick', true, true, e.target);

                e.target.dispatchEvent(event);
                e.preventDefault();
            }

            fcClick = false;
            fcStart = {};
            fcScrolling = undefined;
        }

    }

    function touchHandler() {
        var isScrolling,
            isMultitouch = false,
            dragging = false,
            start = {},
            delta = {};

        addListener(el.control[0], evt[0], touchstart);
        addListener(el.control[0], evt[1], touchmove);
        addListener(el.control[0], evt[2], touchend);
        addListener(el.control[0], evt[3], touchend);

        addListener(el.prev[0], 'fastclick', prev);
        addListener(el.next[0], 'fastclick', next);

        /*
         * Touch start handler
         */
        function touchstart(e) {
            if (!dragging) {
                var x = e.pageX || e.originalEvent.touches[0].pageX,
                    y = e.pageY || e.originalEvent.touches[0].pageY;

                start = {x: x, y: y};
                delta = {x: 0, y: 0};

                dragging = true;
            }
        }

        /*
         * Touch move handler
         */
        function touchmove(e) {
            var touches = e.originalEvent && e.originalEvent.touches,
                x = e.pageX || touches[0].pageX,
                y = e.pageY || touches[0].pageY;

            // Detect multitouch
            isMultitouch = isMultitouch || (touches && touches.length) > 1;

            // Detect scrolling (for windows and windows phone touch-action: pan-y)
            if (e.type != 'MSPointerMove' && e.type != 'pointermove' && typeof isScrolling == 'undefined') {
                isScrolling = !!(isScrolling || Math.abs(x - start.x) < Math.abs(y - start.y));
            }

            if (!dragging || isMultitouch || isScrolling) {
                dragging = false; // other end
                slidesCancel(e);

                return;
            } else {
                e.preventDefault();
            }

            if (!start.x && !start.y) {
                // Start drag
                start = {x: x, y: y};
                delta = {x: 0, y: 0};
            } else {
                // Continue drag
                delta = {x: x - start.x, y: y - start.y};
                // console.log('move  delta(' + delta.x + ', ' + delta.y + ') ' + e.type);
            }

            slidesMove();
        }

        /*
         * Touch end handler
         */
        function touchend(e) {
            // Force re-layout (android chrome needs)
            el.control[0].style.display = 'none';
            el.control.outerWidth(); // no need to store this anywhere, the reference is enough
            el.control[0].style.display = 'block';

            var isMoved = Math.abs(delta.x) > 20 || Math.abs(delta.y) > 20;

            if (dragging && isMoved) {
                slidesEnd();
            }

            // Reset scrolling detection
            isScrolling = undefined;

            // Update multitouch info
            if (e.type != 'MSPointerUp' && e.type != 'MSPointerOut' && e.type != 'pointerup' && e.type != 'pointerleave') {
                isMultitouch = (e.originalEvent.touches && e.originalEvent.touches.length) == 1;
            }

            slidesCancel();

            dragging = false;
            start = {};
        }

        /*
         * Slides dragging
         */
        function slidesMove() {
            el.runner
                .css('transition-duration', '0s')
                .css('transform', 'translate3d(' + delta.x + 'px, 0, 0)');
        }

        /*
         * Slides drag end
         */
        function slidesEnd() {
            console.log('Swipe end with delta: x=' + delta.x + ' y=' + delta.y);
        }

        /*
         * Slides drag cancel
         */
        function slidesCancel() {
            el.runner
                .css('transition-duration', '.3s')
                .css('transform', 'translate3d(0, 0, 0)');
        }

        /*
         * Переход к предыдущему слайду
         */
        function prev(e) {
            console.log('Previous');
            e.stopPropagation();
        }

        /*
         * Переход к следующему слайду
         */
        function next(e) {
            console.log('Next');
            e.stopPropagation();
        }
    }


    // Элементы
    var el = {
            runner: $('.block__runner'),
            control: $('.block__control'),
            prev: $('.block__prev'),
            next: $('.block__next'),
            out: $('#out')
        };


    fastClickHandler();
    touchHandler();


    console.log = function(str) {
        var old = el.out.html();

        el.out.html(old + '\n' + str);
    };

});