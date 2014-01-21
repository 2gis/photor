/*
* Photor
* https://github.com/Chaptykov/photor
*
* Copyright (c) 2014 Chaptykov
* Licensed under the MIT license.
*/

(function() {
    'use strict';

    // Server side
    if (!window) {
        return;
    }

    function Photor(options) {
        if (!options) {
            return;
        }

        var root = options.root || this;

        if (this instanceof Photor) {

            if (root && typeof root === "object") {

                // Apply plugin for single DOM element
                if (!root.length) {
                    new PhotorInstance(options);
                }

                // Apply plugin for collection
                for (var i = 0, len = root.length; i < len; i++) {
                    (function(options, root) {
                        options.root = root;
                        new PhotorInstance(options);
                    })(options, root[i]);
                }

            }

        } else {
            return jQueryPhotor(options, this);
        }

        function jQueryPhotor(options, elem) {
            options.root = getStaticNodeList(elem);

            return new Photor(options);
        }

        function getStaticNodeList(jQueryObject) {
            var elems = [],
                length = jQueryObject.length;

            if (length) {
                for (var i = 0; i < length; i++) {
                    elems.push(jQueryObject[i]);
                }
            }

            return elems;
        }
    }

    function PhotorInstance(options) {
        this.init(options);
    }

    PhotorInstance.fn = {

        init: function(options) {
            var params = this.params = options,
                thumbs = this.el(params.thumb),
                data = [],
                html = '',
                layer = this.el(params.layer)[0];

            for (var i = 0, len = thumbs.length; i < len; i++) {
                data.push({
                    url: thumbs[i].href,
                    loaded: false
                });
                html += this.slideTemplate(i);
            }

            params.data = data;
            params.current = params.start || 0;
            params.count = params.data.length;

            // No images
            if (params.count == 0) {
                return;
            }

            layer.innerHTML = html;

            this.bind();
            this.go(params.current);
        },

        el: function(className, base, filtering) {
            var filter = filtering || '';

            base = base || this.params.root;

            return base.querySelectorAll('.' + className + filter);
        },

        bind: function() {
            var params = this.params,
                prev = this.el(params.prev);
        },

        unbind: function() {

        },

        go: function(target) {
            // Magic
            this.loadSlides(target);
        },

        loadSlides: function(target) {
            var params = this.params,
                range = this.params.loadingRange,
                start = target - 1 < 0 ? 0 : target - 1,
                end = target + 1 > params.count ? params.count : target + 1;

            for (var i = start; i <= end; i++) {
                if (params.data[i].loaded) {
                    return;
                }
                this.loadSlide(i);
            }
        },

        loadSlide: function(target) {
            var params = this.params,
                slide = this.el(params.slide, params.root, '._' + target)[0],
                img = new Image(),
                url = params.data[target].url;

            img.onload = function() {
                slide.style.backgroundImage = 'url(' + url + ')';
                params.data[target].loaded = true;
            };
            img.src = url;
        },

        slideTemplate: function(id) {
            var params = this.params;

            return '<div class="' + params.slide + ' _' + id + ' ' + params.mod.loading + '"></div>';
        }

    };

    PhotorInstance.prototype = PhotorInstance.fn;
    window.Photor = Photor;
    window.PhotorInstance = PhotorInstance;

    if (typeof jQuery !== undefined) {
        jQuery.fn.photor = Photor;
    }

})();

window.PhotorInstance.fn.dragndrop = function() {
    
};


// + Пройтись по рутовым элементам
    // + Сохранить информацию о событиях и элементах

    // Инициализация (создать по шаблону)
    // Установить обработчик на событие загрузки,
        // заполнить массив, расставить модификаторы
        // Если ошибка в thumbnail грузим большую
    // Установить обработчики

// Переход к текущему (подсмотреть как это сделано в фотораме)
// Подгрузить элементы → подгрузить элемент → если ошибка ставим thumbnail

// Навешать события: prev, next, thumb click, drag'n'drop, scroll, клавиатура









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

    var params,
        data = [];

    var methods = {
        init: function(options) {
            params = $.extend({

                current: 0,
                count: 0,
                loadingRange: 1,
                slideIdPrefix: '_'

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
                p.viewportWidth = p.viewport.outerWidth();
                p.viewportHeight = p.viewport.outerHeight();

                data[galleryId] = p;

                methods.handlers(galleryId);
                methods.go(galleryId, p.current, 0);

            });

            // Взять thumbs

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
                if (!p.dragging) {
                    // console.log('click');
                    methods.next(galleryId);
                }
            });

            // Previous button
            p.prev.on('click', function() {
                if (!p.dragging) {
                    // console.log('click');
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
                startX = 0,
                endX = 0;

            p.dragging = false;

            p.control.on('mouseup mouseleave', function() {
                // console.log('mouseup');
                if (p.dragging) {
                    var self = $(this),
                        selfWidth = self.outerWidth(),
                        deltaX,
                        deltaT,
                        target;

                    (function(p) {
                        setTimeout(function() {
                            p.dragging = false;
                        }, 10);
                    })(p);

                    deltaX = startX - endX;
                    target = deltaX > 0 ? p.current + 1 : p.current - 1;

                    // Transition executes if delta more then 5% of container width
                    if (Math.abs(deltaX) > selfWidth * 0.05) {
                        if (deltaX > 0) {
                            methods.next(galleryId);
                        } else {
                            methods.prev(galleryId);
                        }
                    } else {
                        methods.go(galleryId, p.current);
                    }

                    p.root.removeClass(params.mod.dragging);
                }
            });

            p.control.on('mousemove', function(e) {
                if (p.dragging) {
                    var self = $(this),
                        selfWidth = self.outerWidth(),
                        offset = self.offset(),
                        deltaX, relativeDeltaX, indent;

                    endX = e.pageX - offset.left;
                    deltaX = startX - endX;
                    relativeDeltaX = -deltaX / selfWidth * 100;
                    indent = -p.current * 100 + relativeDeltaX;

                    p.layer.css('left', indent + '%');
                }
            });

            p.control.on('mousedown', function(e) {
                var offset = $(this).offset();

                startX = e.pageX - offset.left;
                p.dragging = true;
                p.root.addClass(params.mod.dragging);
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
                .css('left', -target * 100 + '%');

            p.current = target;

            // Mark slide as current
            p.slide.removeClass(params.mod.current);
            p.slide
                .filter(params.slideIdPrefix + target)
                .addClass(params.mod.current);

            // Load slide's range
            methods.loadSlides(galleryId, target);

            // Reset duration
            setTimeout(function() {
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
