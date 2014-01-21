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








