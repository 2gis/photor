// Обработчик общих тестов
// skipIndexes - массив номеров тестов, которые должны быть пропущены
var common = function(params) {
    params = params || {};
    params.skip = params.skip || [];
    params.only = params.only || [];

    var current;

    for (var i = 0 ; i < commonTests.length ; i++) {
        current = commonTests[i];

        var go = false;

        // Фильтрация по чёрному списку
        for (var j = 0 ; j < params.skip.length ; j++) {
            if (i == params.skip[j]) {
                go = false;
            }
        }

        // Фильтрация по белому списку.
        if (go && params.only.length) { // Если уже скипнули, заонлить нельзя
            go = false;
            for (var j = 0 ; j < params.only.length ; j++) {
                if (i == params.only[j]) {
                    go = true;
                }
            }
        }

        if (go) {
            it(current.title, current.fn);
        }
    }
};

var defaultParams = {
    control: 'photor__viewportControl',
    next: 'photor__viewportControlNext',
    prev: 'photor__viewportControlPrev',
    thumbs: 'photor__thumbs',
    thumbsLayer: 'photor__thumbsWrap',
    thumb: 'photor__thumbsWrapItem',
    thumbImg: 'photor__thumbsWrapItemImg',
    thumbFrame: 'photor__thumbsWrapFrame',
    viewport: 'photor__viewport',
    layer: 'photor__viewportLayer',
    slide: 'photor__viewportLayerSlide',
    slideImg: 'photor__viewportLayerSlideImg',

    // Settings
    delay: 300,
    keyboard: true,

    mod: {
        // States
        loading: '_loading',
        current: '_current',
        dragging: '_dragging',
        disabled: '_disabled',

        // Algorithm
        auto: '_auto',
        center: '_center',

        // Orientation
        portrait: '_portrait',
        landscape: '_landscape',

        // Thumbs
        draggable: '_draggable'
    }
};

var assert = chai.assert;

mocha.ui('bdd');
mocha.reporter('html');

window.onload = function() {
    // Запуск автоматического тестирования всех подключенных файлов с тестами (одного или всех на проекте)
    if (window.mochaPhantomJS) {
        mochaPhantomJS.run();
    } else {
        mocha.run();
    }
};