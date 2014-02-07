var commonTests = [

    {
        title: 'Функция hasClass() отрабатывает корректно',
        fn: function() {

            // Установлен один класс
            $('body').append('<div id="element" class="class">');

            var elem = $('#element')[0],
                isFound = hasClass(elem, 'class');

            assert(isFound);
        }
    },

    {
        title: 'Проставился data-атрибут',
        fn: function() {
            var attr = $('.photor').attr('data-photor-id');

            assert(attr);
        }
    },

    {
        title: 'Клики по контралам отрабатывают правильно', // Если эти контролы есть
        fn: function() {
            /* Сценарий:
                1) клик вправо
                2) клик влево
                3) клик вправо 3 раза
                4) клик вправо N-3 раз
                5) клик влево N раз
                6) клик вправо N+1 раз
                7) клик вправо ещё 1 раз*/

            assert(true);
        }
    },

    {
        title: 'Клики по превьюшкам отратабыват правильно',
        fn: function() {
            /* Сценарий:
                1) клик по первой
                2) ещё раз клик по первой
                3) клик по второй
                4) клик по последней
                5) ещё раз клик по последней
                6) два клика по второй*/

            assert(true);
        }
    },

    {
        title: 'Свайпы работают как надо',
        fn: function() {
            assert(true);
        }
    }
];